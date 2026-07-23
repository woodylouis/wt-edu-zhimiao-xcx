'use strict'

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function cleanText(value, maxLength = 300) {
	return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

function parsePlainDate(value) {
	const text = cleanText(value, 10)
	if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
		throw new Error('开始日期格式应为 YYYY-MM-DD')
	}
	const date = new Date(`${text}T00:00:00.000Z`)
	if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
		throw new Error('开始日期无效')
	}
	return date
}

function formatPlainDate(date) {
	return date.toISOString().slice(0, 10)
}

function addDays(dateText, days) {
	const date = parsePlainDate(dateText)
	date.setUTCDate(date.getUTCDate() + Number(days || 0))
	return formatPlainDate(date)
}

function getWeekdayName(dateText) {
	return WEEKDAY_NAMES[parsePlainDate(dateText).getUTCDay()]
}

function normalizeWeeksCount(value) {
	const count = Number(value)
	if (!Number.isSafeInteger(count) || count < 1) {
		throw new Error('计划周期须为不少于1周的整数')
	}
	return count
}

function normalizeDateRange(startDate, endDate) {
	const start = parsePlainDate(startDate)
	const end = parsePlainDate(endDate)
	const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
	if (totalDays <= 0) throw new Error('结束日期不能早于开始日期')
	if (totalDays % 7 !== 0) throw new Error('计划周期须按完整周设置，请选择7天的整数倍')
	const weeksCount = normalizeWeeksCount(totalDays / 7)
	return { startDate, endDate, totalDays, weeksCount }
}

function getSelectedOutcome(skill) {
	const selected = Array.isArray(skill.options)
		? skill.options.find(option => option && option.selected)
		: null
	return cleanText(skill.actualOutcome || selected?.name || selected?.text, 100)
}

function getExpectedOutcome(skill) {
	return cleanText(skill.expectedOutcome || skill.task_object || skill.taskObject, 160)
}

function rankInterventionSections(report, focusDomains = null) {
	const focusSet = Array.isArray(focusDomains)
		? new Set(focusDomains.map(item => cleanText(item, 80)).filter(Boolean))
		: null
	return (report.sectionSummaryList || []).map((section, sectionIndex) => {
		let actual = 0
		let expected = 0
		const skills = []
		const seen = new Set()
		for (const subsection of section.abllsSectionSummaryList || []) {
			actual += Number(subsection.actualTotalScore) || 0
			expected += Number(subsection.expectedTotalScore) || 0
			const source = Array.isArray(subsection.skillBelowStandard) && subsection.skillBelowStandard.length
				? subsection.skillBelowStandard
				: (subsection.questions || []).filter(skill => skill && skill.isStandard === false)
			for (const skill of source) {
				const name = cleanText(skill.taskName || skill.task_name || skill.content, 100)
				if (!name) continue
				const skillGroup = cleanText(subsection.sectioName || subsection.sectionName, 80)
				const key = `${skillGroup}|${name}`
				if (seen.has(key)) continue
				seen.add(key)
				skills.push({
					领域: cleanText(section.sectionName, 80) || '综合能力',
					技能组: skillGroup,
					技能: name,
					当前表现: getSelectedOutcome(skill) || '评估中未达到年龄期望',
					期望表现: getExpectedOutcome(skill) || '逐步达到该技能目标',
					已有建议: cleanText(skill.description, 180)
				})
			}
		}
		const relativeGap = expected > 0
			? Math.max(0, Math.min(1, (expected - actual) / expected))
			: 0
		return {
			sectionIndex,
			name: cleanText(section.sectionName, 80) || '综合能力',
			actual,
			expected,
			relativeGap,
			skills
		}
	}).filter(section => section.skills.length && (!focusSet || focusSet.has(section.name)))
		.sort((left, right) =>
			right.relativeGap - left.relativeGap ||
			right.skills.length - left.skills.length ||
			left.sectionIndex - right.sectionIndex
		)
}

function normalizeFocusDomains(report, requestedFocusDomains = null) {
	const available = rankInterventionSections(report).map(section => section.name)
	if (!available.length) return []
	if (requestedFocusDomains === null || requestedFocusDomains === undefined) return available
	if (!Array.isArray(requestedFocusDomains)) throw new Error('干预方向格式不正确，请重新选择')

	const requested = [...new Set(requestedFocusDomains.map(item => cleanText(item, 80)).filter(Boolean))]
	if (!requested.length) throw new Error('请至少选择一个干预方向')
	const unknown = requested.filter(item => !available.includes(item))
	if (unknown.length) throw new Error('部分干预方向不存在或评估结果已更新，请重新选择')
	return available.filter(item => requested.includes(item))
}

