'use strict'
const db = uniCloud.database()
const taskCollection = db.collection('wtdb-section-analysis-tasks')
const logCollection = db.collection('wtdb-debug-logs')

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

async function generateSectionAnalysisWithRetry(sectionData, childName, childAge, taskId, docId) {
	let attempt = 0
	let lastError = null
	const models = [
		{
			name: 'deepseek',
			config: {
				provider: 'deepseek',
				model: 'deepseek-chat',
				tokensToGenerate: 300, // 减少token数量，加快响应
				apiKey: 'sk-e736907dad8a49ffa8e614916b32440f'
			}
		},
	]

	while (attempt < MAX_RETRY) {
		attempt++
		for (const model of models) {
			try {
				await log('ai-attempt', { model: model.name, attempt }, { taskId })

				const llm = uniCloud.ai.getLLMManager({ provider: model.config.provider, apiKey: model.config.apiKey })
				const prompt = buildSectionAnalysisPrompt(sectionData, childName, childAge)

				// 添加AI分析开始日志
				await log('ai-analysis-start', {
					model: model.name,
					promptLength: prompt.length,
					sectionName: sectionData.sectionName
				}, { taskId })

				const response = await Promise.race([
					llm.chatCompletion({
						model: model.config.model,
						messages: [
							{ role: 'system', content: getSectionSystemPrompt() },
							{ role: 'user', content: prompt }
						],
						tokensToGenerate: model.config.tokensToGenerate
					}),
					new Promise((_, reject) =>
						setTimeout(() => reject(new Error('AI请求超时')), TIMEOUT_MS)
					)
				])

				if (response && response.reply && response.reply.length > 30) {
					// 添加AI分析成功日志
					await log('ai-analysis-success', {
						model: model.name,
						replyLength: response.reply.length
					}, { taskId })
					return response.reply
				} else {
					throw new Error(`${model.name} 返回无效内容`)
				}
			} catch (err) {
				lastError = err
				await log('ai-failed', {
					model: model.name,
					error: err.message,
					attempt: attempt
				}, { taskId, level: 'error' })

				// 添加延时，避免频繁重试
				if (attempt < MAX_RETRY) {
					await new Promise(resolve => setTimeout(resolve, 1000))
				}
			}
		}

		// 指数退避，但限制最大等待时间
		const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000)
		await new Promise(resolve => setTimeout(resolve, waitTime))
	}
	throw lastError
}

exports.main = async () => {
	const startTime = Date.now()
	const tasks = await taskCollection.where({ status: 'pending' }).limit(2).get() // 减少并发处理数量
	console.log('Fetched tasks:', tasks)

	for (const task of tasks.data) {
		// 检查执行时间，避免云函数超时
		if (Date.now() - startTime > MAX_EXECUTION_TIME) {
			await log('execution-timeout-break', {}, { taskId: task.taskId })
			break
		}

		const { _id: docId, taskId, recordId, sectionId, sectionName, childName, ageInt, assessmentRecords } = task
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
						skillBelowStandard.push({
							taskName: question.task_name || '未命名技能',
							actualOutcome: question.options?.find(opt => opt.selected)?.name || '',
							expectedOutcome: (() => {
								const ageStd = question.age_standards?.find(as => as.age === ageInt)
								const match = question.options?.find(opt => opt.score === ageStd?.expected_score)
								return match?.name || ''
							})()
						})
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
					analysis = await generateSectionAnalysisWithRetry(sectionData, childName, ageInt, taskId, docId)
					console.log("analysis", analysis)
				} catch (aiError) {
					// AI分析失败时使用降级方案
					console.error('AI分析失败，使用降级方案:', aiError)
					analysis = generateSectionFallbackAnalysis(sectionName, skillBelowStandard, childName)
					await log('ai-fallback-used', { error: aiError.message }, { taskId, level: 'warn' })
				}
			}

			// 恢复数据库更新操作
			await taskCollection.doc(docId).update({
				status: 'done',
				analysis,
				updateTime: Date.now()
			})
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
}
