'use strict'

const db = uniCloud.database()
const dbCmd = db.command
const dbTask = db.collection('wtdb-report-tasks')
const dbAnalysis = db.collection('wtdb-section-analysis-tasks')
const dbPending = db.collection('wtdb-report-save-pending')
const dbLog = db.collection('wtdb-debug-logs')
const taskAuth = require('report-task-auth')

const MAX_LOOPS = 20
const MAX_RUN_TIME = 7 * 60 * 1000

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

async function preparePendingTask(taskId) {
	const res = await dbTask.where({ taskId, status: 'pending' }).limit(1).get()

	for (const task of res.data || []) {
		await appendTaskLog(task.taskId, '后台任务开始分派模块分析', {
			status: 'processing',
			progress: 0,
			startTime: task.startTime || Date.now(),
			failReason: '',
			errorMessage: ''
		})
	}

}

async function callWorker(name, data = {}) {
	try {
		const res = await uniCloud.callFunction({ name, data })
		const result = res.result || res
		if (result && Number(result.code) >= 400) {
			throw new Error(result.message || `${name} 执行失败`)
		}
		return result
	} catch (error) {
		await log('orchestrator-call-failed', { name, error: error.message }, { level: 'error' })
		throw error
	}
}

async function getTaskStatus(taskId) {
	if (!taskId) return null
	const res = await dbTask.where({ taskId }).field({
		taskId: true,
		recordId: true,
		childId: true,
		status: true,
		progress: true,
		totalSections: true,
		completedSections: true,
		failReason: true,
		errorMessage: true
	}).limit(1).get()
	return res.data?.[0] || null
}

async function hasActiveWork(taskId) {
	const analysisWhere = { taskId, status: dbCmd.in(['pending', 'processing']) }
	const pendingSaveWhere = { taskId, status: 'pending' }
	const taskWhere = {
		taskId,
		status: dbCmd.in(['pending', 'processing', 'waiting_merge', 'pending_save'])
	}

	const [analysisCount, saveCount, taskCount] = await Promise.all([
		dbAnalysis.where(analysisWhere).count(),
		dbPending.where(pendingSaveWhere).count(),
		dbTask.where(taskWhere).count()
	])

	return (analysisCount.total || 0) > 0 ||
		(saveCount.total || 0) > 0 ||
		(taskCount.total || 0) > 0
}

function isTerminalStatus(status) {
	return status === 'completed' || status === 'failed'
}

async function runTaskPipeline(taskId, runToken, startTime) {
	let loopCount = 0
	let deadlineReached = false

	for (let i = 0; i < MAX_LOOPS; i++) {
		loopCount = i + 1

		if (Date.now() - startTime > MAX_RUN_TIME) {
			deadlineReached = true
			await log('orchestrator-deadline-reached', { taskId, loopCount }, { taskId, level: 'warn' })
			break
		}

		await callWorker('wt-section-analysis-worker', { taskId, runToken })
		await callWorker('wt-section-merge-to-report', { taskId, runToken })
		await callWorker('wt-task-save-pending-report', { taskId, runToken })

		const status = await getTaskStatus(taskId)
		if (!status || isTerminalStatus(status.status)) {
			break
		}

		const active = await hasActiveWork(taskId)
		if (!active) break
	}

	const status = await getTaskStatus(taskId)
	const active = await hasActiveWork(taskId)

	if (active && status && !isTerminalStatus(status.status)) {
		const message = deadlineReached
			? '后台分析耗时较长，本次按需编排已到达执行时间上限'
			: '后台分析仍有未完成步骤，本次按需编排已到达循环上限'
		await appendTaskLog(taskId, message, {
			status: 'failed',
			failReason: message,
			errorMessage: message
		})
		return {
			loopCount,
			deadlineReached,
			active,
			status: await getTaskStatus(taskId)
		}
	}

	return {
		loopCount,
		deadlineReached,
		active,
		status
	}
}

exports.main = async (event = {}) => {
	const startTime = Date.now()
	const taskId = event.taskId || ''
	const runToken = event.runToken || ''
	if (!taskId) {
		return { code: 400, message: '缺少参数: taskId' }
	}

	try {
		if (!await taskAuth.hasRunAccess(taskId, runToken)) {
			return { code: 403, message: '无权执行该报告任务' }
		}

		await log('orchestrator-start', {
			taskId,
			source: event.source || '',
			triggeredBy: event.triggeredBy || ''
		}, { taskId })

		await preparePendingTask(taskId)
		await callWorker('wt-section-task-dispatcher', { taskId, runToken })

		const result = await runTaskPipeline(taskId, runToken, startTime)

		await log('orchestrator-done', {
			taskId,
			loopCount: result.loopCount,
			deadlineReached: result.deadlineReached,
			active: result.active,
			status: result.status
		}, { taskId })
		const failed = result.status?.status === 'failed'
		return {
			code: failed ? 500 : 200,
			message: failed
				? (result.status.failReason || result.status.errorMessage || '报告任务执行失败')
				: '报告任务编排完成',
			data: result.status
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
	} finally {
		if (taskId && runToken) {
			try {
				await taskAuth.revokeRunToken(taskId, runToken)
			} catch (_) { }
		}
	}
}