function collectPrioritySkills(report, limit = 24, focusDomains = null) {
	const sections = rankInterventionSections(report, focusDomains)
	const result = []
	for (let skillIndex = 0; result.length < limit; skillIndex++) {
		let added = false
		for (const section of sections) {
			const skill = section.skills[skillIndex]
			if (!skill) continue
			result.push(skill)
			added = true
			if (result.length >= limit) break
		}
		if (!added) break
	}
	return result
}

function collectSectionOverview(report, focusDomains = null) {
	const focusSet = Array.isArray(focusDomains) ? new Set(focusDomains) : null
	return (report.sectionSummaryList || []).filter(section =>
		!focusSet || focusSet.has(cleanText(section.sectionName, 80) || '综合能力')
	).map(section => {
		let actual = 0
		let expected = 0
		for (const item of section.abllsSectionSummaryList || []) {
			actual += Number(item.actualTotalScore) || 0
			expected += Number(item.expectedTotalScore) || 0
		}
		return {
			领域: cleanText(section.sectionName, 80),
			得分: `${actual}/${expected}`,
			模块分析: cleanText(section.analysis, 240)
		}
	}).slice(0, 12)
}

function buildInterventionDirectionSummary(report, focusDomains = null) {
	const prioritySections = rankInterventionSections(report, focusDomains)
	const domains = prioritySections.map(section => section.name)
	const totalSkills = prioritySections.reduce((total, section) => total + section.skills.length, 0)
	const skills = []
	for (let skillIndex = 0; skills.length < 12; skillIndex++) {
		let added = false
		for (const section of prioritySections) {
			const skill = cleanText(section.skills[skillIndex]?.技能, 100)
			if (!skill || skills.includes(skill)) continue
			skills.push(skill)
			added = true
			if (skills.length >= 12) break
		}
		if (!added) break
	}
	if (skills.length) {
		const skillText = totalSkills <= skills.length
			? `涉及${skills.join('、')}，共${totalSkills}项待支持技能`
			: `共识别${totalSkills}项待支持技能，包括${skills.join('、')}等`
		return `本次选择${domains.length}个干预领域：${domains.join('、')}；${skillText}。相对期望差距仅用于安排训练先后和比重，不会排除已选择的领域。`
	}
	const assessmentTitle = cleanText(report.assessmentTitle, 60) || '当前成长评估'
	return `本次计划将依据${assessmentTitle}的最新结果，优先选择报告中表现不稳定或尚未达到年龄期望的能力，从基础建立、情境应用到泛化维持逐周推进。`
}

function buildSystemPrompt() {
	return `你是一名资深儿童发展干预计划师，熟悉ABLLS-R、自然情境教学、任务分析、正向强化和技能泛化。你的任务是把评估结果转化为家庭与教师每天都能照着执行的短时训练计划。

必须遵守：
1. 计划须个体化、具体、可观察、可记录，不能只写“加强训练”“多练习”等空泛建议。
2. 每天安排1个核心活动，控制在10—30分钟，材料应是家庭或教室常见物品。
3. 难度逐周递进；先建立基础，再增加情境变化，最后进行泛化和维持。
4. 每周7天都要有安排，其中至少1天为低强度复习、亲子游戏或自然情境泛化，不安排机械重复。
5. 用正向、尊重儿童的语言；不得作医学诊断、承诺疗效或建议惩罚、强迫、剥夺基本需要。
6. 只输出合法JSON，不要Markdown、代码围栏、解释或额外文本。
7. 用户所选的每个干预领域都必须纳入计划范围；相对期望差距只用于安排先后和训练比重，不得排除已选领域。周期较短时可设计跨领域综合活动，并把暂时无法深入训练的技能列入后续递进方向。`
}

