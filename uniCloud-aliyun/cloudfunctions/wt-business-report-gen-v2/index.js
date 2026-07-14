'use strict'

const uniID = require('uni-id-common')
const deepseek = require('deepseek-client')
const db = uniCloud.database()
const dbCmd = db.command
const dbHistory = db.collection('wtdb-business-assess-history')
const dbRecord = db.collection('wtdb-business-assess-record')
const dbTask = db.collection('wtdb-report-tasks')

const ACTIVE_STATUSES = ['pending', 'processing', 'waiting_merge', 'pending_save']

async function getCurrentUser(event, context) {
	const tokenRes = await uniID.createInstance({ context }).checkToken(event.uniIdToken)
	if (!tokenRes || tokenRes.errCode || !tokenRes.uid) {
		return null
	}
	return tokenRes.uid
}

async function getActiveTask(recordId, assessorId) {
	const res = await dbTask.where({
		recordId,
		assessorId,
		status: dbCmd.in(ACTIVE_STATUSES)
	})
		.orderBy('updateTime', 'desc')
		.limit(1)
		.get()

	return res.data?.[0] || null
}

function buildAssessmentResult(modulesStatus, historyRecords, confirmToGenerateReport) {
	const result = {
		completed: [],
		inProgress: [],
		notStarted: []
	}
	const completedSectionList = []

	for (const module of modulesStatus) {
		const historyRecord = historyRecords.find(item => item.sectionId === module.sectionId)
		if (!historyRecord) {
			result.notStarted.push(module)
			continue
		}

		if (!historyRecord.hasCompleted) {
			result.inProgress.push(module)
			continue
		}

		result.completed.push(module)
		if (confirmToGenerateReport) {
			completedSectionList.push({
				...historyRecord,
				sectionName: module.sectionName
			})
		}
	}

	return { result, completedSectionList }
}

function buildTaskResponse(result, taskId, status, message) {
	return {
		...result,
		taskId,
		status,
		provider: 'deepseek-official',
		model: deepseek.DEFAULT_MODEL,
		message
	}
}

exports.main = async (event = {}, context) => {
	try {
		const assessorId = await getCurrentUser(event, context)
		if (!assessorId) {
			return {
				code: 401,
				message: '登录状态已失效，请重新登录'
			}
		}

		const { recordId, assessmentId, childId, confirmToGenerateReport = false } = event
		if (!recordId || !assessmentId || !childId) {
			return {
				code: 400,
				message: '缺少必要参数: recordId, assessmentId, childId'
			}
		}

		const query = { recordId, assessmentId, assessorId, childId }
		const [historyRes, recordRes] = await Promise.all([
			dbHistory.where(query).get(),
			dbRecord.where(query).limit(1).get()
		])

		if (!recordRes.data?.length) {
			return {
				code: 404,
				data: null,
				message: '未找到评估记录'
			}
		}

		const { result, completedSectionList } = buildAssessmentResult(
			recordRes.data[0].modulesStatus || [],
			historyRes.data || [],
			confirmToGenerateReport
		)

		if (!confirmToGenerateReport) {
			return {
				code: 200,
				data: result,
				message: '查询成功'
			}
		}

		if (!completedSectionList.length) {
			return {
				code: 400,
				data: result,
				message: '没有已完成的评估模块，无法生成报告'
			}
		}

		const activeTask = await getActiveTask(recordId, assessorId)
		if (activeTask) {
			return {
				code: 200,
				data: buildTaskResponse(
					result,
					activeTask.taskId,
					activeTask.status,
					'已有报告任务正在执行'
				),
				message: '已有报告任务正在执行'
			}
		}

		const now = Date.now()
		const taskId = `task_${childId}_${now}`
		await dbTask.add({
			taskId,
			status: 'pending',
			progress: 0,
			childId,
			childName: completedSectionList[0]?.childName || '',
			recordId,
			assessmentId,
			assessorId,
			totalSections: completedSectionList.length,
			completedSections: 0,
			createTime: now,
			updateTime: now,
			logs: [`${now}: 小程序创建报告任务，等待按需执行`],
			originalParams: {
				completedSectionList,
				query
			},
			metadata: {
				provider: 'deepseek-official',
				model: deepseek.DEFAULT_MODEL,
				source: 'mini-program-submit'
			}
		})

		return {
			code: 200,
			data: buildTaskResponse(result, taskId, 'pending', '报告任务已创建'),
			message: '报告任务已创建'
		}
	} catch (error) {
		console.error('创建报告任务失败:', error)
		return {
			code: 500,
			message: `创建报告任务失败: ${error.message}`
		}
	}
}
