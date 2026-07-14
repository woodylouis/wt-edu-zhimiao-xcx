'use strict'
const db = uniCloud.database()
const dbTask = db.collection('wtdb-report-tasks')
const dbAnalysis = db.collection('wtdb-section-analysis-tasks')
const dbPending = db.collection('wtdb-report-save-pending')
const dbRecord = db.collection('wtdb-business-assess-record')
const dbUser = db.collection('uni-id-users')
const dbLog = db.collection('wtdb-debug-logs')
const deepseek = require('deepseek-client')

function compactId(value) {
	if (!value) return ''
	if (typeof value === 'string') return value
	if (value.$oid) return value.$oid
	if (value._id) return compactId(value._id)
	return String(value)
}

async function hasRunAccess(taskId, runToken) {
	if (!runToken) return false
	const res = await dbTask.where({ taskId }).field({ _id: true }).limit(1).get()
	return compactId(res.data?.[0]?._id) === compactId(runToken)
}

async function log(tag, data = null, { taskId = '', recordId = '', level = 'info' } = {}) {
	const now = Date.now()
	const formattedTime = new Date(now).toLocaleString('zh-CN', { hour12: false })
	try {
		await dbLog.add({ tag, data, taskId, recordId, level, timestamp: now, formattedTime })
	} catch (_) { }
}

function getSelectedOption(question) {
	return (question.options || []).find(opt => opt.selected) || null
}

function getExpectedOutcome(question, ageInt) {
	const ageStd = question.age_standards?.find(as => as.age === ageInt)
	const match = question.options?.find(opt => opt.score === ageStd?.expected_score)
	return match?.name || ''
}

function buildSkillItem(question, ageInt) {
	const selectedOption = getSelectedOption(question)
	return {
		...question,
		taskName: question.task_name || question.taskName || '未命名技能',
		taskObject: question.task_object || question.taskObject || '',
		taskContent: question.content || question.taskContent || '',
		actualOutcome: selectedOption?.name || '',
		actualScore: question.score || 0,
		expectedOutcome: getExpectedOutcome(question, ageInt),
		expectedScore: question.expected_score || question.expectedScore || 0,
		description: question.description || ''
	}
}

function buildAbllsSectionSummary(record, ageInt) {
	const questions = record.questions || []
	const skillBelowStandard = []
	const skillReachStandard = []

	questions.forEach(question => {
		const skill = buildSkillItem(question, ageInt)
		if (!question.isStandard) {
			skillBelowStandard.push(skill)
		} else {
			skillReachStandard.push(skill)
		}
	})

	return {
		...record,
		abllsSectionName: record.sectioName || record.sectionName || '',
		abllsSectionAlphabet: record.alphabet || record.abllsSectionAlphabet || '',
		sectioName: record.sectioName || record.sectionName || '',
		alphabet: record.alphabet || record.abllsSectionAlphabet || '',
		expectedTotalScore: record.expectedTotalScore || 0,
		actualTotalScore: record.actualTotalScore || 0,
		questions,
		skillBelowStandard,
		skillReachStandard
	}
}

function buildReportSummaryPrompt(reportData) {
	const totalSkills = reportData.reachCount + reportData.belowCount
	const completionRate = totalSkills ? Math.round((reportData.reachCount / totalSkills) * 100) : 0
	const belowSkills = reportData.skillBelowStandard.slice(0, 8)

	let prompt = `请对${reportData.childName}（${reportData.childAge || reportData.ageInt + '岁'}）的ABLLS-R整体评估结果进行专业总结。\n\n`
	prompt += `评估领域：${reportData.sections.join('、')}\n`
	prompt += `总技能项目：${totalSkills}项\n`
	prompt += `达标技能：${reportData.reachCount}项\n`
	prompt += `需改进技能：${reportData.belowCount}项\n`
	prompt += `整体达标率：${completionRate}%\n\n`

	if (belowSkills.length) {
		prompt += `重点需改进技能：\n`
		belowSkills.forEach((skill, index) => {
			prompt += `${index + 1}. ${skill.taskName}：当前${skill.actualOutcome || '未记录'}，期望${skill.expectedOutcome || '未记录'}\n`
		})
	}

	prompt += `\n请输出一段150-250字的纯文本总结，包括整体发展水平、主要优势、优先改进方向和训练建议。不要使用Markdown、标题或列表。`
	return prompt
}

function getReportSummarySystemPrompt() {
	return `你是一名资深儿童发展评估专家，专门进行ABLLS-R综合评估总结。输出应专业、具体、易懂，适合家长和教师阅读，并给出可执行的发展建议。`
}

async function generateReportSummary(reportData, taskId, recordId) {
	try {
		await log('report-summary-ai-start', {
			provider: 'deepseek-official',
			model: deepseek.DEFAULT_MODEL
		}, { taskId, recordId })

		const summary = await deepseek.chatText({
			messages: [
				{ role: 'system', content: getReportSummarySystemPrompt() },
				{ role: 'user', content: buildReportSummaryPrompt(reportData) }
			],
			maxTokens: 500,
			timeout: 45000
		})

		if (!summary || summary.length < 50) {
			throw new Error('DeepSeek 返回的报告总评过短')
		}

		await log('report-summary-ai-success', {
			provider: 'deepseek-official',
			model: deepseek.DEFAULT_MODEL,
			length: summary.length
		}, { taskId, recordId })
		return summary
	} catch (error) {
		await log('report-summary-ai-failed', { error: error.message }, { taskId, recordId, level: 'error' })
		throw error
	}
}