function buildUserPrompt(report, { startDate, endDate, weeksCount, focusDomains = null }) {
	const childName = cleanText(report.childName, 40) || '该儿童'
	const age = cleanText(report.childAge || report.ageInt, 20) || '未知'
	const normalizedFocusDomains = normalizeFocusDomains(report, focusDomains)
	const context = {
		儿童: childName,
		年龄: String(age).includes('岁') ? age : `${age}岁`,
		量表: cleanText(report.assessmentTitle, 100) || 'ABLLS-R',
		报告总结: cleanText(report.reportSummary, 800),
		用户选择的干预领域: normalizedFocusDomains,
		干预方向摘要: buildInterventionDirectionSummary(report, normalizedFocusDomains),
		领域概览: collectSectionOverview(report, normalizedFocusDomains),
		优先关注技能: collectPrioritySkills(report, Math.max(24, normalizedFocusDomains.length), normalizedFocusDomains)
	}

	return `请根据以下评估资料，为儿童制定${startDate}至${endDate}、连续${weeksCount}个完整周的训练计划。开始日期和结束日期当天都包含在计划内。

评估资料：
${JSON.stringify(context, null, 2)}

输出必须严格符合以下JSON结构：
{
  "title": "计划名称，包含儿童称呼但不要使用病理化标签",
  "summary": "80—160字，说明训练主线、安排逻辑和家庭执行原则",
  "caregiverGuidance": ["3—5条照护者执行提醒"],
  "weeklyPlans": [
    {
      "weekNumber": 1,
      "goal": "本周1个明确、可观察的核心目标",
      "focusSkills": ["2—4个重点技能"],
      "weeklySuccessCriteria": ["2—3条可记录的周达成标准"],
      "dailyPlans": [
        {
          "dayNumber": 1,
          "activityType": "训练/复习/泛化/亲子游戏四选一",
          "title": "当天活动名称",
          "target": "当天要练出的具体行为",
          "durationMinutes": 20,
          "materials": ["1—4种常见材料"],
          "steps": ["2—5个按顺序、可直接执行的步骤"],
          "successCriteria": "当天可观察、可计数的完成标准",
          "caregiverTip": "一句提示方法、强化方法或遇到困难时的降阶方式"
        }
      ]
    }
	  ]
	}

硬性数量要求：weeklyPlans必须恰好有${weeksCount}项，weekNumber从1连续编号；每一周dailyPlans必须恰好有7项，dayNumber从1到7连续编号。每天内容要有变化并与本周目标直接相关。不要输出日期字段，系统会依据开始日期自动计算。`
}

function getPromptContext(report, focusDomains = null) {
	const childName = cleanText(report.childName, 40) || '该儿童'
	const age = cleanText(report.childAge || report.ageInt, 20) || '未知'
	const normalizedFocusDomains = normalizeFocusDomains(report, focusDomains)
	return {
		儿童: childName,
		年龄: String(age).includes('岁') ? age : `${age}岁`,
		量表: cleanText(report.assessmentTitle, 100) || 'ABLLS-R',
		报告总结: cleanText(report.reportSummary, 800),
		用户选择的干预领域: normalizedFocusDomains,
		干预方向摘要: buildInterventionDirectionSummary(report, normalizedFocusDomains),
		领域概览: collectSectionOverview(report, normalizedFocusDomains),
		优先关注技能: collectPrioritySkills(report, Math.max(24, normalizedFocusDomains.length), normalizedFocusDomains)
	}
}

function buildOverviewPrompt(report, { startDate, endDate, weeksCount, focusDomains = null }) {
	return `请先为${startDate}至${endDate}、连续${weeksCount}个完整周的儿童训练计划确定整体主线。

评估资料：
${JSON.stringify(getPromptContext(report, focusDomains), null, 2)}

只输出以下合法JSON，不要输出每周或每日安排：
{
  "title": "计划名称，包含儿童称呼但不要使用病理化标签",
  "summary": "80—160字，说明训练主线、递进逻辑和家庭执行原则",
  "caregiverGuidance": ["3—5条照护者执行提醒"]
}`
}

