'use strict'

let businessAuth
try {
	businessAuth = require('business-auth')
} catch (error) {
	businessAuth = require('../common/business-auth')
}

const db = uniCloud.database()
const dbCmd = db.command
const MEMBER_COLLECTION = 'wtdb-business-class-member'
const CLASS_COLLECTION = 'wtdb-business-class-list'
const SCHOOL_COLLECTION = 'wtdb-business-school-list'
const USER_COLLECTION = 'uni-id-users'
const ACTION_LOG_COLLECTION = 'wtdb-business-teacher-action-log'
const EMPTY_ID = '__no_accessible_teacher_class__'
const QUERY_BATCH_SIZE = 500

function clean(value, maxLength = 100) {
	return String(value || '').trim().slice(0, maxLength)
}

function throwBusinessError(code, message) {
	throw new businessAuth.AuthError(code, message)
}

function assertCanManage(scope) {
	if (!scope.isGlobalBusinessAdmin && !scope.schoolIds.length) {
		throwBusinessError(403, '您不是学校负责人，无权管理老师')
	}
}

async function fetchAll(collectionName, where, fields, orderField = '') {
	const result = []
	for (let skip = 0; ; skip += QUERY_BATCH_SIZE) {
		let query = db.collection(collectionName).where(where || {})
		if (fields) query = query.field(fields)
		if (orderField) query = query.orderBy(orderField, 'asc')
		const res = await query.skip(skip).limit(QUERY_BATCH_SIZE).get()
		const rows = res.data || []
		result.push(...rows)
		if (rows.length < QUERY_BATCH_SIZE) break
	}
	return result
}

async function getSchoolByBusinessId(schoolId, source = db) {
	const res = await source.collection(SCHOOL_COLLECTION)
		.where({ school_id: schoolId })
		.limit(1)
		.get()
	const school = res.data && res.data[0]
	if (!school) throwBusinessError(404, '学校不存在')
	return school
}

async function getClassById(classId, source = db) {
	const res = await source.collection(CLASS_COLLECTION).doc(classId).get()
	const classInfo = res.data && res.data[0]
	if (!classInfo) throwBusinessError(404, '班级不存在')
	if (!classInfo.school_id) throwBusinessError(409, '班级尚未关联学校')
	return classInfo
}

async function getAvailableSchools(scope) {
	if (!scope.isGlobalBusinessAdmin) return scope.schools
	return fetchAll(
		SCHOOL_COLLECTION,
		{},
		{ _id: true, school_id: true, name: true, director_user_id: true },
		'name'
	)
}

async function getClassesForScope(scope, requestedSchoolId = '', requestedClassId = '') {
	assertCanManage(scope)

	if (requestedClassId) {
		const classInfo = await getClassById(requestedClassId)
		const school = await getSchoolByBusinessId(classInfo.school_id)
		businessAuth.assertSchoolAccess(scope, school, '无权管理该班级的老师')
		if (requestedSchoolId && requestedSchoolId !== classInfo.school_id) {
			throwBusinessError(400, '学校与班级信息不匹配')
		}
		return [classInfo]
	}

	let schoolIds
	if (requestedSchoolId) {
		const school = await getSchoolByBusinessId(requestedSchoolId)
		businessAuth.assertSchoolAccess(scope, school, '无权管理该学校的老师')
		schoolIds = [requestedSchoolId]
	} else if (scope.isGlobalBusinessAdmin) {
		schoolIds = []
	} else {
		schoolIds = scope.schoolIds
	}

	const where = schoolIds.length ? { school_id: dbCmd.in(schoolIds) } : {}
	return fetchAll(
		CLASS_COLLECTION,
		where,
		{
			_id: true,
			school_id: true,
			code: true,
			nickname: true,
			section: true,
			grade: true,
			class: true,
			head_teacher_user_id: true
		},
		'nickname'
	)
}

function classDisplayName(classInfo) {
	return clean(
		classInfo.nickname || `${classInfo.grade || ''}${classInfo.class || ''}班`,
		60
	) || '未命名班级'
}

function safeClassOptions(classes) {
	return classes.map(item => ({
		classId: businessAuth.compactId(item._id),
		className: classDisplayName(item),
		classCode: item.code || '',
		schoolId: item.school_id
	}))
}

async function buildMemberWhere(classIds, keyword = '') {
	const conditions = [
		{ role: 'teacher' },
		{ class_id: dbCmd.in(classIds.length ? classIds : [EMPTY_ID]) }
	]

	if (keyword) {
		const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		const queryRegExp = new RegExp(escapedKeyword, 'i')
		const userRes = await db.collection(USER_COLLECTION)
			.where(dbCmd.or([
				{ nickname: queryRegExp },
				{ username: queryRegExp },
				{ mobile: queryRegExp }
			]))
			.field({ _id: true })
			.limit(300)
			.get()
		const userIds = (userRes.data || [])
			.map(item => businessAuth.compactId(item._id))
			.filter(Boolean)
		const keywordConditions = [{ nickname: queryRegExp }]
		if (userIds.length) keywordConditions.push({ user_id: dbCmd.in(userIds) })
		conditions.push(dbCmd.or(keywordConditions))
	}

	return dbCmd.and(conditions)
}

