'use strict'

const db = uniCloud.database()
const dbName2 = 'wtdb-business-assess-record'
const dbName3 = 'wtdb-report-tasks'
const dbName4 = 'wtdb-business-assess-report'
const dbNameLog = 'wtdb-debug-logs'

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

// ✅ 日志记录函数
async function log(tag, data = null, { taskId = '', recordId = '', level = 'info' } = {}) {
	const logCollection = db.collection(dbNameLog)
	const now = Date.now()
	const formattedTime = new Date(now).toLocaleString('zh-CN', { hour12: false })
	try {
		await logCollection.add({ tag, data, taskId, recordId, level, timestamp: now, formattedTime })
	} catch (_) { }
}

// ✅ 更新任务状态 + 写日志
async function updateTaskStatus(taskId, status, progress, message, report = null) {
	const taskCollection = db.collection(dbName3)
	const updateData = {
		status,
		progress,
		updateTime: Date.now()
	}
	if (report) updateData.report = report
	const currentTask = await taskCollection.where({ taskId }).get()
	const currentLogs = currentTask.data?.[0]?.logs || []
	updateData.logs = [...currentLogs, `${Date.now()}: ${message}`]
	await taskCollection.where({ taskId }).update(updateData)
	await log('updateTaskStatus', { status, progress, message }, { taskId })
}

// ✅ 生成单个 section 分析
function generateSectionFallbackAnalysis(sectionName, skills, childName) {
	if (!skills || skills.length === 0) return `${childName}在${sectionName}领域所有技能达标。`
	const skillNames = skills.map(s => s.taskName).slice(0, 3).join('、')
	return `${childName}在${sectionName}领域有${skills.length}项技能需改进，重点关注${skillNames}等内容，建议结合兴趣进行个别化训练。`
}

// ✅ 生成报告总结
function generateReportSummaryFallback(childName, reachCount, belowCount, sections) {
	const total = reachCount + belowCount
	const rate = total ? Math.round((reachCount / total) * 100) : 0
	return `${childName}共参与${sections.join('、')}等${sections.length}个技能领域的评估，建议继续加强训练。`
}

// ✅ 保存报告和更新状态
async function saveReportAndUpdateStatus(reportData, recordId, taskId) {
	const reportCollection = db.collection(dbName4)
	const recordCollection = db.collection(dbName2)

	await log('saveReportAndUpdateStatus-start', {}, { taskId, recordId })

	try {
		await updateTaskStatus(taskId, 'processing', 99, '保存报告中...')

		// 检查是否已存在
		const existing = await reportCollection.where(db.command.or([
			{ reportId: reportData.reportId },
			{ recordId }
		])).get()
		if (!existing.data.length) {
			await log('report-not-exist', {}, { taskId, recordId })

			// 拆成两段写入，避免字段过大失败
			const baseFields = {
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
				createTime: reportData.createTime,
				updateTime: reportData.updateTime
			}

			const insertRes = await reportCollection.add(baseFields)
			await log('report-inserted', { insertId: insertRes.id }, { taskId, recordId })

			// 补充写入大字段
			const updateRes = await reportCollection.where({ reportId: reportData.reportId }).update({
				sectionSummaryList: reportData.sectionSummaryList,
				reportSummary: reportData.reportSummary,
				assessorName: reportData.assessorName,
				completionTime: reportData.completionTime,
				duration: reportData.duration,
				updateTime: Date.now()
			})

			await log('report-updated-large-fields', { updateCount: updateRes.updated }, { taskId, recordId })
		} else {
			throw new Error('该评估已生成报告，不能覆盖；请创建一次新的评估')
		}

		// 更新记录模块状态
		const recordRes = await recordCollection.where({ recordId }).get()
		if (!recordRes.data.length) throw new Error(`未找到评估记录: ${recordId}`)

		const updatedModules = (recordRes.data[0].modulesStatus || []).map(m => ({ ...m, status: 1 }))
		const updateRecordRes = await recordCollection.where({ recordId }).update({
			modulesStatus: updatedModules,
			reportStatus: 'completed',
			reportId: reportData.reportId,
			updateTime: Date.now()
		})

		if (updateRecordRes.updated === 0) throw new Error('评估记录更新失败')

		await log('record-updated', {}, { taskId, recordId })
		await updateTaskStatus(taskId, 'processing', 100, '报告保存完成')
		await log('saveReportAndUpdateStatus-done', {}, { taskId, recordId })

	} catch (err) {
		await log('saveReportAndUpdateStatus-error', { message: err.message }, { taskId, recordId, level: 'error' })
		throw new Error('保存报告失败: ' + err.message)
	}
}