function buildWeekPrompt(report, {
	startDate,
	endDate,
	weeksCount,
	weekNumber,
	overview = {},
	previousWeek = null,
	focusDomains = null
}) {
	const weekStartDate = addDays(startDate, (weekNumber - 1) * 7)
	const weekEndDate = addDays(weekStartDate, 6)
	const progression = previousWeek
		? {
			上一周目标: cleanText(previousWeek.goal, 240),
			上一周重点技能: (previousWeek.focusSkills || []).map(item => cleanText(item, 100)).filter(Boolean)
		}
		: '这是第1周，请先建立基础技能和参与习惯'

	return `请生成整个${weeksCount}周训练计划中的第${weekNumber}周。此次只生成这一周，避免一次返回过多内容。

计划区间：${startDate}至${endDate}
本周区间：${weekStartDate}至${weekEndDate}
计划主线：${cleanText(overview.summary, 400)}

评估资料：
${JSON.stringify(getPromptContext(report, focusDomains), null, 2)}

递进衔接：
${JSON.stringify(progression, null, 2)}

只输出以下合法JSON，不要Markdown、代码围栏或额外文字：
{
  "weekNumber": ${weekNumber},
  "goal": "本周1个明确、可观察的核心目标",
  "focusSkills": ["2—4个重点技能"],
  "weeklySuccessCriteria": ["2—3条可记录的周达成标准"],
  "dailyPlans": [
    {
      "dayNumber": 1,
      "activityType": "训练/复习/泛化/亲子游戏四选一",
      "title": "当天活动名称",
      "target": "当天要练出的具体行为",
      "durationMinutes": 20,
      "materials": ["1—4种常见材料"],
      "steps": ["2—5个按顺序、可直接执行的步骤"],
      "successCriteria": "当天可观察、可计数的完成标准",
      "caregiverTip": "一句提示、强化或降阶方法"
    }
  ]
}

硬性要求：dailyPlans必须恰好有7项，dayNumber从1到7连续编号；每天内容要有变化，其中至少1天为低强度复习、亲子游戏或自然情境泛化。
为避免内容被截断，请保持具体但简洁：target、successCriteria、caregiverTip各不超过60个汉字；每个step不超过45个汉字；每项只写执行所需信息，不重复评估背景。`
}

function extractJsonObject(content) {
	const text = String(content || '').trim()
	const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
	const start = unfenced.indexOf('{')
	const end = unfenced.lastIndexOf('}')
	if (start < 0 || end <= start) throw new Error('DeepSeek未返回有效JSON对象')
	try {
		return JSON.parse(unfenced.slice(start, end + 1))
	} catch (error) {
		throw new Error(`DeepSeek返回的计划JSON解析失败: ${error.message}`)
	}
}

function stringArray(value, { min = 1, max = 5, itemLength = 180, field }) {
	const items = (Array.isArray(value) ? value : [])
		.map(item => cleanText(item, itemLength))
		.filter(Boolean)
		.slice(0, max)
	if (items.length < min) throw new Error(`计划字段${field}内容不足`)
	return items
}

function requiredText(value, field, maxLength = 300) {
	const text = cleanText(value, maxLength)
	if (!text) throw new Error(`计划字段${field}不能为空`)
	return text
}

function normalizePlanOverview(rawOverview) {
	return {
		title: requiredText(rawOverview?.title, '计划名称', 100),
		summary: requiredText(rawOverview?.summary, '计划说明', 400),
		caregiverGuidance: stringArray(rawOverview?.caregiverGuidance, { min: 2, max: 5, field: '照护者提醒' })
	}
}

function normalizeGeneratedWeek(rawWeek, { weekNumber, startDate }) {
	const number = normalizeWeeksCount(weekNumber)
	const rawDays = Array.isArray(rawWeek?.dailyPlans) ? rawWeek.dailyPlans : []
	if (rawDays.length !== 7) throw new Error(`第${number}周应包含7天计划，实际返回${rawDays.length}天`)
	const weekStartDate = addDays(startDate, (number - 1) * 7)
	return {
		weekNumber: number,
		startDate: weekStartDate,
		endDate: addDays(weekStartDate, 6),
		goal: requiredText(rawWeek?.goal, `第${number}周目标`, 240),
		focusSkills: stringArray(rawWeek?.focusSkills, { min: 1, max: 4, field: `第${number}周重点技能` }),
		weeklySuccessCriteria: stringArray(rawWeek?.weeklySuccessCriteria, { min: 1, max: 3, field: `第${number}周达成标准` }),
		dailyPlans: rawDays.map((rawDay, dayIndex) => {
			const date = addDays(weekStartDate, dayIndex)
			return {
				dayNumber: dayIndex + 1,
				weekday: getWeekdayName(date),
				date,
				activityType: requiredText(rawDay.activityType, `第${number}周第${dayIndex + 1}天活动类型`, 20),
				title: requiredText(rawDay.title, `第${number}周第${dayIndex + 1}天活动名称`, 80),
				target: requiredText(rawDay.target, `第${number}周第${dayIndex + 1}天目标`, 180),
				durationMinutes: Math.min(40, Math.max(5, Number(rawDay.durationMinutes) || 15)),
				materials: stringArray(rawDay.materials, { min: 1, max: 4, itemLength: 60, field: `第${number}周第${dayIndex + 1}天材料` }),
				steps: stringArray(rawDay.steps, { min: 2, max: 5, itemLength: 180, field: `第${number}周第${dayIndex + 1}天步骤` }),
				successCriteria: requiredText(rawDay.successCriteria, `第${number}周第${dayIndex + 1}天完成标准`, 180),
				caregiverTip: requiredText(rawDay.caregiverTip, `第${number}周第${dayIndex + 1}天提示`, 180)
			}
		})
	}
}

