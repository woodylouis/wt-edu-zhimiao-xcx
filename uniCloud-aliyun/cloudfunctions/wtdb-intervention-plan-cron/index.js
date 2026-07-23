'use strict'

const planService = require('intervention-plan-service')

exports.main = async () => {
	try {
		const results = await planService.processPendingTasks({ limit: 1, maxRunMs: 8 * 60 * 1000 })
		return {
			code: 200,
			msg: '训练计划后台巡检完成',
			data: {
				processed: results.length,
				tasks: results.map(item => planService.publicTask(item.task))
			}
		}
	} catch (error) {
		console.error('训练计划后台巡检失败:', error)
		return { code: 500, msg: error.message || '训练计划后台巡检失败' }
	}
}