exports.main = async (event = {}) => {
	if (!event.taskId) {
		return { code: 400, message: '缺少参数: taskId' }
	}
	if (!await hasRunAccess(event.taskId, event.runToken)) {
		return { code: 403, message: '无权执行该报告任务' }
	}

	const taskWhere = { taskId: event.taskId, status: 'waiting_merge' }
	const tasks = await dbTask.where(taskWhere).limit(3).get()
	for (const task of tasks.data) {
		console.log('有待处理任务数量', task)
		const { taskId, originalParams = {}, assessmentId, metadata = {} } = task
		const recordId = originalParams.query?.recordId || ''
		const assessorId = originalParams.query?.assessorId || ''
		const reanalysis = metadata.reanalysis || {}
		try {
			await log('merge-start', {}, { taskId, recordId })

			const analysisRes = await dbAnalysis.where({ taskId }).get()
			console.log('有analysisRes')
			const analysisList = analysisRes.data
			console.log('有analysisList')
			if (!analysisList.length) {
				await dbTask.where({ taskId }).update({
					status: 'failed',
					failReason: '未找到分析任务',
					updateTime: Date.now()
				})
				await log('merge-failed-no-analysis', {}, { taskId, recordId })
				continue
			}

			const hasPending = analysisList.some(item => item.status === 'pending' || item.status === 'processing')
			const hasFailed = analysisList.some(item => item.status === 'failed')
			const doneCount = analysisList.filter(item => item.status === 'done').length
			await dbTask.where({ taskId }).update({
				completedSections: doneCount,
				progress: analysisList.length ? Math.min(90, Math.round((doneCount / analysisList.length) * 90)) : 0,
				updateTime: Date.now()
			})

			if (hasPending) {
				await log('merge-skip-pending', {}, { taskId, recordId })
				continue
			}
			if (hasFailed) {
				await dbTask.where({ taskId }).update({
					status: 'failed',
					failReason: '部分分析失败，无法合并',
					updateTime: Date.now()
				})
				await log('merge-failed-some-failed', {}, { taskId, recordId })
				continue
			}
			console.log('继续')

			const recordRes = await dbRecord.where({ recordId }).get()
			console.log('有recordRes')
			console.log('recordRes', recordRes)
			if (!recordRes.data.length) {
				throw new Error(`找不到评估记录: ${recordId}`)
			}
			const record = recordRes.data[0]
			console.log('recordt', record)
			const userRes = await dbUser.where({ _id: assessorId }).get()
			const assessorName = userRes.data?.[0]?.nickname || userRes.data?.[0]?.username || '用户未设置昵称'

			let reachCount = 0, belowCount = 0
			const allSkillBelowStandard = []
			console.log('构建sectionSummaryList')
			const sectionSummaryList = analysisList.map(item => {
				console.log('item:', item)
				const abllsSectionSummaryList = (item.assessmentRecords || []).map(recordItem => {
					const summary = buildAbllsSectionSummary(recordItem, item.ageInt || record.ageInt)
					reachCount += summary.skillReachStandard.length
					belowCount += summary.skillBelowStandard.length
					allSkillBelowStandard.push(...summary.skillBelowStandard)
					return summary
				})

				const section = {
					sectionName: item.sectionName,
					sectionId: item.sectionId,
					abllsSectionSummaryList,
					analysis: item.analysis
				}
				return section
			})
			console.log("sectionSummaryList", sectionSummaryList)
			const sectionNames = sectionSummaryList.map(s => s.sectionName)

			const reportSummary = await generateReportSummary({
				childName: record.childName,
				childAge: record.childAge,
				ageInt: record.ageInt,
				reachCount,
				belowCount,
				sections: sectionNames,
				skillBelowStandard: allSkillBelowStandard
			}, taskId, recordId)
			const completionTime = Date.now()
			const duration = completionTime - (task.createTime || completionTime)

			const reportData = {
				reportVersion: 'v2',
				reportId: reanalysis.targetReportId || `report_${recordId}_${Date.now()}`,
				recordId,
				assessmentId,
				assessorId,
				assessorName,
				classId: record.classId,
				className: record.className,
				childId: record.childId,
				childName: record.childName,
				avatar: record.avatar,
				childAge: record.childAge,
				ageInt: record.ageInt,
				assessmentTitle: record.assessmentTitle || 'ABLLS-R',
				sectionSummaryList,
				reportSummary,
				createTime: completionTime,
				updateTime: completionTime,
				completionTime,
				duration
			}

			await dbPending.add({
				taskId,
				recordId,
				reportData,
				createTime: Date.now(),
				status: 'pending'
			})

			await dbTask.where({ taskId }).update({
				status: 'pending_save',
				progress: 99,
				updateTime: Date.now()
			})
			await log('merge-success', {}, { taskId, recordId })

		} catch (err) {
			await dbTask.where({ taskId }).update({
				status: 'failed',
				failReason: err.message,
				updateTime: Date.now()
			})
			await log('merge-error', { error: err.message }, { taskId, recordId, level: 'error' })
		}
	}

	return { code: 200, data: { processed: tasks.data.length } }
}