async function getSummary(scope) {
	if (!scope.isGlobalBusinessAdmin && !scope.schoolIds.length) {
		return {
			code: 200,
			msg: 'success',
			data: {
				canManage: false,
				scopeType: 'none',
				teacherCount: 0,
				assignmentCount: 0,
				schoolCount: 0,
				classCount: 0,
				schools: [],
				classes: []
			}
		}
	}
	const [schools, classes] = await Promise.all([
		getAvailableSchools(scope),
		getClassesForScope(scope)
	])
	const classIds = classes.map(item => businessAuth.compactId(item._id)).filter(Boolean)
	const where = await buildMemberWhere(classIds)
	const [assignmentRes, teacherRes] = await Promise.all([
		db.collection(MEMBER_COLLECTION).where(where).count(),
		db.collection(MEMBER_COLLECTION)
			.aggregate()
			.match(where)
			.group({ _id: '$user_id' })
			.group({ _id: null, total: { $sum: 1 } })
			.end()
	])
	const teacherCount = teacherRes.data && teacherRes.data[0]
		? Number(teacherRes.data[0].total) || 0
		: 0

	return {
		code: 200,
		msg: 'success',
		data: {
			canManage: true,
			scopeType: scope.isGlobalBusinessAdmin ? 'global' : 'school',
			teacherCount,
			assignmentCount: assignmentRes.total || 0,
			schoolCount: schools.length,
			classCount: classes.length,
			schools: schools.map(item => ({
				schoolId: item.school_id,
				schoolName: item.name || item.school_id
			})),
			classes: safeClassOptions(classes)
		}
	}
}

async function listTeachers(event, scope) {
	const schoolId = clean(event.schoolId || event.school_id, 60)
	const classId = businessAuth.compactId(event.classId || event.class_id)
	const keyword = clean(event.keyword, 50)
	const page = Math.max(1, Number(event.page) || 1)
	const pageSize = Math.min(50, Math.max(1, Number(event.pageSize) || 20))
	const [classes, schools] = await Promise.all([
		getClassesForScope(scope, schoolId, classId),
		getAvailableSchools(scope)
	])
	const classIds = classes.map(item => businessAuth.compactId(item._id)).filter(Boolean)
	const where = await buildMemberWhere(classIds, keyword)
	const [memberRes, countRes] = await Promise.all([
		db.collection(MEMBER_COLLECTION)
			.where(where)
			.orderBy('join_time', 'desc')
			.skip((page - 1) * pageSize)
			.limit(pageSize)
			.get(),
		db.collection(MEMBER_COLLECTION).where(where).count()
	])

	const members = memberRes.data || []
	const userIds = [...new Set(members.map(item => businessAuth.compactId(item.user_id)).filter(Boolean))]
	let users = []
	if (userIds.length) {
		const userRes = await db.collection(USER_COLLECTION)
			.where({ _id: dbCmd.in(userIds) })
			.field({ _id: true, nickname: true, username: true, mobile: true, avatar_file: true })
			.get()
		users = userRes.data || []
	}

	const userMap = new Map(users.map(item => [businessAuth.compactId(item._id), item]))
	const classMap = new Map(classes.map(item => [businessAuth.compactId(item._id), item]))
	const schoolMap = new Map(schools.map(item => [item.school_id, item]))
	const list = members.map(member => {
		const userId = businessAuth.compactId(member.user_id)
		const classInfo = classMap.get(businessAuth.compactId(member.class_id)) || {}
		const school = schoolMap.get(classInfo.school_id) || {}
		const user = userMap.get(userId) || {}
		const avatarFile = user.avatar_file || {}
		return {
			memberId: businessAuth.compactId(member._id),
			userId,
			teacherName: clean(member.nickname || user.nickname || user.username, 60) || '未命名老师',
			username: user.username || '',
			mobile: user.mobile || '',
			avatarUrl: typeof avatarFile === 'string' ? avatarFile : (avatarFile.url || ''),
			classId: businessAuth.compactId(classInfo._id),
			className: classDisplayName(classInfo),
			classCode: classInfo.code || '',
			schoolId: classInfo.school_id || '',
			schoolName: school.name || classInfo.school_id || '',
			joinTime: member.join_time || null,
			approvalId: businessAuth.compactId(member.approval_id),
			joinSource: member.approval_id ? 'approval' : 'legacy',
			isHeadTeacher: businessAuth.compactId(classInfo.head_teacher_user_id) === userId
		}
	})

	return {
		code: 200,
		msg: 'success',
		data: {
			list,
			total: countRes.total || 0,
			page,
			pageSize
		}
	}
}

