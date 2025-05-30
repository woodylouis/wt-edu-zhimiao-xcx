'use strict'
const db = uniCloud.database()
const dbPending = db.collection('wtdb-report-save-pending')
const dbReport = db.collection('wtdb-business-assess-report')
const dbRecord = db.collection('wtdb-business-assess-record')
const dbTask = db.collection('wtdb-report-tasks')
const dbLog = db.collection('wtdb-debug-logs')

async function log(tag, data = null, { taskId = '', recordId = '', level = 'info' } = {}) {
	const now = Date.now()
	const formattedTime = new Date(now).toLocaleString('zh-CN', { hour12: false })
	try {
		await dbLog.add({ tag, data, taskId, recordId, level, timestamp: now, formattedTime })
	} catch (_) { }
}

exports.main = async () => {
	const tasks = await dbPending.where({ status: 'pending' }).limit(3).get()

	for (const task of tasks.data) {
		const { taskId, recordId, reportData, _id } = task
		try {
			await log('save-pending-start', {}, { taskId, recordId })

			const existing = await dbReport.where({ reportId: reportData.reportId }).get()
			if (!existing.data.length) {
				await dbReport.add(reportData)
				await log('report-inserted', {}, { taskId, recordId })
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
			await log('save-pending-error', { error: err.message }, { taskId, recordId, level: 'error' })
		}
	}
}