function assemblePlanFromParts({ overview, weeklyPlans }, options) {
	const normalizedOverview = normalizePlanOverview(overview)
	return normalizePlan({
		...normalizedOverview,
		weeklyPlans: (weeklyPlans || []).map(week => ({
			goal: week.goal,
			focusSkills: week.focusSkills,
			weeklySuccessCriteria: week.weeklySuccessCriteria,
			dailyPlans: week.dailyPlans
		}))
	}, options)
}

function normalizePlan(rawPlan, { startDate, endDate = '', weeksCount, childName = '', generatedAt = Date.now(), generatedBy = '', model = '', sourceAnalysisRevision = 1, focusDomains = [] }) {
	const count = normalizeWeeksCount(weeksCount)
	const normalizedEndDate = endDate || addDays(startDate, count * 7 - 1)
	const range = normalizeDateRange(startDate, normalizedEndDate)
	if (range.weeksCount !== count) throw new Error('计划日期范围与周数不一致')
	const rawWeeks = Array.isArray(rawPlan?.weeklyPlans) ? rawPlan.weeklyPlans : []
	if (rawWeeks.length !== count) throw new Error(`DeepSeek应返回${count}周计划，实际返回${rawWeeks.length}周`)

	const weeklyPlans = rawWeeks.map((rawWeek, weekIndex) => {
		const rawDays = Array.isArray(rawWeek?.dailyPlans) ? rawWeek.dailyPlans : []
		if (rawDays.length !== 7) throw new Error(`第${weekIndex + 1}周应包含7天计划，实际返回${rawDays.length}天`)
		const weekStartDate = addDays(startDate, weekIndex * 7)
		return {
			weekNumber: weekIndex + 1,
			startDate: weekStartDate,
			endDate: addDays(weekStartDate, 6),
			goal: requiredText(rawWeek.goal, `第${weekIndex + 1}周目标`, 240),
			focusSkills: stringArray(rawWeek.focusSkills, { min: 1, max: 4, field: `第${weekIndex + 1}周重点技能` }),
			weeklySuccessCriteria: stringArray(rawWeek.weeklySuccessCriteria, { min: 1, max: 3, field: `第${weekIndex + 1}周达成标准` }),
			dailyPlans: rawDays.map((rawDay, dayIndex) => {
				const date = addDays(weekStartDate, dayIndex)
				return {
				dayNumber: dayIndex + 1,
				weekday: getWeekdayName(date),
				date,
				activityType: requiredText(rawDay.activityType, `第${weekIndex + 1}周第${dayIndex + 1}天活动类型`, 20),
				title: requiredText(rawDay.title, `第${weekIndex + 1}周第${dayIndex + 1}天活动名称`, 80),
				target: requiredText(rawDay.target, `第${weekIndex + 1}周第${dayIndex + 1}天目标`, 180),
				durationMinutes: Math.min(40, Math.max(5, Number(rawDay.durationMinutes) || 15)),
				materials: stringArray(rawDay.materials, { min: 1, max: 4, itemLength: 60, field: `第${weekIndex + 1}周第${dayIndex + 1}天材料` }),
				steps: stringArray(rawDay.steps, { min: 2, max: 5, itemLength: 180, field: `第${weekIndex + 1}周第${dayIndex + 1}天步骤` }),
				successCriteria: requiredText(rawDay.successCriteria, `第${weekIndex + 1}周第${dayIndex + 1}天完成标准`, 180),
				caregiverTip: requiredText(rawDay.caregiverTip, `第${weekIndex + 1}周第${dayIndex + 1}天提示`, 180)
			} })
		}
	})

	return {
		version: '1.0',
		title: requiredText(rawPlan.title, '计划名称', 100),
		childName: cleanText(childName, 40),
		startDate,
		endDate: normalizedEndDate,
		weeksCount: count,
		focusDomains: [...new Set((Array.isArray(focusDomains) ? focusDomains : []).map(item => cleanText(item, 80)).filter(Boolean))],
		summary: requiredText(rawPlan.summary, '计划说明', 400),
		caregiverGuidance: stringArray(rawPlan.caregiverGuidance, { min: 2, max: 5, field: '照护者提醒' }),
		weeklyPlans,
		generatedAt,
		generatedBy: cleanText(generatedBy, 80),
		sourceAnalysisRevision: Math.max(1, Number(sourceAnalysisRevision) || 1),
		provider: 'deepseek-official',
		model: cleanText(model, 80)
	}
}

