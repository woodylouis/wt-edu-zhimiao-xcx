'use strict'

const db = uniCloud.database()
const reports = db.collection('wtdb-business-assess-report')
const subjectAuth = require('business-subject-auth')
const planService = require('intervention-plan-service')

async function findReport(reportId) {
	let result = await reports.where({ reportId }).limit(1).get()
	if (result.data?.length) return result.data[0]
	result = await reports.doc(reportId).get()
	return result.data?.[0] || null
}

exports.main = async (event = {}, context) => {
	const reportId = String(event.reportId || '').trim()
	if (!reportId || reportId.length > 128) return { code: 400, msg: '缺少有效的报告ID' }

	try {
		const scope = await subjectAuth.getAuthScope(event, context)
		const report = await findReport(reportId)
		if (!report) return { code: 404, msg: '报告不存在' }
		const action = String(event.action || 'start')
		if (action === 'status') {
			await subjectAuth.assertChildReadAccess(scope, report.childId || report.child_id)
		} else {
			await subjectAuth.assertChildAssessmentAccess(scope, report.childId || report.child_id)
		}
		if (action === 'status') {
			const task = event.taskId
				? await planService.findTask(String(event.taskId))
				: await planService.findLatestTask(report._id)
			if (task && planService.compactId(task.reportDocumentId) !== planService.compactId(report._id)) {
				return { code: 404, msg: '训练计划任务不存在' }
			}
			await planService.reconcileTimeout(task)
			const completedTaskMatchesReport = task?.status !== 'completed' ||
				Number(task.sourceAnalysisRevision || 1) === Number(report.analysisRevision || 1)
			const visibleTask = completedTaskMatchesReport ? task : null
			return {
				code: 200,
				msg: 'success',
				data: {
					task: planService.publicTask(visibleTask),
					plan: visibleTask?.status === 'completed' ? (report.interventionPlan || null) : null
				}
			}
		}

		if (action === 'update-manual') {
			if (!report.interventionPlan) {
				throw new planService.TaskError('PLAN_NOT_FOUND', '训练计划尚未生成，无法手动调整', 404)
			}
			const sourceRevision = Number(report.interventionPlan.sourceAnalysisRevision || 1)
			const reportRevision = Number(report.analysisRevision || 1)
			if (report.interventionPlanStatus === 'stale' || sourceRevision !== reportRevision) {
				throw new planService.TaskError('PLAN_STALE', '报告分析已更新，请先重新生成训练计划再手动调整', 409)
			}
			const latestTask = await planService.findLatestTask(report._id)
			await planService.reconcileTimeout(latestTask)
			if (latestTask && planService.isActiveStatus(latestTask.status)) {
				throw new planService.TaskError('TASK_ALREADY_RUNNING', '训练计划正在重新生成，请完成后再手动调整', 409)
			}
			const expectedManualRevision = Number(event.expectedManualRevision || 0)
			const currentManualRevision = Number(report.interventionPlan.manualRevision || 0)
			if (expectedManualRevision !== currentManualRevision) {
				throw new planService.TaskError('PLAN_UPDATED', '训练计划已被其他老师更新，请刷新页面后重试', 409)
			}
			const now = Date.now()
			const plan = planService.applyManualPlanAdjustments(report.interventionPlan, {
				manualActivities: event.manualActivities,
				excludedDailyPlanKeys: event.excludedDailyPlanKeys,
				adjustedAt: now,
				adjustedBy: scope.uid
			})
			await reports.doc(report._id).update({
				interventionPlan: plan,
				interventionPlanStatus: 'completed',
				interventionPlanUpdatedAt: now,
				updateTime: now
			})
			return { code: 200, msg: '训练计划调整已保存', data: { plan } }
		}

		if (action === 'retry') {
			const task = await planService.findTask(String(event.taskId || ''))
			const retried = await planService.retryTask(task, report)
			return {
				code: 202,
				msg: '任务已重新进入队列',
				data: { task: planService.publicTask(retried) }
			}
		}

		const startDate = String(event.startDate || '').trim()
		const endDate = String(event.endDate || '').trim()
		const range = planService.normalizeDateRange(startDate, endDate)
		const created = await planService.createTask({
			report,
			requestedBy: scope.uid,
			startDate,
			endDate,
			weeksCount: range.weeksCount,
			focusDomains: event.focusDomains,
			forceRegenerate: !!event.forceRegenerate
		})
		if (created.plan) {
			return { code: 200, msg: '计划已存在', data: { plan: created.plan, cached: true } }
		}
		return {
			code: 202,
			msg: created.reused ? '计划正在后台生成' : '训练计划任务已创建',
			data: {
				task: planService.publicTask(created.task),
				reused: created.reused
			}
		}
	} catch (error) {
		console.error('提交训练计划任务失败:', error)
		if (error instanceof planService.TaskError) {
			return { code: error.statusCode || 400, msg: error.message, errorCode: error.code }
		}
		if (/日期|完整周|结束日期|计划周期|干预方向|训练活动|手动调整|移出计划/.test(error?.message || '')) {
			return { code: 400, msg: error.message }
		}
		return subjectAuth.toErrorResponse(error, '提交训练计划任务失败')
	}
}
