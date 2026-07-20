'use strict'

let businessAuth
try {
	businessAuth = require('business-auth')
} catch (error) {
	businessAuth = require('../common/business-auth')
}

const db = uniCloud.database()
const dbCmd = db.command
const classCollection = db.collection('wtdb-business-class-list')
const schoolCollection = db.collection('wtdb-business-school-list')
const memberCollection = db.collection('wtdb-business-class-member')
const userCollection = db.collection('uni-id-users')

function clean(value, maxLength = 100) {
	return String(value || '').trim().slice(0, maxLength)
}

function generateClassCode() {
	return Math.floor(100000 + Math.random() * 900000).toString()
}

async function getUserNickname(userId) {
	const userRes = await userCollection
		.where({ _id: userId })
		.field({ nickname: true })
		.limit(1)
		.get()
	const nickname = clean(userRes.data && userRes.data[0] && userRes.data[0].nickname, 30)
	if (!nickname) throw new businessAuth.AuthError(400, '请先在个人资料中设置昵称')
	return nickname
}

async function resolveSchool(event, scope) {
	let schoolId = clean(event.school_id || event.schoolId, 60)
	if (!schoolId && !scope.isGlobalBusinessAdmin && scope.schoolIds.length === 1) {
		schoolId = scope.schoolIds[0]
	}
	if (!schoolId) {
		throw new businessAuth.AuthError(400, '请选择班级所属学校')
	}

	const schoolRes = await schoolCollection.where({ school_id: schoolId }).limit(1).get()
	const school = schoolRes.data && schoolRes.data[0]
	if (!school) throw new businessAuth.AuthError(404, '学校不存在')
	businessAuth.assertSchoolAccess(scope, school, '无权在该学校创建班级')
	return school
}

async function assertHeadTeacherCandidate(userId, schoolId) {
	const userRes = await userCollection.where({ _id: userId }).limit(1).get()
	if (!userRes.data || !userRes.data[0]) {
		throw new businessAuth.AuthError(400, '选择的班主任账号不存在')
	}

	const memberRes = await memberCollection
		.where({ user_id: userId, role: 'teacher' })
		.field({ class_id: true })
		.limit(100)
		.get()
	const classIds = (memberRes.data || [])
		.map(item => businessAuth.compactId(item.class_id))
		.filter(Boolean)
	if (!classIds.length) {
		throw new businessAuth.AuthError(400, '班主任必须是该学校已入班的老师')
	}

	const classRes = await classCollection
		.where({ _id: dbCmd.in(classIds), school_id: schoolId })
		.field({ _id: true })
		.limit(1)
		.get()
	if (!classRes.data || !classRes.data[0]) {
		throw new businessAuth.AuthError(400, '班主任必须是该学校已入班的老师')
	}
}

exports.main = async (event = {}, context) => {
	let createdClassId = ''
	try {
		const scope = await businessAuth.getBusinessAuthScope(event, context)
		const school = await resolveSchool(event, scope)
		const nickname = clean(event.nickname, 40)
		const year = clean(event.year || new Date().getFullYear(), 4)
		const headTeacherUserId = businessAuth.compactId(event.head_teacher_user_id)
		if (!nickname) throw new businessAuth.AuthError(400, '请填写班级名称')
		if (!/^\d{4}$/.test(year)) throw new businessAuth.AuthError(400, '年份应为4位数字')
		if (headTeacherUserId) await assertHeadTeacherCandidate(headTeacherUserId, school.school_id)
		const creatorNickname = await getUserNickname(scope.uid)

		const classData = {
			school_id: school.school_id,
			year,
			section: clean(event.section, 20),
			grade: clean(event.grade, 20),
			class: clean(event.class, 20),
			nickname,
			description: clean(event.description, 200),
			remark: clean(event.remark, 200),
			teacherName: creatorNickname,
			class_creator_teacher: creatorNickname,
			created_by: scope.uid,
			create_time: Date.now(),
			code: generateClassCode()
		}
		if (headTeacherUserId) classData.head_teacher_user_id = headTeacherUserId
		const addRes = await classCollection.add(classData)
		createdClassId = addRes.id

		const joinClass = require('wtdb-business-join-class')
		await joinClass({
			classId: createdClassId,
			userId: scope.uid,
			nickname: creatorNickname,
			role: 'teacher'
		})
		if (headTeacherUserId && headTeacherUserId !== scope.uid) {
			const headTeacherNickname = await getUserNickname(headTeacherUserId)
			await joinClass({
				classId: createdClassId,
				userId: headTeacherUserId,
				nickname: headTeacherNickname,
				role: 'teacher'
			})
		}

		return {
			code: 200,
			data: {
				classId: createdClassId,
				classCode: classData.code,
				year: classData.year,
				nickname: creatorNickname,
				joinStatus: 'success'
			},
			msg: '班级创建成功'
		}
	} catch (error) {
		if (createdClassId) {
			try {
				await memberCollection.where({ class_id: createdClassId }).remove()
			} catch (rollbackError) {
				console.error('班级成员关系回滚失败:', rollbackError)
			}
			try {
				await classCollection.doc(createdClassId).remove()
			} catch (rollbackError) {
				console.error('班级记录回滚失败:', rollbackError)
			}
		}
		console.error('班级创建失败:', error)
		return businessAuth.toErrorResponse(error, '班级创建失败')
	}
}
