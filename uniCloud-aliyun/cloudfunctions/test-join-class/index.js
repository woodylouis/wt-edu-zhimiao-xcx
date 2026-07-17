'use strict'

// 禁用可从客户端直接写入班级成员的历史测试入口。
exports.main = async () => ({
	code: 403,
	msg: '该测试入口已禁用'
})
