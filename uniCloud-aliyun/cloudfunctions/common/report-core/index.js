'use strict'

const db = uniCloud.database()
const dbName2 = 'wtdb-business-assess-record'
const dbName3 = 'wtdb-report-tasks'
const dbName4 = 'wtdb-business-assess-report'
const dbName5 = 'uni-id-users'
const dbNameLog = 'wtdb-debug-logs'

// ✅ 日志记录函数
async function log(tag, data = null, { taskId = '', recordId = '', level = 'info' } = {}) {
	const logCollection = db.collection(dbNameLog)
	const now = Date.now()
	const formattedTime = new Date(now).toLocaleString('zh-CN', { hour12: false })
	try {
		await logCollection.add({
			tag,
			data,
			taskId,
			recordId,
			level,
			timestamp: now,
			formattedTime
		})
	} catch (err) {
		// 不中断主流程
	}
}

async function generateReportAsync(taskId, completedSectionList, query) {
	const recordCollection = db.collection(dbName2)
	const taskCollection = db.collection(dbName3)
	const userCollection = db.collection(dbName5)

	await log('Start generateReportAsync', query, { taskId, recordId: query?.recordId })

	if (!query?.recordId) {
		await updateTaskStatus(taskId, 'failed', 100, '报告生成失败: 缺少 recordId')
		await log('Missing recordId', null, { taskId, level: 'error' })
		return
	}

	try {
		await updateTaskStatus(taskId, 'processing', 0, '开始生成报告')
		await log('开始生成报告', null, { taskId })

		let sectionSummaryList = []

		for (let i = 0; i < completedSectionList.length; i++) {
			const item = completedSectionList[i]
			const progress = Math.floor((i / completedSectionList.length) * 100)
			await updateTaskStatus(taskId, 'processing', progress, `处理 ${item.sectionName}`)

			const abllsSectionSummaryList = []
			let sectionSkillBelowStandard = []

			for (const record of item.assessmentRecords) {
				const abllsSectionSummary = {
					abllsSectionName: record.sectioName,
					abllsSectionAlphabet: record.alphabet,
					expectedTotalScore: record.expectedTotalScore,
					actualTotalScore: record.actualTotalScore,
					skillBelowStandard: [],
					skillReachStandard: []
				}

				for (const question of record.questions) {
					const temp = {
						taskName: question.task_name,
						taskObject: question.task_object,
						taskContent: question.content,
						actualOutcome: question.options.find(opt => opt.selected)?.name || '',
						actualScore: question.score,
						expectedOutcome: (() => {
							const ageStandard = question.age_standards?.find(as => as.age === item.ageInt)
							if (ageStandard) {
								const matchingOption = question.options.find(opt => opt.score === ageStandard.expected_score)
								return matchingOption?.name || ''
							}
							return ''
						})(),
						expectedScore: question.expected_score
					}

					if (!question.isStandard) {
						abllsSectionSummary.skillBelowStandard.push(temp)
						sectionSkillBelowStandard.push(temp)
					} else {
						abllsSectionSummary.skillReachStandard.push(temp)
					}
				}

				abllsSectionSummaryList.push(abllsSectionSummary)
			}

			const sectionSummary = {
				sectionName: item.sectionName,
				sectionId: item.sectionId,
				abllsSectionSummaryList,
				analysis: ''
			}

			if (sectionSkillBelowStandard.length > 0) {
				try {

					await updateTaskStatus(taskId, 'processing', progress, `AI分析中: ${item.sectionName}`)
					await log('beforeAnalysis', sectionSkillBelowStandard, { taskId, recordId: query?.recordId })
					sectionSummary.analysis = generateSectionFallbackAnalysis(item.sectionName, sectionSkillBelowStandard, item.childName)
					await log('afterAnalysis', sectionSummary.analysis, { taskId, recordId: query?.recordId })
					await updateTaskStatus(taskId, 'processing', progress, `AI分析完成: ${item.sectionName}`)
				} catch (err) {
					sectionSummary.analysis = generateSectionFallbackAnalysis(item.sectionName, sectionSkillBelowStandard, item.childName)
					await log(`AI分析失败: ${item.sectionName}`, err.message, { taskId, level: 'warn' })
				}
			} else {
				sectionSummary.analysis = `${item.childName}在${item.sectionName}领域的所有技能都已达标，表现优秀！`
			}

			sectionSummaryList.push(sectionSummary)
			await log('push sectionSummary 完成', sectionSummary.sectionName, { taskId, recordId: query?.recordId })

		}

		const reachCount = sectionSummaryList.reduce((acc, s) => acc + s.abllsSectionSummaryList.reduce((a, b) => a + b.skillReachStandard.length, 0), 0)
		const belowCount = sectionSummaryList.reduce((acc, s) => acc + s.abllsSectionSummaryList.reduce((a, b) => a + b.skillBelowStandard.length, 0), 0)
		const sectionNames = sectionSummaryList.map(s => s.sectionName)

		await log('构造 reportData 前的检查', {
			childName: completedSectionList[0]?.childName,
			reachCount,
			belowCount,
			sectionNames
		}, { taskId, recordId: query?.recordId })
		const reportSummary = generateReportSummaryFallback(
			completedSectionList[0]?.childName,
			reachCount,
			belowCount,
			sectionNames
		)
		await log('生成报告总结 reportSummary 完成', reportSummary, { taskId, recordId: query?.recordId })



		const recordRes = await recordCollection.where({ recordId: query.recordId }).get()
		await log('获取 record 记录完成', recordRes.data?.[0] || '未找到', { taskId, recordId: query.recordId })

		if (!recordRes.data || recordRes.data.length === 0) {
			await updateTaskStatus(taskId, 'failed', 100, '报告生成失败：未找到原始评估记录')
			await log('未找到原始评估记录', null, { taskId, recordId: query.recordId, level: 'error' })
			return
		}
		const record = recordRes.data[0]

		const taskRes = await taskCollection.where({ taskId }).get()
		await log('获取 task 信息完成', taskRes.data?.[0] || '未找到', { taskId, recordId: query.recordId })

		const taskCreateTime = taskRes.data?.[0]?.createTime || Date.now()
		const completionTime = Date.now()
		const duration = completionTime - taskCreateTime

		const userRes = await userCollection.where({ _id: query.assessorId }).get()
		await log('获取用户信息完成', userRes.data?.[0] || '未找到', { taskId, recordId: query.recordId })

		const assessorName = userRes.data?.[0]?.nickname || userRes.data?.[0]?.username || '用户未设置昵称'

		const reportData = {
			reportVersion: 'v2',
			reportId: `report_${query.recordId}_${Date.now()}`,
			recordId: query.recordId,
			assessmentId: query.assessmentId,
			assessorId: query.assessorId,
			assessorName,
			classId: record.classId || '',
			className: record.className || '',
			childId: record.childId || '',
			childName: record.childName || '',
			avatar: record.avatar || '',
			childAge: record.childAge || '',
			ageInt: record.ageInt || 0,
			assessmentTitle: record.assessmentTitle || 'ABLLS-R',
			sectionSummaryList,
			reportSummary,
			createTime: completionTime,
			updateTime: completionTime,
			completionTime,
			duration
		}

		await log('准备调用 saveReportAndUpdateStatus', reportData, { taskId, recordId: query.recordId })
		await saveReportAndUpdateStatus(reportData, query.recordId, taskId)
		await log('saveReportAndUpdateStatus 执行完毕', null, { taskId, recordId: query.recordId })

		await updateTaskStatus(taskId, 'completed', 100, '报告生成完成')
		await log('报告生成完成', reportData, { taskId, recordId: query.recordId })

	} catch (err) {
		await updateTaskStatus(taskId, 'failed', 100, `报告生成失败: ${err.message}`)
		await log('报告生成失败', err.message, { taskId, recordId: query?.recordId, level: 'error' })
	}
}




