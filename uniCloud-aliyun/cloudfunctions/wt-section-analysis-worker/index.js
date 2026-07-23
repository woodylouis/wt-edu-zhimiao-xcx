'use strict'
const db = uniCloud.database()
const taskCollection = db.collection('wtdb-section-analysis-tasks')
const reportTaskCollection = db.collection('wtdb-report-tasks')
const logCollection = db.collection('wtdb-debug-logs')
const aiModel = require('deepseek-client')
const taskAuth = require('report-task-auth')

const MAX_RETRY = 3 // 减少重试次数，避免云函数超时
const TIMEOUT_MS = 30000 // 减少AI调用超时时间到30秒
const MAX_EXECUTION_TIME = 4 * 60 * 1000 // 云函数最大执行时间4分钟

async function log(tag, data = null, { taskId = '', recordId = '', level = 'info' } = {}) {
	const now = Date.now()
	const formattedTime = new Date(now).toLocaleString('zh-CN', { hour12: false })
	try {
		await logCollection.add({ tag, data, taskId, recordId, level, timestamp: now, formattedTime })
	} catch (_) { }
}

function getSectionSystemPrompt() {
	return `你是一名专业的儿童行为分析师和特殊教育专家，专门分析ABLLS-R评估结果。

请提供简短且专业的分析，要求：
1. 分析简洁明了（100-200字）
2. 专业且易懂
3. 具体可操作
4. 考虑儿童年龄特点
5. 重点关注actualOutcome和expectedOutcome的差距

输出要求：
- 只输出纯文本内容
- 不使用任何Markdown格式（如**加粗**、## 标题、- 列表等）
- 不使用特殊符号和样式标记
- 用一段连贯的文字表达完整的分析结果`;
}

function buildSectionAnalysisPrompt(sectionData, childName, childAge) {
	const { sectionName, skillBelowStandard } = sectionData

	let prompt = `请对${childName}（${childAge}）在"${sectionName}"技能领域的未达标技能进行简短专业的分析：\n\n`
	prompt += `需要改进的技能：\n`
	skillBelowStandard.forEach((skill, index) => {
		prompt += `${index + 1}. ${skill.taskName}\n`
		prompt += `   当前表现：${skill.actualOutcome}\n`
		prompt += `   期望表现：${skill.expectedOutcome}\n\n`
	})
	prompt += `请提供一段简短且专业的分析（100-200字），包括：
1. 对这些未达标技能的整体评价
2. 主要问题和改进方向
3. 具体的训练建议

要求：
- 输出纯文本，不使用任何Markdown格式
- 不使用标题、加粗、列表等样式
- 内容简洁明了，适合${childAge}的发展特点
- 一段话完整表达分析结果`

	return prompt
}

function generateSectionFallbackAnalysis(sectionName, skills, childName) {
	if (!skills || skills.length === 0) {
		return `${childName}在${sectionName}领域表现良好，所有技能均已达标。建议继续保持现有训练强度，适当增加挑战性活动以促进进一步发展。`
	}
	const skillNames = skills.map(s => s.taskName).slice(0, 3).join('、')
	return `${childName}在${sectionName}领域有${skills.length}项技能需改进，重点关注${skillNames}等内容。建议结合兴趣点、使用结构化教学法和正向激励策略，逐步提升这些技能的表现水平。`
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

async function updateReportTaskProgress(taskId) {
	try {
		const [analysisRes, taskRes] = await Promise.all([
			taskCollection.where({ taskId }).field({ status: true }).get(),
			reportTaskCollection.where({ taskId }).field({ totalSections: true, logs: true }).limit(1).get()
		])

		const analysisList = analysisRes.data || []
		const doneCount = analysisList.filter(item => item.status === 'done').length
		const failedCount = analysisList.filter(item => item.status === 'failed').length
		const totalSections = Number(taskRes.data?.[0]?.totalSections) || analysisList.length || 0
		const progress = totalSections ? Math.min(90, Math.round((doneCount / totalSections) * 90)) : 0

		const updateData = {
			completedSections: doneCount,
			progress,
			updateTime: Date.now()
		}

		if (failedCount > 0) {
			updateData.failReason = `${failedCount} 个模块分析失败`
		}

		await reportTaskCollection.where({ taskId }).update(updateData)
	} catch (error) {
		await log('update-report-task-progress-failed', { error: error.message }, { taskId, level: 'warn' })
	}
}

async function generateSectionAnalysisWithRetry(sectionData, childName, childAge, taskId, docId, providerId = '') {
	let attempt = 0
	let lastError = null

	while (attempt < MAX_RETRY) {
		attempt++
		try {
			const prompt = buildSectionAnalysisPrompt(sectionData, childName, childAge)
			const modelInfo = await aiModel.getActiveModelInfo(providerId)
			await log('ai-attempt', {
				provider: modelInfo.provider,
				model: modelInfo.model,
				attempt,
				promptLength: prompt.length,
				sectionName: sectionData.sectionName
			}, { taskId })

			const completion = await aiModel.chatCompletion({
				provider: providerId,
				messages: [
					{ role: 'system', content: getSectionSystemPrompt() },
					{ role: 'user', content: prompt }
				],
				maxTokens: 400,
				timeout: TIMEOUT_MS
			})
			const reply = completion.content

			if (reply && reply.length > 30) {
				await log('ai-analysis-success', {
					provider: completion.provider,
					model: completion.model,
					replyLength: reply.length
				}, { taskId })
				return reply
			}

			throw new Error('AI 模型返回无效内容')
		} catch (err) {
			lastError = err
			await log('ai-failed', {
				providerId,
				error: err.message,
				attempt
			}, { taskId, level: 'error' })

			if (attempt < MAX_RETRY) {
				await new Promise(resolve => setTimeout(resolve, 1000))
			}
		}

		// 指数退避，但限制最大等待时间
		const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000)
		await new Promise(resolve => setTimeout(resolve, waitTime))
	}
	throw lastError
}

