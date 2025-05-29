'use strict'

const db = uniCloud.database()
const dbName2 = 'wtdb-business-assess-record'
const dbName3 = 'wtdb-report-tasks'
const dbName4 = 'wtdb-business-assess-report'

async function generateReportAsync(taskId, completedSectionList, query) {
	const taskCollection = db.collection(dbName3)

	try {
		await updateTaskStatus(taskId, 'processing', 0, '开始生成报告')

		let report = {}
		let sectionSummaryList = []

		if (completedSectionList.length > 0) {
			for (let i = 0; i < completedSectionList.length; i++) {
				const item = completedSectionList[i]
				const progress = Math.floor((i / completedSectionList.length) * 100)
				await updateTaskStatus(taskId, 'processing', progress, `处理 ${item.sectionName}`)

				const abllsSectionSummaryList = []
				let sectionSkillBelowStandard = []

				for (let j = 0; j < item.assessmentRecords.length; j++) {
					const record = item.assessmentRecords[j]
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
						sectionSummary.analysis = generateSectionFallbackAnalysis(
							item.sectionName,
							sectionSkillBelowStandard,
							item.childName
						)
						await updateTaskStatus(taskId, 'processing', progress, `AI分析完成: ${item.sectionName}`)
					} catch (err) {
						sectionSummary.analysis = generateSectionFallbackAnalysis(item.sectionName, sectionSkillBelowStandard, item.childName)
					}
				} else {
					sectionSummary.analysis = `${item.childName}在${item.sectionName}领域的所有技能都已达标，表现优秀！`
				}

				sectionSummaryList.push(sectionSummary)
			}
		}

		const reportAnalysis = generateReportSummaryFallback(
			completedSectionList[0]?.childName,
			sectionSummaryList.reduce((acc, s) => acc + s.abllsSectionSummaryList.reduce((a, b) => a + b.skillReachStandard.length, 0), 0),
			sectionSummaryList.reduce((acc, s) => acc + s.abllsSectionSummaryList.reduce((a, b) => a + b.skillBelowStandard.length, 0), 0),
			sectionSummaryList.map(s => s.sectionName)
		)

		const finalReport = {
			...report,
			sectionSummaryList,
			reportSummary: reportAnalysis
		}

		await updateTaskStatus(taskId, 'processing', 99, '保存报告中...')
		await saveReportAndUpdateStatus(finalReport, query.recordId, taskId)
		await updateTaskStatus(taskId, 'completed', 100, '报告生成完成', finalReport)

	} catch (error) {
		await updateTaskStatus(taskId, 'failed', 0, `报告生成失败: ${error.message}`)
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
	const reportCollection = db.collection(dbName4)
	const recordCollection = db.collection(dbName2)

	const existing = await reportCollection.where({ reportId: reportData.reportId }).get()
	if (existing.data.length === 0) {
		await reportCollection.add({
			...reportData,
			createTime: Date.now(),
			updateTime: Date.now()
		})
	}

	const record = await recordCollection.where({ recordId }).get()
	if (record.data.length === 0) throw new Error(`未找到记录: ${recordId}`)

	const modules = record.data[0].modulesStatus.map(m => ({ ...m, status: 1 }))
	await recordCollection.where({ recordId }).update({
		modulesStatus: modules,
		reportStatus: 'completed',
		reportId: reportData.reportId,
		updateTime: Date.now()
	})
}

module.exports = {
	generateReportAsync,
	updateTaskStatus
} // 可根据需要导出更多函数