async function updateTaskStatus(taskId, status, progress, message, report = null) {
	const taskCollection = db.collection(dbName3)
	const updateData = {
		status,
		progress,
		updateTime: Date.now()
	}
	if (report) updateData.report = report

	const currentTask = await taskCollection.where({ taskId }).get()
	console.log('currentTask', currentTask) // 打印到 cons
	const currentLogs = currentTask.data[0]?.logs || []
	updateData.logs = [...currentLogs, `${Date.now()}: ${message}`]

	await taskCollection.where({ taskId }).update(updateData)
}

function generateSectionFallbackAnalysis(sectionName, skills, childName) {
	if (!skills || skills.length === 0) return `${childName}在${sectionName}领域所有技能达标。`
	const skillNames = skills.map(s => s.taskName).slice(0, 3).join('、')
	return `${childName}在${sectionName}领域有${skills.length}项技能需改进，重点关注${skillNames}等内容，建议结合兴趣进行个别化训练。`
}

function generateReportSummaryFallback(childName, reachCount, belowCount, sections) {
	const total = reachCount + belowCount
	const rate = total ? Math.round((reachCount / total) * 100) : 0
	return `${childName}共参与${sections.join('、')}等${sections.length}个技能领域的评估，完成率${rate}%，建议继续加强训练。`
}

