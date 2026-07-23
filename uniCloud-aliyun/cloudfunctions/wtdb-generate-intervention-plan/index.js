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
		if (/日期|完整周|结束日期|计划周期|干预方向/.test(error?.message || '')) {
			return { code: 400, msg: error.message }
		}
		return subjectAuth.toErrorResponse(error, '提交训练计划任务失败')
	}
}
