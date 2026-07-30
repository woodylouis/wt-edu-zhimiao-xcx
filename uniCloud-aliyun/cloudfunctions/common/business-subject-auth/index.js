'use strict'

const uniID = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command

const USER_COLLECTION = 'uni-id-users'
const SCHOOL_COLLECTION = 'wtdb-business-school-list'
const CLASS_COLLECTION = 'wtdb-business-class-list'
const MEMBER_COLLECTION = 'wtdb-business-class-member'
const CHILD_COLLECTION = 'wtdb-business-children'
const RECORD_COLLECTION = 'wtdb-business-assess-record'
const ACCOUNT_ALIAS_COLLECTION = 'wtdb-user-account-alias'

class AuthError extends Error {
	constructor(code, message) {
		super(message)
		this.code = code
		this.isAuthError = true
	}
}

function compactId(value) {
	if (!value) return ''
	if (typeof value === 'string') return value
	if (value.$oid) return String(value.$oid)
	if (value._id) return compactId(value._id)
	return String(value)
}

function normalizeArray(value) {
	if (!value) return []
	return Array.isArray(value) ? value : [value]
}

function hasGlobalBusinessAccess(roles, permissions = []) {
	const roleList = normalizeArray(roles)
	return roleList.includes('admin') || roleList.includes('diana-admin') || normalizeArray(permissions).includes('business-all')
}

async function getLinkedUserIds(uid) {
	const requestedUid = compactId(uid)
	const aliasRes = await db.collection(ACCOUNT_ALIAS_COLLECTION).doc(requestedUid).get()
	const canonicalUid = compactId(aliasRes.data?.[0]?.canonical_user_id) || requestedUid
	const ids = new Set([canonicalUid])
	const linkedRes = await db.collection(ACCOUNT_ALIAS_COLLECTION)
		.where({ canonical_user_id: canonicalUid })
		.field({ _id: true })
		.get()
	for (const alias of linkedRes.data || []) {
		const linkedId = compactId(alias._id)
		if (linkedId) ids.add(linkedId)
	}
	return [...ids]
}

async function getDirectedSchoolIds(userIds) {
	if (!userIds.length) return []
	const schoolRes = await db.collection(SCHOOL_COLLECTION)
		.where({ director_user_id: dbCmd.in(userIds) })
		.field({ school_id: true })
		.get()
	return [...new Set((schoolRes.data || []).map(item => item.school_id).filter(Boolean))]
}

async function getAuthScope(event, context) {
	const token = event?.uniIdToken
	if (!token) throw new AuthError(401, '请先登录')

	let tokenRes
	try {
		tokenRes = await uniID.createInstance({ context }).checkToken(token)
	} catch (_) {
		throw new AuthError(401, '登录状态已失效，请重新登录')
	}
	if (!tokenRes || tokenRes.errCode || !tokenRes.uid) {
		throw new AuthError(401, '登录状态已失效，请重新登录')
	}

	const uid = compactId(tokenRes.uid)
	const roles = normalizeArray(tokenRes.role)
	const permissions = normalizeArray(tokenRes.permission)
	const isGlobalBusinessAdmin = hasGlobalBusinessAccess(roles, permissions)
	const userIds = isGlobalBusinessAdmin ? [uid] : await getLinkedUserIds(uid)
	const schoolIds = isGlobalBusinessAdmin ? [] : await getDirectedSchoolIds(userIds)
	return {
		uid,
		roles,
		permissions,
		isGlobalBusinessAdmin,
		userIds,
		schoolIds
	}
}

async function getClassById(classId) {
	const normalizedId = compactId(classId)
	if (!normalizedId) throw new AuthError(400, '缺少班级ID')
	const res = await db.collection(CLASS_COLLECTION).doc(normalizedId).get()
	const classInfo = res.data?.[0]
	if (!classInfo) throw new AuthError(404, '班级不存在')
	return classInfo
}

async function getChildById(childId) {
	const normalizedId = compactId(childId)
	if (!normalizedId) throw new AuthError(400, '缺少儿童ID')
	const res = await db.collection(CHILD_COLLECTION).doc(normalizedId).get()
	const child = res.data?.[0]
	if (!child) throw new AuthError(404, '儿童不存在')
	return child
}

function canDirectSchool(scope, classInfo) {
	return !!classInfo?.school_id && scope.schoolIds.includes(classInfo.school_id)
}

async function getMembership(scope, classId, role, childId = '') {
	const where = {
		class_id: compactId(classId),
		user_id: dbCmd.in(scope.userIds),
		role
	}
	if (role === 'parent') where.child_id = compactId(childId)
	const res = await db.collection(MEMBER_COLLECTION).where(where).limit(1).get()
	return res.data?.[0] || null
}

