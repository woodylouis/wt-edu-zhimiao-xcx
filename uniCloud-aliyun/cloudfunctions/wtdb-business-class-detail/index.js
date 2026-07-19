'use strict'

const db = uniCloud.database()
const uniID = require('uni-id-common')

exports.main = async (event = {}, context) => {
	let tokenRes
	try {
		tokenRes = await uniID.createInstance({ context }).checkToken(event.uniIdToken)
	} catch (error) {
		return { code: 401, msg: '登录状态已失效，请重新登录' }
	}
	if (!tokenRes || tokenRes.errCode || !tokenRes.uid) {
		return { code: 401, msg: '登录状态已失效，请重新登录' }
	}

	try {
		const classCode = String(event.code || '').trim()
		if (!classCode) return { code: 400, msg: '请输入班级码' }

		const res = await db.collection('wtdb-business-class-list')
			.where({ code: classCode })
			.field({
				_id: true,
				code: true,
				year: true,
				nickname: true,
				teacherName: true,
				class_creator_teacher: true,
				school_id: true,
				section: true,
				grade: true,
				class: true
			})
			.limit(1)
			.get()
		if (!res.data || !res.data[0]) {
			return { code: 404, msg: '未找到该班级，请检查班级码', data: null }
		}
		return { code: 200, msg: '查询成功', data: res.data[0] }
	} catch (error) {
		console.error('查询班级失败:', error)
		return { code: 500, msg: '班级查询失败，请稍后重试' }
	}
}
