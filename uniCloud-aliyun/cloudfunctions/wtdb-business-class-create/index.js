'use strict'

let businessAuth
try {
	businessAuth = require('business-auth')
} catch (error) {
	businessAuth = require('../common/business-auth')
}

const db = uniCloud.database()
const classCollection = db.collection('wtdb-business-class-list')
const schoolCollection = db.collection('wtdb-business-school-list')

function clean(value, maxLength = 100) {
	return String(value || '').trim().slice(0, maxLength)
}

function generateClassCode() {
	return Math.floor(100000 + Math.random() * 900000).toString()
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

exports.main = async (event = {}, context) => {
	let createdClassId = ''
	try {
		const scope = await businessAuth.getBusinessAuthScope(event, context)
		const school = await resolveSchool(event, scope)
		const nickname = clean(event.nickname, 40)
		if (!nickname) throw new businessAuth.AuthError(400, '请填写班级名称')

		const classData = {
			school_id: school.school_id,
			section: clean(event.section, 20),
			grade: clean(event.grade, 20),
			class: clean(event.class, 20),
			nickname,
			description: clean(event.description, 200),
			remark: clean(event.remark, 200),
			teacherName: clean(event.teacherName, 30),
			class_creator_teacher: clean(event.teacherName || event.class_creator_teacher, 30),
			created_by: scope.uid,
			create_time: Date.now(),
			code: generateClassCode()
		}
		const addRes = await classCollection.add(classData)
		createdClassId = addRes.id

		const joinClass = require('wtdb-business-join-class')
		await joinClass({
			classId: createdClassId,
			userId: scope.uid,
			role: 'teacher'
		})

		return {
			code: 200,
			data: {
				classId: createdClassId,
				classCode: classData.code,
				joinStatus: 'success'
			},
			msg: '班级创建成功'
		}
	} catch (error) {
		if (createdClassId) {
			try {
				await classCollection.doc(createdClassId).remove()
			} catch (rollbackError) {
				console.error('班级创建回滚失败:', rollbackError)
			}
		}
		console.error('班级创建失败:', error)
		return businessAuth.toErrorResponse(error, '班级创建失败')
	}
}