async function assertClassTeacherAccess(scope, classId) {
	const classInfo = await getClassById(classId)
	if (scope.isGlobalBusinessAdmin || canDirectSchool(scope, classInfo)) return classInfo
	const membership = await getMembership(scope, classInfo._id, 'teacher')
	if (!membership) throw new AuthError(403, '您不是该班级的授权老师')
	return classInfo
}

async function assertSchoolStaffAccess(scope, schoolId) {
	const normalizedSchoolId = compactId(schoolId)
	if (!normalizedSchoolId) throw new AuthError(400, '缺少学校ID')
	const schoolRes = await db.collection(SCHOOL_COLLECTION)
		.where({ school_id: normalizedSchoolId })
		.limit(1)
		.get()
	const school = schoolRes.data?.[0]
	if (!school) throw new AuthError(404, '学校不存在')
	if (scope.isGlobalBusinessAdmin || scope.schoolIds.includes(normalizedSchoolId)) return school

	const memberRes = await db.collection(MEMBER_COLLECTION)
		.where({ user_id: dbCmd.in(scope.userIds), role: 'teacher' })
		.field({ class_id: true })
		.get()
	const classIds = [...new Set((memberRes.data || []).map(item => compactId(item.class_id)).filter(Boolean))]
	if (!classIds.length) throw new AuthError(403, '您不是该学校的授权老师')
	const classRes = await db.collection(CLASS_COLLECTION)
		.where({ _id: dbCmd.in(classIds), school_id: normalizedSchoolId })
		.field({ _id: true })
		.limit(1)
		.get()
	if (!classRes.data?.length) throw new AuthError(403, '您不是该学校的授权老师')
	return school
}

async function assertChildReadAccess(scope, childId) {
	const child = await getChildById(childId)
	const classInfo = await getClassById(child.class_id)
	if (scope.isGlobalBusinessAdmin || canDirectSchool(scope, classInfo)) {
		return { child, classInfo }
	}

	const teacherMembership = await getMembership(scope, classInfo._id, 'teacher')
	if (teacherMembership) return { child, classInfo }
	const parentMembership = await getMembership(scope, classInfo._id, 'parent', child._id)
	if (parentMembership) return { child, classInfo }
	throw new AuthError(403, '无权访问该儿童数据')
}

async function assertChildAssessmentAccess(scope, childId) {
	const child = await getChildById(childId)
	const classInfo = await getClassById(child.class_id)
	if (scope.isGlobalBusinessAdmin || canDirectSchool(scope, classInfo)) {
		return { child, classInfo }
	}
	const membership = await getMembership(scope, classInfo._id, 'teacher')
	if (!membership) throw new AuthError(403, '只有该班级的授权老师可以进行评估')
	return { child, classInfo }
}

async function assertOwnedAssessmentRecord(scope, { recordId, childId, assessmentId = '' }) {
	if (!recordId) throw new AuthError(400, '缺少评估记录ID')
	const res = await db.collection(RECORD_COLLECTION)
		.where({ recordId })
		.limit(1)
		.get()
	const record = res.data?.[0]
	if (!record) throw new AuthError(404, '评估记录不存在')

	const recordChildId = compactId(record.childId || record.child_id)
	if (recordChildId !== compactId(childId)) {
		throw new AuthError(400, '评估记录与儿童信息不匹配')
	}
	const recordAssessmentId = compactId(record.assessmentId || record.assessment_id)
	if (assessmentId && recordAssessmentId && recordAssessmentId !== compactId(assessmentId)) {
		throw new AuthError(400, '评估记录与量表信息不匹配')
	}
	const assessorId = compactId(record.assessorId)
	if (!scope.isGlobalBusinessAdmin && !scope.userIds.includes(assessorId)) {
		throw new AuthError(403, '只能修改自己创建的评估记录')
	}
	await assertChildAssessmentAccess(scope, childId)
	return record
}

function toErrorResponse(error, fallbackMessage = '请求处理失败') {
	if (error?.isAuthError) {
		return { code: error.code, msg: error.message, message: error.message }
	}
	return {
		code: 500,
		msg: `${fallbackMessage}: ${error?.message || '未知错误'}`,
		message: `${fallbackMessage}: ${error?.message || '未知错误'}`
	}
}

module.exports = {
	AuthError,
	compactId,
	getAuthScope,
	getClassById,
	getChildById,
	assertClassTeacherAccess,
	assertSchoolStaffAccess,
	assertChildReadAccess,
	assertChildAssessmentAccess,
	assertOwnedAssessmentRecord,
	toErrorResponse
}
