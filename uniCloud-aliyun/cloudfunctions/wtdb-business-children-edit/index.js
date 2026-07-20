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

function safeChild(child = {}) {
	return {
		_id: subjectAuth.compactId(child._id),
		name: child.name || '',
		class_id: subjectAuth.compactId(child.class_id),
		birthdate: child.birthdate || null,
		gender: child.gender || '',
		avatar: child.avatar || '',
		age: child.age || '',
		ageInt: Number(child.ageInt) || 0,
		update_time: child.update_time || null
	}
}

function validateChildInput(input = {}) {
	const name = clean(input.name, 40)
	const birthdate = Number(input.birthdate)
	if (!name) throw new subjectAuth.AuthError(400, '请填写儿童姓名')
	if (!Number.isFinite(birthdate) || birthdate <= 0 || birthdate > Date.now()) {
		throw new subjectAuth.AuthError(400, '出生日期不正确')
	}
	const gender = clean(input.gender, 20)
	if (!gender) throw new subjectAuth.AuthError(400, '请选择儿童性别')
	return { name, birthdate, gender }
}

exports.main = async (event = {}, context) => {
	try {
		const scope = await subjectAuth.getAuthScope(event, context)
		const action = event.action || (event.childId || event.child_id ? 'update' : 'create')
		const childId = subjectAuth.compactId(event.childId || event.child_id)

		if (action === 'detail') {
			if (!childId) throw new subjectAuth.AuthError(400, '缺少学生ID')
			const { child } = await subjectAuth.assertChildAssessmentAccess(scope, childId)
			return { code: 200, message: '查询成功', data: safeChild(child) }
		}

		const input = event.submitChildrenData || {}
		const { name, birthdate, gender } = validateChildInput(input)
		const calculatedAge = buildAge(birthdate)

		if (action === 'update') {
			if (!childId) throw new subjectAuth.AuthError(400, '缺少学生ID')
			const { child } = await subjectAuth.assertChildAssessmentAccess(scope, childId)
			const childData = {
				name,
				birthdate,
				gender,
				avatar: input.avatar === undefined ? child.avatar || '' : clean(input.avatar, 1000),
				age: calculatedAge.age,
				ageInt: calculatedAge.ageInt,
				update_time: Date.now()
			}
			await db.collection('wtdb-business-children').doc(childId).update(childData)
			return {
				code: 200,
				message: '学生资料更新成功',
				data: safeChild({ ...child, ...childData, _id: childId })
			}
		}

		if (action !== 'create') throw new subjectAuth.AuthError(400, '不支持的操作')
		const classId = subjectAuth.compactId(input.class_id || event.classId)
		await subjectAuth.assertClassTeacherAccess(scope, classId)
		const childData = {
			name,
			class_id: classId,
			birthdate,
			gender,
			avatar: clean(input.avatar, 1000),
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
			data: { child_id: result.id, ...safeChild({ ...childData, _id: result.id }) }
		}
	} catch (error) {
		console.error('学生资料处理失败:', error)
		return subjectAuth.toErrorResponse(error, '学生资料处理失败')
	}
}
