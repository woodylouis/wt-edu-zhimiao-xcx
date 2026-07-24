'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')
const {
	addDays,
	applyManualPlanAdjustments,
	assemblePlanFromParts,
	buildInterventionDirectionSummary,
	buildOverviewPrompt,
	buildUserPrompt,
	buildWeekPrompt,
	extractJsonObject,
	getWeekdayName,
	normalizeDateRange,
	normalizeFocusDomains,
	normalizeGeneratedWeek,
	normalizePlan,
	normalizePlanOverview,
	normalizeWeeksCount,
	parsePlainDate,
	rankInterventionSections
} = require('../uniCloud-aliyun/cloudfunctions/common/intervention-plan-service/lib/intervention-plan')
const {
	buildInitialReportData
} = require('../uniCloud-aliyun/cloudfunctions/wt-task-save-pending-report/lib/report-analysis-version')

function createRawPlan(weeksCount = 4) {
	return {
		title: '小苗的四周成长训练计划',
		summary: '计划从理解简单指令开始，通过游戏、生活情境和重复练习逐步提升孩子的参与、表达与泛化能力。',
		caregiverGuidance: ['每天在孩子状态稳定时进行', '完成后立即给予具体表扬', '出现困难时减少步骤并提供示范'],
		weeklyPlans: Array.from({ length: weeksCount }, (_, weekIndex) => ({
			weekNumber: weekIndex + 1,
			goal: `第${weekIndex + 1}周能在自然情境中完成目标动作`,
			focusSkills: ['理解指令', '共同注意'],
			weeklySuccessCriteria: ['连续三天完成率达到80%'],
			dailyPlans: Array.from({ length: 7 }, (_, dayIndex) => ({
				dayNumber: dayIndex + 1,
				activityType: dayIndex === 6 ? '泛化' : '训练',
				title: `活动${dayIndex + 1}`,
				target: '在一次口头提示后完成指定动作',
				durationMinutes: 15,
				materials: ['积木', '收纳盒'],
				steps: ['成人先示范一次', '发出指令并等待5秒', '完成后立即具体表扬'],
				successCriteria: '5次机会中独立完成4次',
				caregiverTip: '若连续两次失败，先缩短距离并增加手势提示。'
			}))
		}))
	}
}

test('validates supported dates and plan lengths', () => {
	assert.equal(parsePlainDate('2026-07-22').toISOString(), '2026-07-22T00:00:00.000Z')
	assert.equal(normalizeWeeksCount('5'), 5)
	assert.equal(normalizeWeeksCount(12), 12)
	assert.deepEqual(normalizeDateRange('2026-07-22', '2026-09-01'), {
		startDate: '2026-07-22',
		endDate: '2026-09-01',
		totalDays: 42,
		weeksCount: 6
	})
	assert.throws(() => parsePlainDate('2026-02-30'), /无效/)
	assert.throws(() => normalizeWeeksCount(0), /不少于1周的整数/)
	assert.throws(() => normalizeWeeksCount(2.5), /不少于1周的整数/)
	assert.throws(() => normalizeDateRange('2026-07-22', '2026-07-31'), /7天的整数倍/)
	assert.throws(() => normalizeDateRange('2026-07-22', '2026-07-21'), /不能早于/)
})

test('calculates calendar dates and real weekdays without relying on AI output', () => {
	assert.equal(addDays('2026-07-22', 27), '2026-08-18')
	assert.equal(getWeekdayName('2026-07-22'), '周三')

	const plan = normalizePlan(createRawPlan(4), {
		startDate: '2026-07-22',
		weeksCount: 4,
		childName: '小苗',
		generatedAt: 123,
		generatedBy: 'teacher-a',
		model: 'deepseek-v4-pro',
		sourceAnalysisRevision: 3,
		focusDomains: ['语言与沟通', '社会交往']
	})
	assert.equal(plan.endDate, '2026-08-18')
	assert.equal(plan.sourceAnalysisRevision, 3)
	assert.deepEqual(plan.focusDomains, ['语言与沟通', '社会交往'])
	assert.equal(plan.weeklyPlans[0].dailyPlans[0].weekday, '周三')
	assert.equal(plan.weeklyPlans[3].dailyPlans[6].date, '2026-08-18')
})