function applyManualPlanAdjustments(plan, {
	manualActivities = [],
	excludedDailyPlanKeys = [],
	adjustedAt = Date.now(),
	adjustedBy = ''
} = {}) {
	if (!plan || !Array.isArray(plan.weeklyPlans) || !plan.weeklyPlans.length) {
		throw new Error('训练计划不存在，无法进行手动调整')
	}
	const weeksCount = normalizeWeeksCount(plan.weeksCount || plan.weeklyPlans.length)
	const maximumActivities = weeksCount * 7 * 3
	if (!Array.isArray(manualActivities) || manualActivities.length > maximumActivities) {
		throw new Error(`老师新增训练活动不能超过${maximumActivities}项`)
	}
	if (!Array.isArray(excludedDailyPlanKeys)) throw new Error('移出计划的训练日期格式不正确')

	const validDayKeys = new Set()
	for (let weekNumber = 1; weekNumber <= weeksCount; weekNumber++) {
		for (let dayNumber = 1; dayNumber <= 7; dayNumber++) {
			validDayKeys.add(`${weekNumber}-${dayNumber}`)
		}
	}
	const normalizedExcludedKeys = [...new Set(excludedDailyPlanKeys.map(item => cleanText(item, 20)).filter(Boolean))]
	if (normalizedExcludedKeys.some(key => !validDayKeys.has(key))) {
		throw new Error('部分移出计划的训练日期已失效，请刷新后重试')
	}

	const previousActivities = new Map(
		(Array.isArray(plan.manualActivities) ? plan.manualActivities : [])
			.map(item => [cleanText(item?.id, 80), item])
			.filter(([id]) => id)
	)
	const normalizedActivities = manualActivities.map((rawActivity, index) => {
		const weekNumber = Number(rawActivity?.weekNumber)
		const dayNumber = Number(rawActivity?.dayNumber)
		const dayKey = `${weekNumber}-${dayNumber}`
		if (!Number.isSafeInteger(weekNumber) || !Number.isSafeInteger(dayNumber) || !validDayKeys.has(dayKey)) {
			throw new Error(`第${index + 1}项老师新增活动的周次或日期无效`)
		}
		const rawId = cleanText(rawActivity?.id, 80)
		const id = rawId || `manual_${weekNumber}_${dayNumber}_${Number(adjustedAt) || Date.now()}_${index + 1}`
		const previous = previousActivities.get(id)
		const materials = (Array.isArray(rawActivity?.materials) ? rawActivity.materials : [])
			.map(item => cleanText(item, 60))
			.filter(Boolean)
			.slice(0, 4)
		return {
			id,
			weekNumber,
			dayNumber,
			date: addDays(plan.startDate, (weekNumber - 1) * 7 + dayNumber - 1),
			title: requiredText(rawActivity?.title, `第${index + 1}项老师新增活动名称`, 80),
			target: requiredText(rawActivity?.target, `第${index + 1}项老师新增活动目标`, 180),
			durationMinutes: Math.min(40, Math.max(5, Number(rawActivity?.durationMinutes) || 15)),
			materials,
			notes: cleanText(rawActivity?.notes, 240),
			createdAt: Number(previous?.createdAt) || Number(adjustedAt) || Date.now(),
			createdBy: cleanText(previous?.createdBy || adjustedBy, 80)
		}
	})

	return {
		...plan,
		manualActivities: normalizedActivities,
		excludedDailyPlanKeys: normalizedExcludedKeys,
		manualRevision: Math.max(0, Number(plan.manualRevision) || 0) + 1,
		manuallyAdjustedAt: Number(adjustedAt) || Date.now(),
		manuallyAdjustedBy: cleanText(adjustedBy, 80)
	}
}

module.exports = {
	WEEKDAY_NAMES,
	addDays,
	applyManualPlanAdjustments,
	assemblePlanFromParts,
	buildOverviewPrompt,
	buildSystemPrompt,
	buildUserPrompt,
	buildWeekPrompt,
	buildInterventionDirectionSummary,
	collectPrioritySkills,
	rankInterventionSections,
	extractJsonObject,
	getWeekdayName,
	normalizeDateRange,
	normalizeGeneratedWeek,
	normalizeFocusDomains,
	normalizePlan,
	normalizePlanOverview,
	normalizeWeeksCount,
	parsePlainDate
}
