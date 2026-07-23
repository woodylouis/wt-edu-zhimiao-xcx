'use strict'

const subjectAuth = require('business-subject-auth')
const planService = require('intervention-plan-service')

exports.main = async (event = {}, context) => {
	const taskId = String(event.taskId || '').trim()
	if (!taskId) return { code: 400, msg: '缺少训练计划任务ID' }

	try {
		const scope = await subjectAuth.getAuthScope(event, context)
		const task = await planService.findTask(taskId)
		if (!task) return { code: 404, msg: '训练计划任务不存在' }
		const report = await planService.findReportByDocumentId(task.reportDocumentId)
		if (!report) return { code: 404, msg: '关联报告不存在' }
		await subjectAuth.assertChildAssessmentAccess(scope, report.childId || report.child_id)

		const result = await planService.processTask(taskId)
		return {
			code: 200,
			msg: result.busy ? '任务已由其他后台进程处理' : '任务处理已结束或等待下一轮继续',
			data: {
				task: planService.publicTask(result.task),
				plan: result.plan || null,
				busy: !!result.busy,
				yielded: !!result.yielded
			}
		}
	} catch (error) {
		console.error('执行训练计划任务失败:', error)
		if (error instanceof planService.TaskError) {
			return { code: error.statusCode || 400, msg: error.message, errorCode: error.code }
		}
		return subjectAuth.toErrorResponse(error, '执行训练计划任务失败')
	}
}