async function findLegacyTeacherMember(source, memberId, userId, classId) {
	if (userId && classId) {
		const directRes = await source.collection(MEMBER_COLLECTION)
			.where({ user_id: userId, class_id: classId, role: 'teacher' })
			.limit(1)
			.get()
		if (directRes.data && directRes.data[0]) return directRes.data[0]
	}
	for (let skip = 0; ; skip += QUERY_BATCH_SIZE) {
		const res = await source.collection(MEMBER_COLLECTION)
			.where({ role: 'teacher' })
			.skip(skip)
			.limit(QUERY_BATCH_SIZE)
			.get()
		const rows = res.data || []
		const member = rows.find(item => {
			const matchesMemberId = memberId && businessAuth.compactId(item._id) === memberId
			const matchesAssignment = userId && classId &&
				businessAuth.compactId(item.user_id) === userId &&
				businessAuth.compactId(item.class_id) === classId
			return matchesMemberId || matchesAssignment
		})
		if (member) return member
		if (rows.length < QUERY_BATCH_SIZE) return null
	}
}

async function removeTeacher(event, scope) {
	const memberId = businessAuth.compactId(event.memberId || event.member_id)
	const requestedUserId = businessAuth.compactId(event.userId || event.user_id)
	const requestedClassId = businessAuth.compactId(event.classId || event.class_id)
	const reason = clean(event.reason, 200)
	if (!memberId) throwBusinessError(400, '缺少老师任教关系ID')
	if (!reason) throwBusinessError(400, '请填写移出原因')

	let member = null
	try {
		const memberRes = await db.collection(MEMBER_COLLECTION).doc(memberId).get()
		member = memberRes.data && memberRes.data[0]
	} catch (lookupError) {
		console.warn('按任教关系ID查询失败，尝试兼容旧数据:', lookupError.message)
	}
	if (!member) {
		member = await findLegacyTeacherMember(db, memberId, requestedUserId, requestedClassId)
	}
	if (!member) throwBusinessError(404, '老师任教关系不存在，请刷新列表')
	if (member.role !== 'teacher') throwBusinessError(400, '只能管理老师任教关系')

	const resolvedMemberId = businessAuth.compactId(member._id)
	const classInfo = await getClassById(businessAuth.compactId(member.class_id))
	const school = await getSchoolByBusinessId(classInfo.school_id)
	businessAuth.assertSchoolAccess(scope, school, '无权移出该学校的老师')
	if (businessAuth.compactId(classInfo.head_teacher_user_id) === businessAuth.compactId(member.user_id)) {
		throwBusinessError(409, '该老师是当前班主任，请先在班级管理中更换或取消班主任')
	}

	const [operatorRes, teacherRes] = await Promise.all([
		db.collection(USER_COLLECTION)
			.where({ _id: scope.uid })
			.field({ nickname: true, username: true })
			.limit(1)
			.get(),
		db.collection(USER_COLLECTION)
			.where({ _id: member.user_id })
			.field({ nickname: true, username: true, mobile: true })
			.limit(1)
			.get()
	])
	const operator = operatorRes.data && operatorRes.data[0] || {}
	const teacher = teacherRes.data && teacherRes.data[0] || {}
	const operatorName = clean(operator.nickname || operator.username, 60) || '管理员'
	const now = Date.now()
	let actionLogId = ''
	try {
		const logRes = await db.collection(ACTION_LOG_COLLECTION).add({
			action: 'remove_from_class',
			teacher_user_id: businessAuth.compactId(member.user_id),
			teacher_name: clean(member.nickname || teacher.nickname || teacher.username, 60) || '未命名老师',
			teacher_mobile: teacher.mobile || '',
			member_id: resolvedMemberId,
			class_id: businessAuth.compactId(classInfo._id),
			class_name: classDisplayName(classInfo),
			class_code: classInfo.code || '',
			school_id: school.school_id,
			school_name: school.name || school.school_id,
			operator_user_id: scope.uid,
			operator_name: operatorName,
			reason,
			action_time: now
		})
		actionLogId = logRes.id
		const removeRes = await db.collection(MEMBER_COLLECTION).where({ _id: member._id }).remove()
		if (!removeRes || Number(removeRes.deleted) < 1) {
			throwBusinessError(409, '任教关系已被移除，请刷新列表')
		}

		return {
			code: 200,
			msg: '已将老师移出班级',
			data: { memberId: resolvedMemberId }
		}
	} catch (error) {
		if (actionLogId) {
			try {
				await db.collection(ACTION_LOG_COLLECTION).doc(actionLogId).remove()
			} catch (rollbackError) {
				console.error('老师移出日志回滚失败:', rollbackError)
			}
		}
		throw error
	}
}

exports.main = async (event = {}, context) => {
	const action = event.action || 'summary'
	try {
		const scope = await businessAuth.getBusinessAuthScope(event, context)
		if (action === 'summary') return getSummary(scope)
		if (action === 'list') return listTeachers(event, scope)
		if (action === 'remove') return removeTeacher(event, scope)
		return { code: 400, msg: '未知操作' }
	} catch (error) {
		console.error('老师管理操作失败:', error)
		return businessAuth.toErrorResponse(error, '老师管理操作失败')
	}
}
