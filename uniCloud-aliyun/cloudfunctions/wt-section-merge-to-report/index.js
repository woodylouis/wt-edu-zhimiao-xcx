'use strict'
const db = uniCloud.database()
const dbTask = db.collection('wtdb-report-tasks')
const dbAnalysis = db.collection('wtdb-section-analysis-tasks')
const dbPending = db.collection('wtdb-report-save-pending')
const dbRecord = db.collection('wtdb-business-assess-record')
const dbUser = db.collection('uni-id-users')
const dbLog = db.collection('wtdb-debug-logs')

async function log(tag, data = null, { taskId = '', recordId = '', level = 'info' } = {}) {
	const now = Date.now()
	const formattedTime = new Date(now).toLocaleString('zh-CN', { hour12: false })
	try {
		await dbLog.add({ tag, data, taskId, recordId, level, timestamp: now, formattedTime })
	} catch (_) { }
}

function generateReportSummaryFallback(childName, reachCount, belowCount, sections) {
	const total = reachCount + belowCount
	const rate = total ? Math.round((reachCount / total) * 100) : 0
	return `${childName}共参与${sections.join('、')}等${sections.length}个技能领域的评估，完成率${rate}%，建议继续加强训练。`
}

exports.main = async () => {
	const tasks = await dbTask.where({ status: 'waiting_merge' }).limit(3).get()

	for (const task of tasks.data) {
		const { taskId, recordId, assessorId, assessmentId } = task

		try {
			await log('merge-start', {}, { taskId, recordId })

			const analysisRes = await dbAnalysis.where({ taskId }).get()
			const analysisList = analysisRes.data

			if (!analysisList.length) {
				await dbTask.where({ taskId }).update({
					status: 'failed',
					failReason: '未找到分析任务',
					updateTime: Date.now()
				})
				await log('merge-failed-no-analysis', {}, { taskId, recordId })
				continue
			}

			const hasPending = analysisList.some(item => item.status === 'pending')
			const hasFailed = analysisList.some(item => item.status === 'failed')
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

			const recordRes = await dbRecord.where({ recordId }).get()
			if (!recordRes.data.length) throw new Error('找不到评估记录')
			const record = recordRes.data[0]

			const userRes = await dbUser.where({ _id: assessorId }).get()
			const assessorName = userRes.data?.[0]?.nickname || userRes.data?.[0]?.username || '用户未设置昵称'

			let reachCount = 0, belowCount = 0
			const sectionSummaryList = analysisList.map(item => {
				const section = {
					sectionName: item.sectionName,
					sectionId: item.sectionId,
					abllsSectionSummaryList: item.abllsSectionSummaryList || [], // 如果你需要分析中包含技能明细
					analysis: item.analysis
				}
				// 简化处理：假设技能明细都不在这合并里，仅靠 analysis
				// 如果你已经把 skillReachStandard / skillBelowStandard 嵌入 analysisTask，可以加计数逻辑
				return section
			})
			const sectionNames = sectionSummaryList.map(s => s.sectionName)

			const reportSummary = generateReportSummaryFallback(record.childName, reachCount, belowCount, sectionNames)
			const completionTime = Date.now()
			const duration = completionTime - (task.createTime || completionTime)

			const reportData = {
				reportVersion: 'v2',
				reportId: `report_${recordId}_${Date.now()}`,
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
}
