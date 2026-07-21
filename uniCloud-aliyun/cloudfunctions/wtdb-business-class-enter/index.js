'use strict'

// 保留旧云函数名作为兼容入口，所有入班都必须进入审批流程。
exports.main = async (event = {}) => {
	try {
		const invocation = await uniCloud.callFunction({
			name: 'wtdb-class-approval',
			data: {
				action: 'submit',
				classId: event.classId || event.class_id,
				classCode: event.classCode || event.code,
				requestedRole: event.requestedRole || event.role,
				nickname: event.nickname,
				childName: event.childName || event.child_name,
				childGender: event.childGender || event.child_gender,
				childBirthdate: event.childBirthdate || event.child_birthdate,
				relationship: event.relationship,
				uniIdToken: event.uniIdToken
			}
		})
		const result = invocation.result || invocation
		if (result && result.code === 200) {
			return {
				...result,
				code: 202,
				msg: result.msg || '申请已提交，请等待审批'
			}
		}
		return result || { code: 500, msg: '申请提交失败' }
	} catch (error) {
		console.error('提交入班申请失败:', error)
		return { code: 500, msg: `申请提交失败: ${error.message}` }
	}
}