test('rejects incomplete daily schedules instead of saving a vague plan', () => {
	const raw = createRawPlan(4)
	raw.weeklyPlans[1].dailyPlans.pop()
	assert.throws(
		() => normalizePlan(raw, { startDate: '2026-07-22', weeksCount: 4 }),
		/第2周应包含7天计划/
	)
})

test('applies recoverable teacher adjustments without changing the seven-day plan structure', () => {
	const plan = normalizePlan(createRawPlan(2), {
		startDate: '2026-07-22',
		weeksCount: 2,
		childName: '小苗',
		generatedAt: 123,
		generatedBy: 'teacher-a',
		model: 'deepseek-v4-pro',
		sourceAnalysisRevision: 3
	})
	const adjusted = applyManualPlanAdjustments(plan, {
		manualActivities: [{
			id: 'teacher-activity-1',
			weekNumber: 2,
			dayNumber: 3,
			title: '餐桌分类游戏',
			target: '独立将餐具按种类放入对应位置',
			durationMinutes: 20,
			materials: ['勺子', '筷子', '收纳盒'],
			notes: '先示范一次，再逐步撤除手势提示'
		}],
		excludedDailyPlanKeys: ['1-2', '1-2'],
		adjustedAt: 1000,
		adjustedBy: 'teacher-b'
	})

	assert.equal(adjusted.weeklyPlans[0].dailyPlans.length, 7)
	assert.equal(adjusted.manualActivities[0].date, '2026-07-31')
	assert.equal(adjusted.manualActivities[0].createdAt, 1000)
	assert.equal(adjusted.manualActivities[0].createdBy, 'teacher-b')
	assert.deepEqual(adjusted.excludedDailyPlanKeys, ['1-2'])
	assert.equal(adjusted.manualRevision, 1)

	const readjusted = applyManualPlanAdjustments(adjusted, {
		manualActivities: [{
			...adjusted.manualActivities[0],
			title: '更新后的餐桌分类游戏'
		}],
		excludedDailyPlanKeys: [],
		adjustedAt: 2000,
		adjustedBy: 'teacher-c'
	})
	assert.equal(readjusted.manualActivities[0].createdAt, 1000)
	assert.equal(readjusted.manualActivities[0].createdBy, 'teacher-b')
	assert.equal(readjusted.manualRevision, 2)
	assert.throws(
		() => applyManualPlanAdjustments(plan, {
			manualActivities: [{ weekNumber: 3, dayNumber: 1, title: '无效活动', target: '越界周次' }]
		}),
		/周次或日期无效/
	)
	assert.throws(
		() => applyManualPlanAdjustments(plan, { excludedDailyPlanKeys: ['3-1'] }),
		/训练日期已失效/
	)
})

test('extracts JSON from a fenced AI model response', () => {
	assert.deepEqual(extractJsonObject('```json\n{"ok":true}\n```'), { ok: true })
})

test('prompt contains report evidence and strict schedule counts', () => {
	const prompt = buildUserPrompt({
		childName: '小苗',
		childAge: 4,
		reportSummary: '语言理解需要优先支持',
		sectionSummaryList: [{
			sectionName: '语言与沟通',
			analysis: '简单指令表现不稳定',
			abllsSectionSummaryList: [{
				sectioName: '接受性语言',
				actualTotalScore: 3,
				expectedTotalScore: 8,
				questions: [{ isStandard: false, task_name: '听从一步指令', task_object: '独立完成' }]
			}]
		}]
	}, { startDate: '2026-07-22', endDate: '2026-08-25', weeksCount: 5 })

	assert.match(prompt, /听从一步指令/)
	assert.match(prompt, /weeklyPlans必须恰好有5项/)
	assert.match(prompt, /dailyPlans必须恰好有7项/)
})

test('summarizes intervention direction from below-standard skills', () => {
	const report = {
		assessmentTitle: 'ABLLS-R',
		sectionSummaryList: [{
			sectionName: '语言与沟通',
			abllsSectionSummaryList: [{
				sectioName: '接受性语言',
				skillBelowStandard: [
					{ task_name: '听从一步指令' },
					{ task_name: '辨认常见物品' }
				]
			}]
		}]
	}
	const summary = buildInterventionDirectionSummary(report)
	assert.match(summary, /语言与沟通/)
	assert.match(summary, /听从一步指令/)
	assert.match(buildOverviewPrompt(report, {
		startDate: '2026-07-23',
		endDate: '2026-08-19',
		weeksCount: 4
	}), /干预方向摘要/)
})