exports.main = async (event = {}) => {
	if (!event.taskId) {
		return { code: 400, message: '缺少参数: taskId' }
	}
	if (!await taskAuth.hasRunAccess(event.taskId, event.runToken)) {
		return { code: 403, message: '无权执行该报告任务' }
	}

	const startTime = Date.now()
	const taskWhere = { taskId: event.taskId, status: 'pending' }
	const tasks = await taskCollection.where(taskWhere).limit(1).get()
	console.log('Fetched tasks:', tasks)

	for (const task of tasks.data) {
		// 检查执行时间，避免云函数超时
		if (Date.now() - startTime > MAX_EXECUTION_TIME) {
			await log('execution-timeout-break', {}, { taskId: task.taskId })
			break
		}

		const {
			_id: docId,
			taskId,
			recordId,
			sectionId,
			sectionName,
			childName,
			ageInt,
			assessmentRecords,
			providerId = ''
		} = task
		await log('task-start', { taskId, sectionId }, { taskId })

		try {
			// 更新任务状态为处理中
			await taskCollection.doc(docId).update({
				status: 'processing',
				updateTime: Date.now()
			})

			await log('section-analysis-start', { sectionId, sectionName }, { taskId, recordId })

			// 提取未达标技能
			const skillBelowStandard = []
			for (const record of assessmentRecords) {
				for (const question of record.questions || []) {
					if (!question.isStandard) {
						skillBelowStandard.push(buildSkillItem(question, ageInt))
					}
				}
			}

			let analysis = ''
			if (skillBelowStandard.length === 0) {
				analysis = `${childName}在${sectionName}领域的所有技能都达标，表现优秀！建议继续保持并逐步提升。`
			} else {
				const sectionData = { sectionName, skillBelowStandard }
				console.log('generateSectionAnalysisWithRetry', sectionData, childName, ageInt, taskId, docId)

				try {
					analysis = await generateSectionAnalysisWithRetry(
						sectionData,
						childName,
						ageInt,
						taskId,
						docId,
						providerId
					)
					console.log("analysis", analysis)
				} catch (aiError) {
					console.error('AI分析失败:', aiError)
					throw aiError
				}
			}

			// 恢复数据库更新操作
			await taskCollection.doc(docId).update({
				status: 'done',
				analysis,
				updateTime: Date.now()
			})
			await updateReportTaskProgress(taskId)
			await log('section-analysis-success', { sectionId, analysis: analysis.substring(0, 100) + '...' }, { taskId, recordId })

		} catch (err) {
			console.error('任务处理失败:', err)

			// 确保失败的任务也要更新状态
			try {
				await taskCollection.doc(docId).update({
					status: 'failed',
					failReason: err.message,
					updateTime: Date.now()
				})
				await updateReportTaskProgress(taskId)
			} catch (updateError) {
				console.error('更新失败状态时出错:', updateError)
			}

			await log('section-analysis-failed', { error: err.message }, { taskId, recordId, level: 'error' })

			// 继续处理下一个任务，而不是中断整个流程
			continue
		}
	}

	const executionTime = Date.now() - startTime
	console.log('云函数执行完成，耗时:', executionTime + 'ms')
	await log('worker-completed', { executionTime, tasksProcessed: tasks.data.length }, {})
	return { code: 200, data: { processed: tasks.data.length, executionTime } }
}
