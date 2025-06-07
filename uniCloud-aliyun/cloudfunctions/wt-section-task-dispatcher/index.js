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
	} catch (_) { }
}

exports.main = async () => {
	console.log("开始执行任务调度器")
	const tasks = await dbTask.where({ status: 'processing' }).limit(10).get()

	for (const task of tasks.data) {
		console.log("开始执行任务调度器", task)
		const { taskId, recordId, assessorId, assessmentId, originalParams = {} } = task

		// 从 originalParams 中获取 completedSections
		const completedSections = originalParams.completedSectionList || []
		console.log("completedSections", completedSections)
		try {
			await log('dispatcher-start', {
				completedSectionsCount: completedSections.length,
				hasOriginalParams: !!originalParams
			}, { taskId })

			if (!Array.isArray(completedSections) || completedSections.length === 0) {
				await log('dispatcher-skip-no-sections', {
					originalParamsKeys: Object.keys(originalParams),
					completedSectionsType: typeof completedSections,
					completedSectionsLength: completedSections?.length || 0
				}, { taskId })
				continue
			}

			// 批量检查已存在的任务
			const existingSectionIds = new Set()
			const existingTasks = await dbAnalysis.where({ taskId }).field({ sectionId: true }).get()
			existingTasks.data.forEach(task => {
				existingSectionIds.add(task.sectionId)
			})

			// 创建需要新增的分析任务
			const tasksToCreate = []
			for (const section of completedSections) {
				if (!existingSectionIds.has(section.sectionId)) {
					tasksToCreate.push({
						taskId,
						recordId,
						sectionId: section.sectionId,
						sectionName: section.sectionName,
						childName: section.childName,
						ageInt: section.ageInt,
						assessmentRecords: section.assessmentRecords,
						status: 'pending',
						createTime: Date.now(),
						retryCount: 0
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

			// 批量创建分析任务
			if (tasksToCreate.length > 0) {
				await dbAnalysis.add(tasksToCreate)
				await log('dispatcher-batch-created-tasks', {
					createdCount: tasksToCreate.length
				}, { taskId })
			}

			// 分派完成后设置为等待合并
			await dbTask.where({ taskId }).update({
				status: 'waiting_merge',
				totalSections: completedSections.length,
				updateTime: Date.now()
			})
			await log('dispatcher-task-mark-waiting-merge', {
				totalSections: completedSections.length
			}, { taskId })

		} catch (err) {
			await log('dispatcher-error', {
				error: err.message,
				stack: err.stack
			}, { taskId, level: 'error' })
			await dbTask.where({ taskId }).update({
				status: 'failed',
				failReason: err.message,
				updateTime: Date.now()
			})
		}
	}
}