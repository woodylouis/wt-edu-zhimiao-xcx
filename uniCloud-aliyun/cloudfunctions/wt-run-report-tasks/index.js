'use strict'
const db = uniCloud.database()
const dbName = 'wtdb-report-tasks'
const { generateReportAsync } = require('report-core') // 或者把逻辑提取为共用模块

exports.main = async () => {
	const pendingTasks = await db.collection(dbName)
		.where({ status: 'pending' })
		.orderBy('createTime', 'asc')
		.limit(1)
		.get()

	if (pendingTasks.data.length === 0) {
		return { code: 200, message: '无任务可执行' }
	}

	const task = pendingTasks.data[0]

	// 标记为 processing
	await db.collection(dbName).where({ taskId: task.taskId }).update({
		status: 'processing',
		updateTime: Date.now()
	})

	try {
		// 执行任务
		await generateReportAsync(task.taskId, task.originalParams.completedSectionList, task.originalParams.query)
		return { code: 200, message: '任务执行完成' }
	} catch (err) {
		console.error('任务执行失败:', err)
		await db.collection(dbName).where({ taskId: task.taskId }).update({
			status: 'failed',
			updateTime: Date.now()
		})
		return { code: 500, message: '任务失败: ' + err.message }
	}
}
