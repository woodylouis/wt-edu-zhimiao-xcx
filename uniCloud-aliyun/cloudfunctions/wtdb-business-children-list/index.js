'use strict'

let subjectAuth
try {
	subjectAuth = require('business-subject-auth')
} catch (_) {
	subjectAuth = require('../common/business-subject-auth')
}

const db = uniCloud.database()

exports.main = async (event = {}, context) => {
	try {
		const scope = await subjectAuth.getAuthScope(event, context)
		const classId = subjectAuth.compactId(event.classId || event.class_id)
		if (!classId) throw new subjectAuth.AuthError(400, '缺少班级ID')
		await subjectAuth.assertClassTeacherAccess(scope, classId)

		const keyword = String(event.keyword || '').trim().slice(0, 50)
		const where = { class_id: classId }
		if (keyword) {
			const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
			where.name = new db.RegExp({ regexp: escapedKeyword, options: 'i' })
		}

		const page = Math.max(1, Number(event.page) || 1)
		const pageSize = Math.min(200, Math.max(1, Number(event.pageSize) || 200))
		const res = await db.collection('wtdb-business-children')
			.where(where)
			.field({
				_id: true,
				name: true,
				gender: true,
				birthdate: true,
				age: true,
				ageInt: true,
				formatBirthdate: true,
				class_id: true,
				avatar: true
			})
			.orderBy('name', 'asc')
			.skip((page - 1) * pageSize)
			.limit(pageSize)
			.get()

		return { code: 200, data: res.data || [] }
	} catch (error) {
		console.error('查询儿童列表失败:', error)
		return subjectAuth.toErrorResponse(error, '查询失败')
	}
}
