'use strict'

const db = uniCloud.database()
const dbCmd = db.command
const dbTask = db.collection('wtdb-report-tasks')
const dbAnalysis = db.collection('wtdb-section-analysis-tasks')
const dbPending = db.collection('wtdb-report-save-pending')
const dbLog = db.collection('wtdb-debug-logs')

const MAX_LOOPS = 3

async function log(tag, data = null, { taskId = '', level = 'info' } = {}) {
	const now = Date.now()
	const formattedTime = new Date(now).toLocaleString('zh-CN', { hour12: false })
	try {
		await dbLog.add({ tag, data, taskId, level, timestamp: now, formattedTime })
	} catch (_) { }
}

async function appendTaskLog(taskId, message, extra = {}) {
	const taskRes = await dbTask.where({ taskId }).field({ logs: true }).limit(1).get()
	const task = taskRes.data?.[0]
	if (!task) return

	const logs = task.logs || []
	await dbTask.where({ taskId }).update({
		...extra,
		logs: [...logs, `${Date.now()}: ${message}`],
		updateTime: Date.now()
	})
}

async function resetTask(taskId, reason) {
	await dbAnalysis.where({ taskId }).remove()
	await dbPending.where({ taskId }).remove()

	const taskRes = await dbTask.where({ taskId }).limit(1).get()
	const task = taskRes.data?.[0]
	if (!task) {
		throw new Error(`任务不存在: ${taskId}`)
	}

	const metadata = task.metadata || {}
	await appendTaskLog(taskId, reason || '任务重新进入生成队列', {
		status: 'pending',
		progress: 0,
		completedSections: 0,
		failReason: '',
		errorMessage: '',
		metadata: {
			...metadata,
			retryCount: Number(metadata.retryCount || 0) + 1
		}
	})
}

async function preparePendingTasks(taskId = '') {
	const where = taskId
		? { taskId, status: dbCmd.in(['pending']) }
		: { status: 'pending' }
	const res = await dbTask.where(where).limit(5).get()

	for (const task of res.data || []) {
		await appendTaskLog(task.taskId, '后台任务开始分派模块分析', {
			status: 'processing',
			progress: 0,
			startTime: task.startTime || Date.now(),
			failReason: '',
			errorMessage: ''
		})
	}

	return res.data?.length || 0
}

async function callWorker(name, data = {}) {
	try {
		const res = await uniCloud.callFunction({ name, data })
		return res.result || res
	} catch (error) {
		await log('orchestrator-call-failed', { name, error: error.message }, { level: 'error' })
		throw error
	}
}

async function getTaskStatus(taskId) {
	if (!taskId) return null
	const res = await dbTask.where({ taskId }).field({ status: true, progress: true }).limit(1).get()
	return res.data?.[0] || null
}

async function hasActiveWork(taskId = '') {
	const analysisWhere = taskId
		? { taskId, status: dbCmd.in(['pending', 'processing']) }
		: { status: dbCmd.in(['pending', 'processing']) }
	const pendingSaveWhere = taskId
		? { taskId, status: 'pending' }
		: { status: 'pending' }
	const taskWhere = taskId
		? { taskId, status: dbCmd.in(['pending', 'processing', 'waiting_merge', 'pending_save']) }
		: { status: dbCmd.in(['pending', 'processing', 'waiting_merge', 'pending_save']) }

	const [analysisCount, saveCount, taskCount] = await Promise.all([
		dbAnalysis.where(analysisWhere).count(),
		dbPending.where(pendingSaveWhere).count(),
		dbTask.where(taskWhere).count()
	])

	return (analysisCount.total || 0) > 0 ||
		(saveCount.total || 0) > 0 ||
		(taskCount.total || 0) > 0
}

exports.main = async (event = {}) => {
	const taskId = event.taskId || ''
	const action = event.action || ''
	const kickOnly = !!event.kickOnly

	try {
		await log('orchestrator-start', { taskId, action }, { taskId })

		if (taskId && action === 'retry') {
			await resetTask(taskId, '后台手动重新生成报告')
		}

		const preparedCount = await preparePendingTasks(taskId)
		if (preparedCount > 0 || !taskId) {
			await callWorker('wt-section-task-dispatcher', taskId ? { taskId } : {})
		}

		if (kickOnly) {
			await log('orchestrator-kick-done', { taskId }, { taskId })
			return {
				code: 200,
				message: '报告任务已进入后台队列',
				data: taskId ? await getTaskStatus(taskId) : null
			}
		}

		for (let i = 0; i < MAX_LOOPS; i++) {
			await callWorker('wt-section-analysis-worker', taskId ? { taskId } : {})
			await callWorker('wt-section-merge-to-report', taskId ? { taskId } : {})
			await callWorker('wt-task-save-pending-report', taskId ? { taskId } : {})

			if (taskId) {
				const status = await getTaskStatus(taskId)
				if (!status || status.status === 'completed' || status.status === 'failed') {
					break
				}
			}

			const active = await hasActiveWork(taskId)
			if (!active) break
		}

		await log('orchestrator-done', { taskId }, { taskId })
		return {
			code: 200,
			message: '报告任务编排完成',
			data: taskId ? await getTaskStatus(taskId) : null
		}
	} catch (error) {
		await log('orchestrator-error', { error: error.message, stack: error.stack }, { taskId, level: 'error' })
		if (taskId) {
			await appendTaskLog(taskId, `后台编排失败: ${error.message}`, {
				status: 'failed',
				failReason: error.message,
				errorMessage: error.message
			})
		}
		return {
			code: 500,
			message: error.message
		}
	}
}