// ✅ 生成报告主函数
async function generateReportAsync(taskId, completedSectionList, query) {
	const recordCollection = db.collection(dbName2)
	const taskCollection = db.collection(dbName3)
	const recordId = query?.recordId

	await log('Start generateReportAsync', query, { taskId, recordId })

	if (!recordId) {
		await updateTaskStatus(taskId, 'failed', 100, '报告生成失败: 缺少 recordId')
		return
	}

	try {
		await updateTaskStatus(taskId, 'processing', 0, '开始生成报告')

		let sectionSummaryList = []

		for (let i = 0; i < completedSectionList.length; i++) {
			const item = completedSectionList[i]
			const progress = Math.floor((i / completedSectionList.length) * 100)
			await updateTaskStatus(taskId, 'processing', progress, `汇总分析结果: ${item.sectionName}`)

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

			// 🔍 尝试读取分析任务结果
			const sectionTaskRes = await db.collection('wtdb-section-analysis-tasks')
				.where({
					taskId,
					sectionId: item.sectionId,
					status: 'done'
				})
				.limit(1)
				.get()

			let analysis = ''
			if (sectionTaskRes.data?.length > 0) {
				analysis = sectionTaskRes.data[0].analysis
			} else {
				// 若失败或未找到，使用降级分析
				analysis = generateSectionFallbackAnalysis(item.sectionName, sectionSkillBelowStandard, item.childName)
				await log('section-analysis-fallback-used', { sectionId: item.sectionId }, { taskId })
			}

			sectionSummaryList.push({
				sectionName: item.sectionName,
				sectionId: item.sectionId,
				abllsSectionSummaryList,
				analysis
			})
		}

		await db.collection(dbName3).where({ taskId }).update({
			completedSections: completedSectionList,
			updateTime: Date.now()
		})

		const reachCount = sectionSummaryList.reduce((acc, s) => acc + s.abllsSectionSummaryList.reduce((a, b) => a + b.skillReachStandard.length, 0), 0)
		const belowCount = sectionSummaryList.reduce((acc, s) => acc + s.abllsSectionSummaryList.reduce((a, b) => a + b.skillBelowStandard.length, 0), 0)
		const sectionNames = sectionSummaryList.map(s => s.sectionName)

		const reportSummary = generateReportSummaryFallback(completedSectionList[0]?.childName, reachCount, belowCount, sectionNames)
		const recordRes = await recordCollection.where({ recordId }).get()
		if (!recordRes.data.length) {
			await updateTaskStatus(taskId, 'failed', 100, '报告生成失败：未找到原始评估记录')
			return
		}

		const taskRes = await taskCollection.where({ taskId }).get()
		const taskCreateTime = taskRes.data?.[0]?.createTime || Date.now()
		const completionTime = Date.now()
		const duration = completionTime - taskCreateTime

		const assessorName = await resolveAssessorNickname(query.assessorId, query.assessorName)

		const reportData = {
			reportVersion: 'v2',
			reportId: `report_${recordId}`,
			recordId,
			assessmentId: query.assessmentId,
			assessorId: query.assessorId,
			assessorName,
			classId: recordRes.data[0].classId,
			className: recordRes.data[0].className,
			childId: recordRes.data[0].childId,
			childName: recordRes.data[0].childName,
			avatar: recordRes.data[0].avatar,
			childAge: recordRes.data[0].childAge,
			ageInt: recordRes.data[0].ageInt,
			assessmentTitle: recordRes.data[0].assessmentTitle || 'ABLLS-R',
			sectionSummaryList,
			reportSummary,
			createTime: completionTime,
			updateTime: completionTime,
			completionTime,
			duration
		}

		await updateTaskStatus(taskId, 'waiting_merge', 90, '模块分析结果等待合并报告')
		await log('report-waiting-merge', {}, { taskId, recordId })

	} catch (err) {
		await log('generateReportAsync-error', { message: err.message }, { taskId, recordId, level: 'error' })
		await updateTaskStatus(taskId, 'failed', 100, `报告生成失败: ${err.message}`)
	}
}

module.exports = {
	generateReportAsync,
	updateTaskStatus
}
