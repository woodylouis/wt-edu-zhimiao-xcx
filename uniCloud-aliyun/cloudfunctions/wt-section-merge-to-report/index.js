'use strict'
const db = uniCloud.database()
const dbTask = db.collection('wtdb-report-tasks')
const dbAnalysis = db.collection('wtdb-section-analysis-tasks')
const dbPending = db.collection('wtdb-report-save-pending')
const dbRecord = db.collection('wtdb-business-assess-record')
const dbLog = db.collection('wtdb-debug-logs')
const aiModel = require('deepseek-client')
const taskAuth = require('report-task-auth')

async function resolveAssessorNickname(userId, fallback = '') {
	if (userId) {
		const res = await db.collection('uni-id-users')
			.where({ _id: userId })
			.field({ nickname: true })
			.limit(1)
			.get()
		const nickname = String(res.data?.[0]?.nickname || '').trim()
		if (nickname) return nickname
	}
	return String(fallback || '').trim() || '未设置昵称'
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

async function generateReportSummary(reportData, taskId, recordId, providerId = '') {
	try {
		const modelInfo = await aiModel.getActiveModelInfo(providerId)
		await log('report-summary-ai-start', {
			provider: modelInfo.provider,
			model: modelInfo.model
		}, { taskId, recordId })

		const completion = await aiModel.chatCompletion({
			provider: providerId,
			messages: [
				{ role: 'system', content: getReportSummarySystemPrompt() },
				{ role: 'user', content: buildReportSummaryPrompt(reportData) }
			],
			maxTokens: 500,
			timeout: 45000
		})
		const summary = completion.content

		if (!summary || summary.length < 50) {
			throw new Error('AI 模型返回的报告总评过短')
		}

		await log('report-summary-ai-success', {
			provider: completion.provider,
			model: completion.model,
			length: summary.length
		}, { taskId, recordId })
		return {
			content: summary,
			aiModel: {
				providerId: completion.providerId,
				provider: completion.provider,
				model: completion.model,
				label: completion.providerLabel
			}
		}
	} catch (error) {
		await log('report-summary-ai-failed', { error: error.message }, { taskId, recordId, level: 'error' })
		throw error
	}
}

exports.main = async (event = {}) => {
	if (!event.taskId) {
		return { code: 400, message: '缺少参数: taskId' }
	}
	if (!await taskAuth.hasRunAccess(event.taskId, event.runToken)) {
		return { code: 403, message: '无权执行该报告任务' }
	}

	const taskWhere = { taskId: event.taskId, status: 'waiting_merge' }
	const tasks = await dbTask.where(taskWhere).limit(3).get()
	for (const task of tasks.data) {
		console.log('有待处理任务数量', task)
		const { taskId, originalParams = {}, assessmentId, metadata = {} } = task
		const recordId = originalParams.query?.recordId || ''
		const assessorId = originalParams.query?.assessorId || ''
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
			const assessorName = await resolveAssessorNickname(assessorId, originalParams.query?.assessorName)

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

			const reportSummaryResult = await generateReportSummary({
				childName: record.childName,
				childAge: record.childAge,
				ageInt: record.ageInt,
				reachCount,
				belowCount,
				sections: sectionNames,
				skillBelowStandard: allSkillBelowStandard
			}, taskId, recordId, metadata.providerId ||
				(metadata.provider === 'moonshot-official' || /^kimi-/i.test(metadata.model || '') ? 'kimi' : '') ||
				(metadata.provider === 'deepseek-official' || /^deepseek-/i.test(metadata.model || '') ? 'deepseek' : ''))
			const completionTime = Date.now()
			const duration = completionTime - (task.createTime || completionTime)

			const reportData = {
				reportVersion: 'v2',
				reportId: `report_${recordId}`,
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
				reportSummary: reportSummaryResult.content,
				aiModel: reportSummaryResult.aiModel,
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
