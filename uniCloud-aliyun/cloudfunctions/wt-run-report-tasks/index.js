'use strict'
const db = uniCloud.database()
const dbName = 'wtdb-report-tasks'

// ✅ 引入抽出的模块
const { generateReportAsync, updateTaskStatus } = require('report-core')

exports.main = async () => {
	const pendingTasks = await db.collection(dbName)
		.where({ status: 'pending' })
		.orderBy('createTime', 'asc')
		.limit(1)
		.get()
	console.log('pendingTasks', pendingTasks) // 打印到 cons
	if (pendingTasks.data.length === 0) {
		return { code: 200, message: '无任务可执行' }
	}

	const task = pendingTasks.data[0]

	await updateTaskStatus(task.taskId, 'processing', 0, '任务开始执行')

	try {
		await generateReportAsync(
			task.taskId,
			task.originalParams.completedSectionList,
			task.originalParams.query
		)
		return { code: 200, message: '任务执行成功' }
	} catch (e) {
		console.error('任务执行失败:', e)
		await updateTaskStatus(task.taskId, 'failed', 0, '任务失败：' + e.message)
		return { code: 500, message: '任务失败：' + e.message }
	}
}
