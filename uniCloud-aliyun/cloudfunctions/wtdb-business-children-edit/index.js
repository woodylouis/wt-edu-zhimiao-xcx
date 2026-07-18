'use strict'

let subjectAuth
try {
	subjectAuth = require('business-subject-auth')
} catch (_) {
	subjectAuth = require('../common/business-subject-auth')
}

const db = uniCloud.database()

function clean(value, maxLength) {
	return String(value == null ? '' : value).trim().slice(0, maxLength)
}

function buildAge(birthdate) {
	const birth = new Date(birthdate)
	const today = new Date()
	let years = today.getFullYear() - birth.getFullYear()
	let months = today.getMonth() - birth.getMonth()
	if (today.getDate() < birth.getDate()) months--
	if (months < 0) {
		years--
		months += 12
	}
	return { age: `${years}岁${months}个月`, ageInt: years }
}

exports.main = async (event = {}, context) => {
	try {
		const scope = await subjectAuth.getAuthScope(event, context)
		const input = event.submitChildrenData || {}
		const classId = subjectAuth.compactId(input.class_id || event.classId)
		await subjectAuth.assertClassTeacherAccess(scope, classId)

		const name = clean(input.name, 40)
		const birthdate = Number(input.birthdate)
		if (!name) throw new subjectAuth.AuthError(400, '请填写儿童姓名')
		if (!Number.isFinite(birthdate) || birthdate <= 0 || birthdate > Date.now()) {
			throw new subjectAuth.AuthError(400, '出生日期不正确')
		}

		const calculatedAge = buildAge(birthdate)
		const childData = {
			name,
			class_id: classId,
			birthdate,
			gender: clean(input.gender || 'unknown', 20),
			avatar: clean(input.avatar, 500),
			age: calculatedAge.age,
			ageInt: calculatedAge.ageInt,
			created_by: scope.uid,
			create_time: Date.now(),
			update_time: Date.now()
		}
		const result = await db.collection('wtdb-business-children').add(childData)
		return {
			code: 200,
			message: '儿童数据创建成功',
			data: { child_id: result.id }
		}
	} catch (error) {
		console.error('创建儿童失败:', error)
		return subjectAuth.toErrorResponse(error, '创建儿童失败')
	}
}