test('ranks multiple intervention domains by relative score gap instead of report order', () => {
	const makeSection = (sectionName, actual, expected, skills) => ({
		sectionName,
		abllsSectionSummaryList: [{
			sectioName: `${sectionName}技能`,
			actualTotalScore: actual,
			expectedTotalScore: expected,
			skillBelowStandard: skills.map(task_name => ({ task_name }))
		}]
	})
	const report = {
		assessmentTitle: '综合成长评估',
		sectionSummaryList: [
			makeSection('数学', 4, 10, ['点数物品', '按数取物', '数量比较']),
			makeSection('语言与沟通', 1, 10, ['听从一步指令']),
			makeSection('社会交往', 2, 10, ['回应同伴']),
			makeSection('精细动作', 9, 10, ['双手配合'])
		]
	}

	assert.deepEqual(
		rankInterventionSections(report).slice(0, 3).map(section => section.name),
		['语言与沟通', '社会交往', '数学']
	)
	const summary = buildInterventionDirectionSummary(report)
	assert.match(summary, /语言与沟通、社会交往、数学/)
	assert.match(summary, /听从一步指令/)
	assert.match(summary, /回应同伴/)
	assert.match(summary, /点数物品/)
	assert.match(summary, /精细动作/)
	assert.match(summary, /本次选择4个干预领域/)

	assert.deepEqual(
		normalizeFocusDomains(report, ['精细动作', '语言与沟通']),
		['语言与沟通', '精细动作']
	)
	const selectedPrompt = buildOverviewPrompt(report, {
		startDate: '2026-07-23',
		endDate: '2026-08-19',
		weeksCount: 4,
		focusDomains: ['语言与沟通', '精细动作']
	})
	assert.match(selectedPrompt, /用户选择的干预领域/)
	assert.match(selectedPrompt, /语言与沟通/)
	assert.match(selectedPrompt, /精细动作/)
	assert.doesNotMatch(selectedPrompt, /点数物品/)
	assert.doesNotMatch(selectedPrompt, /回应同伴/)
	assert.throws(() => normalizeFocusDomains(report, []), /至少选择一个/)
	assert.throws(() => normalizeFocusDomains(report, ['不存在的领域']), /不存在/)
})

test('split prompts and assembly generate one week per AI request', () => {
	const report = {
		childName: '小苗',
		childAge: 4,
		reportSummary: '语言理解需要优先支持',
		sectionSummaryList: []
	}
	const range = { startDate: '2026-07-22', endDate: '2026-08-18', weeksCount: 4 }
	assert.doesNotMatch(buildOverviewPrompt(report, range), /dailyPlans/)
	assert.match(buildWeekPrompt(report, { ...range, weekNumber: 2 }), /此次只生成这一周/)
	assert.match(buildWeekPrompt(report, { ...range, weekNumber: 2 }), /dailyPlans必须恰好有7项/)

	const overview = normalizePlanOverview(createRawPlan(1))
	const weeklyPlans = createRawPlan(4).weeklyPlans.map((week, index) =>
		normalizeGeneratedWeek(week, { weekNumber: index + 1, startDate: range.startDate })
	)
	const plan = assemblePlanFromParts({ overview, weeklyPlans }, {
		...range,
		childName: '小苗',
		generatedAt: 123,
		generatedBy: 'teacher-a',
		model: 'deepseek-v4-pro',
		sourceAnalysisRevision: 2
	})
	assert.equal(plan.weeklyPlans.length, 4)
	assert.equal(plan.weeklyPlans[1].startDate, '2026-07-29')
	assert.equal(plan.weeklyPlans[3].dailyPlans[6].date, '2026-08-18')
})

test('new reports begin with one immutable analysis revision', () => {
	assert.deepEqual(buildInitialReportData({ reportId: 'report-a' }), {
		reportId: 'report-a',
		analysisRevision: 1
	})
	assert.deepEqual(buildInitialReportData({ reportId: 'report-b', analysisRevision: 9 }), {
		reportId: 'report-b',
		analysisRevision: 1
	})
})
