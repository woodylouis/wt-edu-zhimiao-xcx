'use strict'

const wechatSubscribe = require('wechat-subscribe-service')

exports.main = async () => {
	const summary = await wechatSubscribe.processDueReminderGrants(200)
	console.log('每日未完成评估提醒处理完成:', summary)
	return { code: 200, data: summary }
}
