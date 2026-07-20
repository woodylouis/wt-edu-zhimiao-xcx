'use strict';
const uniID = require('uni-id-common')
const db = uniCloud.database()

function compactId(value) {
	if (!value) return ''
	if (typeof value === 'string') return value
	if (value.$oid) return value.$oid
	if (value._id) return compactId(value._id)
	return String(value)
}

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
					head_teacher_user_id: 1,
					teacherName: 1,
					class_creator_teacher: 1
				},
				schoolInfo: {
					school_id: 1,
					name: 1,
					latitude: 1,
					longitude: 1,
					director_user_id: 1
				}
			})
			.end()

		const rows = res.data || []
		const userRes = await db.collection('uni-id-users')
			.where({ _id: payload.uid })
			.field({ nickname: true, mobile: true })
			.limit(1)
			.get()
		const account = userRes.data?.[0] || {}
		const accountNickname = String(account.nickname || '').trim()
		const linkedUserIds = new Set([compactId(payload.uid)])
		const mobile = String(account.mobile || '').trim()
		if (mobile) {
			const linkedRes = await db.collection('uni-id-users')
				.where({ mobile })
				.field({ _id: true })
				.get()
			;(linkedRes.data || []).forEach(user => {
				const userId = compactId(user._id)
				if (userId) linkedUserIds.add(userId)
			})
		}
		const data = rows.map(item => {
			const classInfo = item.classInfo || {}
			const schoolInfo = item.schoolInfo || {}
			const isHeadTeacher = linkedUserIds.has(compactId(classInfo.head_teacher_user_id))
			const isSchoolDirector = linkedUserIds.has(compactId(schoolInfo.director_user_id))
			const { head_teacher_user_id, ...safeClassInfo } = classInfo
			const { director_user_id, ...safeSchoolInfo } = schoolInfo
			return {
				...item,
				nickname: accountNickname || String(item.nickname || '').trim(),
				isHeadTeacher,
				isSchoolDirector,
				classInfo: {
					...safeClassInfo,
					isHeadTeacher
				},
				schoolInfo: {
					...safeSchoolInfo,
					isSchoolDirector
				}
			}
		})

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
