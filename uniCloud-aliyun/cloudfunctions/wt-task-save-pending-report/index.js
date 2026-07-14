'use strict'
const db = uniCloud.database()
const dbPending = db.collection('wtdb-report-save-pending')
const dbReport = db.collection('wtdb-business-assess-report')
const dbRecord = db.collection('wtdb-business-assess-record')
const dbTask = db.collection('wtdb-report-tasks')
const dbLog = db.collection('wtdb-debug-logs')

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

exports.main = async (event = {}) => {
	if (!event.taskId) {
		return { code: 400, message: '缺少参数: taskId' }
	}
	if (!await hasRunAccess(event.taskId, event.runToken)) {
		return { code: 403, message: '无权执行该报告任务' }
	}

	const taskWhere = { taskId: event.taskId, status: 'pending' }
	const tasks = await dbPending.where(taskWhere).limit(3).get()

	for (const task of tasks.data) {
		const { taskId, recordId, reportData, _id } = task
		console.log("reportData", reportData)
		await log('reportData', {}, { reportData })
		try {
			await log('save-pending-start', {}, { taskId, recordId })

			const existing = await dbReport.where({ reportId: reportData.reportId }).limit(1).get()
			if (!existing.data.length) {
				await dbReport.add(reportData)
				await log('report-inserted', {}, { taskId, recordId })
			} else {
				const existingReport = existing.data[0]
				await dbReport.doc(existingReport._id).update({
					...reportData,
					createTime: existingReport.createTime || reportData.createTime,
					pdfUrl: '',
					pdfStatus: 'pending',
					pdfGeneratedTime: 0,
					updateTime: Date.now()
				})
				await log('report-updated-by-reanalysis', { reportId: reportData.reportId }, { taskId, recordId })
			}

			const recordRes = await dbRecord.where({ recordId }).get()
			if (!recordRes.data.length) throw new Error(`未找到评估记录 ${recordId}`)

			const updatedModules = (recordRes.data[0].modulesStatus || []).map(m => ({ ...m, status: 1 }))
			await dbRecord.where({ recordId }).update({
				modulesStatus: updatedModules,
				reportStatus: 'completed',
				reportId: reportData.reportId,
				updateTime: Date.now()
			})

			await dbTask.where({ taskId }).update({
				status: 'completed',
				progress: 100,
				completedSections: reportData.sectionSummaryList?.length || 0,
				report: reportData,
				endTime: Date.now(),
				updateTime: Date.now()
			})

			await dbPending.doc(_id).remove()
			await log('save-pending-success', {}, { taskId, recordId })

		} catch (err) {
			await dbPending.doc(_id).update({
				status: 'failed',
				failReason: err.message,
				failTime: Date.now()
			})
			await dbTask.where({ taskId }).update({
				status: 'failed',
				failReason: err.message,
				errorMessage: err.message,
				updateTime: Date.now()
			})
			await log('save-pending-error', { error: err.message }, { taskId, recordId, level: 'error' })
		}
	}

	return { code: 200, data: { processed: tasks.data.length } }
}
