'use strict'

const aiModel = require('deepseek-client')
const subjectAuth = require('business-subject-auth')
const db = uniCloud.database()
const dbCmd = db.command
const dbHistory = db.collection('wtdb-business-assess-history')
const dbTask = db.collection('wtdb-report-tasks')
const dbReport = db.collection('wtdb-business-assess-report')
const dbRecord = db.collection('wtdb-business-assess-record')

const ACTIVE_STATUSES = ['pending', 'processing', 'waiting_merge', 'pending_save']

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

async function getLatestTask(recordId, assessorId) {
	const res = await dbTask.where({ recordId, assessorId })
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

function buildTaskResponse(result, taskId, status, message, modelInfo = {}) {
	return {
		...result,
		taskId,
		status,
		provider: modelInfo.provider || 'deepseek-official',
		model: modelInfo.model || aiModel.DEFAULT_MODEL,
		message
	}
}

function countPendingPrefillReviews(historyRecords = []) {
	let pending = 0
	for (const history of historyRecords || []) {
		for (const group of history.assessmentRecords || []) {
			for (const question of group.questions || []) {
				if (question.prefilled && !['confirmed', 'changed'].includes(question.reviewStatus)) {
					pending++
				}
			}
		}
	}
	return pending
}

exports.main = async (event = {}, context) => {
	try {
		const { recordId, assessmentId, childId, confirmToGenerateReport = false } = event
		if (!recordId || !assessmentId || !childId) {
			return {
				code: 400,
				message: '缺少必要参数: recordId, assessmentId, childId'
			}
		}
		const scope = await subjectAuth.getAuthScope(event, context)
		const ownedRecord = await subjectAuth.assertOwnedAssessmentRecord(scope, { recordId, assessmentId, childId })
		if (ownedRecord.isAbandoned === true) {
			throw new subjectAuth.AuthError(409, '该评估已重新开始，原进度不能生成报告')
		}
		const assessorId = ownedRecord.assessorId

		const query = { recordId, assessmentId, assessorId, childId }
		const historyRes = await dbHistory.where(query).get()
		const pendingPrefillReviews = countPendingPrefillReviews(historyRes.data || [])
		if (confirmToGenerateReport && pendingPrefillReviews > 0) {
			return {
				code: 409,
				message: `还有${pendingPrefillReviews}项历史预填答案待复核，完成确认或修改后才能生成报告`
			}
		}

		const { result, completedSectionList } = buildAssessmentResult(
			ownedRecord.modulesStatus || [],
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

		const existingReport = await dbReport.where({ recordId }).limit(1).get()
		if (existingReport.data?.length || ownedRecord.reportStatus === 'completed' || ownedRecord.reportId) {
			return {
				code: 409,
				data: result,
				message: '该评估已生成报告；如需更新，请创建一次新的评估'
			}
		}

		const activeTask = await getActiveTask(recordId, assessorId)
		if (activeTask) {
			const activeTaskModel = activeTask.metadata || {}
			return {
				code: 200,
				data: buildTaskResponse(
					result,
					activeTask.taskId,
					activeTask.status,
					'已有报告任务正在执行',
					activeTaskModel
				),
				message: '已有报告任务正在执行'
			}
		}

		const latestTask = await getLatestTask(recordId, assessorId)
		if (latestTask?.status === 'failed') {
			return {
				code: 409,
				data: result,
				message: '本次报告生成任务失败，请由后台重试原任务，不要重复提交分析'
			}
		}
		if (latestTask?.status === 'completed') {
			return {
				code: 409,
				data: result,
				message: '本次报告任务已完成但报告状态异常，请联系管理员核查'
			}
		}

		const now = Date.now()
		const taskId = `task_${childId}_${now}`
		const modelInfo = await aiModel.getActiveModelInfo()
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
				providerId: modelInfo.id,
				provider: modelInfo.provider,
				model: modelInfo.model,
				source: 'mini-program-submit',
				runAuthorizedBy: scope.uid
			}
		})
		try {
			await dbRecord.doc(ownedRecord._id).update({
				assessmentStatus: 'completed',
				reportStatus: 'generating',
				updateTime: now
			})
		} catch (statusError) {
			console.warn('更新评估报告状态失败:', statusError)
		}

		return {
			code: 200,
			data: buildTaskResponse(result, taskId, 'pending', '报告任务已创建', modelInfo),
			message: '报告任务已创建'
		}
	} catch (error) {
		console.error('创建报告任务失败:', error)
		return subjectAuth.toErrorResponse(error, '创建报告任务失败')
	}
}
