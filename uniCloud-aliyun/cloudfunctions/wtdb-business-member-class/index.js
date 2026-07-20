'use strict';
const uniID = require('uni-id-common')
let businessPerson
try {
	businessPerson = require('business-person')
} catch (error) {
	businessPerson = require('../common/business-person')
}
const db = uniCloud.database()

exports.main = async (event, context) => {
	const uniIdInstance = uniID.createInstance({ context })
	const payload = await uniIdInstance.checkToken(event.uniIdToken)

	if (payload.code) {
		return payload // 返回token校验结果
	}

	try {
		const res = await db.collection('wtdb-business-class-member')
			.aggregate()
			.match({
				user_id: payload.uid // 根据当前用户ID筛选
			})
			.lookup({
				from: 'wtdb-business-class-list',
				localField: 'class_id',
				foreignField: '_id',
				as: 'classInfo'
			})
			.unwind('$classInfo')
			// 关联学校表获取学校信息
			.lookup({
				from: 'wtdb-business-school-list',
				localField: 'classInfo.school_id',
				foreignField: 'school_id',
				as: 'schoolInfo'
			})
			.unwind({
				path: '$schoolInfo',
				preserveNullAndEmptyArrays: true // 保留没有学校信息的班级
			})
			.project({
				_id: 1,
				role: 1,
				person_id: 1,
				display_name_override: 1,
				relationship: 1,
				join_time: 1,
				nickname: 1,
				classInfo: {
					_id: 1,
					nickname: 1,
					code: 1,
					section: 1,
					grade: 1,
					class: 1,
					school_id: 1,
					teacherName: 1,
					class_creator_teacher: 1
				},
				schoolInfo: {
					school_id: 1,
					name: 1,
					latitude: 1,
					longitude: 1
				}
			})
			.end()

		const rows = res.data || []
		const legacyTeacherName = rows
			.filter(item => item.role === 'teacher')
			.map(item => String(item.nickname || '').trim())
			.find(Boolean) || ''
		let personProfile = await businessPerson.resolveProfile(payload.uid, legacyTeacherName)
		if (!personProfile.personId) {
			personProfile = await businessPerson.ensurePersonForUser(payload.uid, {
				displayName: legacyTeacherName,
				nameSource: legacyTeacherName ? 'legacy_class_member' : 'legacy_account'
			})
		}
		await db.collection('wtdb-business-class-member')
			.where({ user_id: payload.uid, role: 'teacher' })
			.update({ person_id: personProfile.personId })
		const data = rows.map(item => ({
			...item,
			personId: item.role === 'teacher' ? personProfile.personId : '',
			displayName: item.role === 'teacher'
				? String(item.display_name_override || personProfile.displayName || item.nickname || '').trim()
				: String(item.display_name_override || item.nickname || '').trim()
		}))

		return {
			code: 200,
			message: '查询成功',
			data
		}
	} catch (e) {
		console.error('云函数执行失败:', e)
		return {
			code: 500,
			message: '服务器内部错误',
			data: null
		}
	}
};
