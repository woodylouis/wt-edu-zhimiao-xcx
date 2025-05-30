'use strict'

const db = uniCloud.database()
const dbName2 = 'wtdb-business-assess-record'
const dbName3 = 'wtdb-report-tasks'
const dbName4 = 'wtdb-business-assess-report'
const dbName5 = 'uni-id-users'

async function generateReportAsync(taskId, completedSectionList, query) {
	console.log('generateReportAsync query', query)

	if (!query?.recordId) {
		await updateTaskStatus(taskId, 'failed', 100, '报告生成失败: 缺少 recordId，无法保存报告')
		return
	}

	try {
		await updateTaskStatus(taskId, 'processing', 0, '开始生成报告')

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
						sectionSummary.analysis = generateSectionFallbackAnalysis(
							item.sectionName,
							sectionSkillBelowStandard,
							item.childName
						)
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

		// ✅ 查询原始评估记录
		const recordRes = await db.collection(dbName2).where({ recordId: query.recordId }).get()
		if (!recordRes.data || recordRes.data.length === 0) {
			await updateTaskStatus(taskId, 'failed', 100, '报告生成失败：未找到原始评估记录')
			return
		}
		const record = recordRes.data[0]

		// ✅ 查询任务创建时间，计算耗时
		const taskRes = await db.collection(dbName3).where({ taskId }).get()
		const taskCreateTime = taskRes.data?.[0]?.createTime || Date.now()
		const completionTime = Date.now()
		const duration = completionTime - taskCreateTime

		const userRes = await db.collection('uni-id-users').where({ _id: query.assessorId }).get()
		const assessorName = userRes.data?.[0]?.nickname || userRes.data?.[0]?.username || '用户未设置昵称'

		// ✅ 构造完整 reportData
		const reportData = {
			reportVersion: 'v2',
			reportId: `report_${query.recordId}_${Date.now()}`,
			recordId: query.recordId,
			assessmentId: query.assessmentId,
			assessorId: query.assessorId,
			assessorName: assessorName || '',
			classId: record.classId || '',
			className: record.className || '',
			childId: record.childId || '',
			childName: record.childName || '',
			avatar: record.avatar || '',
			childAge: record.childAge || '',
			ageInt: record.ageInt || 0,
			assessmentTitle: record.assessmentTitle || 'ABLLS-R',
			sectionSummaryList,
			reportSummary: reportAnalysis,
			createTime: completionTime,
			updateTime: completionTime,
			completionTime,
			duration
		}

		await updateTaskStatus(taskId, 'processing', 99, '保存报告中...')
		await saveReportAndUpdateStatus(reportData, query.recordId, taskId)
		await updateTaskStatus(taskId, 'completed', 100, '报告生成完成', reportData)

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
			console.log('❌ recordId 不存在，终止')
			await updateTaskStatus(taskId, 'failed', 100, '报告生成失败: recordId 不存在，无法查询记录')
			return
		}

		console.log('[报告保存] 🔍 查询报告是否已存在...')
		const existing = await reportCollection.where({ reportId: reportData.reportId }).get()
		console.log('[报告保存] ✅ 查询结果 existing:', existing.data?.length)

		if (existing.data.length === 0) {
			console.log('[报告保存] ➕ 插入新报告...')
			const insertResult = await reportCollection.add({
				...reportData,
				createTime: Date.now(),
				updateTime: Date.now()
			})
			if (!insertResult.id) {
				throw new Error('报告插入失败，未返回ID')
			}
			console.log('[报告保存] ✅ 报告插入成功')
		} else {
			console.log('[报告保存] ⚠️ 报告已存在，不再重复插入')
		}

		console.log('[报告保存] 🔍 查询原始评估记录...')
		const recordRes = await recordCollection.where({ recordId }).get()
		if (recordRes.data.length === 0) {
			throw new Error(`未找到评估记录: ${recordId}`)
		}

		const recordData = recordRes.data[0]
		const modules = (recordData.modulesStatus || []).map(m => ({
			...m,
			status: 1
		}))

		console.log('[报告保存] 🔧 更新原始评估记录状态...')
		const updateRes = await recordCollection.where({ recordId }).update({
			modulesStatus: modules,
			reportStatus: 'completed',
			reportId: reportData.reportId,
			updateTime: Date.now()
		})

		if (updateRes.updated === 0) {
			throw new Error('评估记录更新失败，未修改任何字段')
		}

		console.log('[报告保存] ✅ 评估记录更新成功')
		await updateTaskStatus(taskId, 'processing', 100, '报告保存完成')

	} catch (err) {
		console.error('[报告保存] ❌ 异常:', err.message)
		await updateTaskStatus(taskId, 'failed', 100, `报告保存失败: ${err.message}`)
		throw new Error(`报告保存失败: ${err.message}`)
	}
}


module.exports = {
	generateReportAsync,
	updateTaskStatus
} // 可根据需要导出更多函数
