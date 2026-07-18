'use strict'

// 旧版入口曾允许客户端直接写入整份报告，生产环境禁用。
exports.main = async () => ({
	code: 410,
	message: '旧版报告写入入口已禁用，请使用服务端报告任务流程'
})