async function saveReportAndUpdateStatus(reportData, recordId, taskId) {
	const taskCollection = db.collection(dbName3)
	const reportCollection = db.collection(dbName4)
	const recordCollection = db.collection(dbName2)

	try {
		console.log('[报告保存] 🎯 参数校验', reportData, recordId, taskId)
		await updateTaskStatus(taskId, 'processing', 99, '保存报告中...')

		if (!recordId) {
			await updateTaskStatus(taskId, 'failed', 100, '报告生成失败: recordId 不存在')
			return
		}

		const existing = await reportCollection.where({ reportId: reportData.reportId }).get()

		if (existing.data.length === 0) {
			// ✅ 第一步：插入基础字段（避免结构过大）
			const baseData = {
				reportId: reportData.reportId,
				recordId: reportData.recordId,
				assessmentId: reportData.assessmentId,
				assessorId: reportData.assessorId,
				classId: reportData.classId,
				className: reportData.className,
				childId: reportData.childId,
				childName: reportData.childName,
				avatar: reportData.avatar,
				childAge: reportData.childAge,
				ageInt: reportData.ageInt,
				assessmentTitle: reportData.assessmentTitle,
				createTime: Date.now(),
				updateTime: Date.now()
			}

			await reportCollection.add(baseData)

			// ✅ 第二步：补充写入复杂字段
			await reportCollection.where({ reportId: reportData.reportId }).update({
				sectionSummaryList: reportData.sectionSummaryList,
				reportSummary: reportData.reportSummary,
				assessorName: reportData.assessorName,
				completionTime: reportData.completionTime,
				duration: reportData.duration,
				updateTime: Date.now()
			})

			console.log('[报告保存] ✅ 拆分写入成功')
		} else {
			console.log('[报告保存] ⚠️ 报告已存在，跳过插入')
		}

		// ✅ 更新原始评估记录
		const recordRes = await recordCollection.where({ recordId }).get()
		if (recordRes.data.length === 0) {
			throw new Error(`未找到评估记录: ${recordId}`)
		}

		const updatedModules = (recordRes.data[0].modulesStatus || []).map(m => ({
			...m,
			status: 1
		}))

		const updateRes = await recordCollection.where({ recordId }).update({
			modulesStatus: updatedModules,
			reportStatus: 'completed',
			reportId: reportData.reportId,
			updateTime: Date.now()
		})

		if (updateRes.updated === 0) {
			throw new Error('评估记录更新失败')
		}

		await updateTaskStatus(taskId, 'processing', 100, '报告保存完成')

	} catch (err) {
		console.error('[报告保存] ❌ 报错:', err.message)
		await updateTaskStatus(taskId, 'failed', 100, `报告保存失败: ${err.message}`)
		throw new Error(`报告保存失败: ${err.message}`)
	}
}



module.exports = {
	generateReportAsync,
	updateTaskStatus
} // 可根据需要导出更多函数
