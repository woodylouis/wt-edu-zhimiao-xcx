'use strict'

const uniID = require('uni-id-common')
const db = uniCloud.database()
const dbTask = db.collection('wtdb-report-tasks')

function compactId(value) {
	if (!value) return ''
	if (typeof value === 'string') return value
	if (value.$oid) return value.$oid
	if (value._id) return compactId(value._id)
	return String(value)
}

function hasAdminRole(roles) {
	const roleList = Array.isArray(roles) ? roles : [roles]
	return roleList.filter(Boolean).some(role => String(role).toLowerCase().includes('admin'))
}

function getTaskAssessorId(task) {
	return compactId(
		task.assessorId ||
		task.originalParams?.query?.assessorId
	)
}

function canRunTask(task, tokenRes) {
	const uid = compactId(tokenRes.uid)
	const runAuthorizedBy = compactId(task.metadata?.runAuthorizedBy)
	return getTaskAssessorId(task) === uid ||
		runAuthorizedBy === uid ||
		hasAdminRole(tokenRes.role)
}

async function getTask(taskId) {
	const res = await dbTask.where({ taskId }).limit(1).get()
	return res.data?.[0] || null
}

function toTaskStatus(task) {
	return {
		taskId: task.taskId,
		recordId: task.recordId || task.originalParams?.query?.recordId || '',
		childId: compactId(task.childId),
		status: task.status,
		progress: Number(task.progress) || 0,
		totalSections: Number(task.totalSections) || 0,
		completedSections: Number(task.completedSections) || 0,
		failReason: task.failReason || task.errorMessage || ''
	}
}

exports.main = async (event = {}, context) => {
	const taskId = event.taskId || ''
	if (!taskId) {
		return {
			code: 400,
			message: '缺少参数: taskId'
		}
	}

	try {
		const tokenRes = await uniID.createInstance({ context }).checkToken(event.uniIdToken)
		if (!tokenRes || tokenRes.errCode || !tokenRes.uid) {
			return {
				code: 401,
				message: '登录状态已失效，请重新登录'
			}
		}

		const task = await getTask(taskId)
		if (!task) {
			return {
				code: 404,
				message: '报告任务不存在'
			}
		}

		if (!canRunTask(task, tokenRes)) {
			return {
				code: 403,
				message: '无权执行该报告任务'
			}
		}

		if (task.status === 'completed') {
			return {
				code: 200,
				message: '报告已生成',
				data: toTaskStatus(task)
			}
		}

		if (task.status === 'failed') {
			return {
				code: 409,
				message: '报告任务已失败，请在后台重新生成',
				data: toTaskStatus(task)
			}
		}

		const invocation = await uniCloud.callFunction({
			name: 'wt-report-task-orchestrator',
			data: {
				taskId,
				runToken: compactId(task._id),
				source: event.source || 'on-demand',
				triggeredBy: compactId(tokenRes.uid)
			}
		})
		const result = invocation.result || invocation

		if (!result || result.code !== 200) {
			return {
				code: result?.code || 500,
				message: result?.message || '报告分析执行失败',
				data: result?.data || null
			}
		}

		return result
	} catch (error) {
		console.error('按需执行报告任务失败:', error)
		return {
			code: 500,
			message: `按需执行报告任务失败: ${error.message}`
		}
	}
}
