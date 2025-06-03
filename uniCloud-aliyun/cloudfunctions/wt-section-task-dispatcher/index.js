'use strict'
const db = uniCloud.database()
const dbTask = db.collection('wtdb-report-tasks')
const dbAnalysis = db.collection('wtdb-section-analysis-tasks')
const dbLog = db.collection('wtdb-debug-logs')

async function log(tag, data = null, { taskId = '', level = 'info' } = {}) {
	const now = Date.now()
	const formattedTime = new Date(now).toLocaleString('zh-CN', { hour12: false })
	try {
		await dbLog.add({ tag, data, taskId, level, timestamp: now, formattedTime })
	} catch (_) {}
}

exports.main = async () => {
	const tasks = await dbTask.where({ status: 'processing' }).limit(3).get()

	for (const task of tasks.data) {
		const { taskId, recordId, completedSections = [], assessorId, assessmentId } = task
		try {
			await log('dispatcher-start', {}, { taskId })

			if (!Array.isArray(completedSections) || completedSections.length === 0) {
				await log('dispatcher-skip-no-sections', {}, { taskId })
				continue
			}

			for (const section of completedSections) {
				const exists = await dbAnalysis.where({
					taskId,
					sectionId: section.sectionId
				}).count()

				if (exists.total === 0) {
					await dbAnalysis.add({
						taskId,
						recordId,
						sectionId: section.sectionId,
						sectionName: section.sectionName,
						childName: section.childName,
						ageInt: section.ageInt,
						assessmentRecords: section.assessmentRecords,
						status: 'pending',
						createTime: Date.now()
					})
					await log('dispatcher-add-analysis-task', {
						sectionId: section.sectionId,
						sectionName: section.sectionName
					}, { taskId })
				} else {
					await log('dispatcher-skip-existing-task', {
						sectionId: section.sectionId
					}, { taskId })
				}
			}

			// 分派完成后设置为等待合并
			await dbTask.where({ taskId }).update({
				status: 'waiting_merge',
				updateTime: Date.now()
			})
			await log('dispatcher-task-mark-waiting-merge', {}, { taskId })

		} catch (err) {
			await log('dispatcher-error', { error: err.message }, { taskId, level: 'error' })
			await dbTask.where({ taskId }).update({
				status: 'failed',
				failReason: err.message,
				updateTime: Date.now()
			})
		}
	}
}
