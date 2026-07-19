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
const ADMIN_APP_ID = '__UNI__B9C18F8'
const MINI_PROGRAM_APP_ID = '__UNI__0FAB82A'

function clean(value, maxLength = 100) {
	return String(value || '').trim().slice(0, maxLength)
}

function throwBusinessError(code, message) {
	throw new businessAuth.AuthError(code, message)
}

function normalizeArray(value) {
	if (!value) return []
	return Array.isArray(value) ? value : [value]
}

function normalizeRoles(value) {
	return normalizeArray(value)
		.map(item => typeof item === 'object' && item ? item.role_id : item)
		.map(item => clean(item, 60))
		.filter(Boolean)
}

function hasIdentityValue(value) {
	if (!value) return false
	if (typeof value === 'string') return Boolean(value.trim())
	if (Array.isArray(value)) return value.some(hasIdentityValue)
	if (typeof value === 'object') return Object.values(value).some(hasIdentityValue)
	return true
}

function getAccountSource(user) {
	const appIds = normalizeArray(user.dcloud_appid).map(item => String(item || ''))
	const isWechat = appIds.includes(MINI_PROGRAM_APP_ID) || hasIdentityValue(user.wx_openid)
	const isAdmin = appIds.includes(ADMIN_APP_ID) || (!isWechat && Boolean(clean(user.username, 100)))
	if (isWechat && isAdmin) return { value: 'both', label: '微信/后台用户', isWechat: true }
	if (isWechat) return { value: 'wechat', label: '微信用户', isWechat: true }
	if (isAdmin) return { value: 'admin', label: '后台用户', isWechat: false }
	return { value: 'unknown', label: '来源未知', isWechat: false }
}

function userDisplayName(user) {
	return clean(user.nickname || user.username, 60) || '未命名用户'
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

async function getManagerAccessList(event, scope) {
	assertCanManage(scope)
	const keyword = clean(event.keyword, 80).toLowerCase()
	const visibility = clean(event.visibility, 20)
	const moduleFilter = clean(event.module, 20)
	const accessType = clean(event.accessType || event.access_type, 20)
	const accountSourceFilter = clean(event.accountSource || event.account_source, 20)
	const page = Math.max(1, Number(event.page) || 1)
	const pageSize = Math.min(100, Math.max(1, Number(event.pageSize) || 20))
	const [schools, classes] = await Promise.all([
		getAvailableSchools(scope),
		getClassesForScope(scope)
	])
	const directorIds = [...new Set(schools
		.map(item => businessAuth.compactId(item.director_user_id))
		.filter(Boolean))]
	const headTeacherIds = [...new Set(classes
		.map(item => businessAuth.compactId(item.head_teacher_user_id))
		.filter(Boolean))]
	const assignedUserIds = [...new Set([...directorIds, ...headTeacherIds])]
	const userFields = {
		_id: true,
		nickname: true,
		username: true,
		mobile: true,
		role: true,
		status: true,
		dcloud_appid: true,
		wx_openid: true,
		avatar_file: true
	}

	const assignedUsers = assignedUserIds.length
		? await fetchAll(USER_COLLECTION, { _id: dbCmd.in(assignedUserIds) }, userFields)
		: []
	const assignedMobiles = [...new Set(assignedUsers.map(item => clean(item.mobile, 30)).filter(Boolean))]
	const linkedUsers = assignedMobiles.length
		? await fetchAll(USER_COLLECTION, { mobile: dbCmd.in(assignedMobiles) }, userFields)
		: []
	const globalUsers = scope.isGlobalBusinessAdmin
		? await fetchAll(USER_COLLECTION, { role: dbCmd.in(['admin', 'diana-admin']) }, userFields)
		: []
	const userMap = new Map()
	;[...assignedUsers, ...linkedUsers, ...globalUsers].forEach(user => {
		const userId = businessAuth.compactId(user._id)
		if (userId) userMap.set(userId, user)
	})

	const usersByMobile = new Map()
	userMap.forEach(user => {
		const mobile = clean(user.mobile, 30)
		if (!mobile) return
		if (!usersByMobile.has(mobile)) usersByMobile.set(mobile, [])
		usersByMobile.get(mobile).push(user)
	})
	const assignedUserMap = new Map(assignedUsers.map(user => [businessAuth.compactId(user._id), user]))
	const schoolAccessMap = new Map()
	const addSchoolAccess = (userId, school, relation) => {
		if (!userId) return
		if (!schoolAccessMap.has(userId)) schoolAccessMap.set(userId, new Map())
		schoolAccessMap.get(userId).set(school.school_id, {
			recordId: businessAuth.compactId(school._id),
			schoolId: school.school_id,
			schoolName: school.name || school.school_id,
			directorUserId: businessAuth.compactId(school.director_user_id),
			relation
		})
	}
	schools.forEach(school => {
		const directorUserId = businessAuth.compactId(school.director_user_id)
		if (!directorUserId) return
		addSchoolAccess(directorUserId, school, 'direct')
		const director = assignedUserMap.get(directorUserId)
		const mobile = clean(director && director.mobile, 30)
		if (!mobile) return
		;(usersByMobile.get(mobile) || []).forEach(user => {
			const userId = businessAuth.compactId(user._id)
			addSchoolAccess(userId, school, userId === directorUserId ? 'direct' : 'linked')
		})
	})
	const schoolMap = new Map(schools.map(school => [school.school_id, school]))
	const headTeacherClassMap = new Map()
	const addHeadTeacherClass = (userId, classInfo, relation) => {
		if (!userId) return
		if (!headTeacherClassMap.has(userId)) headTeacherClassMap.set(userId, new Map())
		const classId = businessAuth.compactId(classInfo._id)
		const school = schoolMap.get(classInfo.school_id) || {}
		headTeacherClassMap.get(userId).set(classId, {
			classId,
			className: classDisplayName(classInfo),
			classCode: classInfo.code || '',
			schoolId: classInfo.school_id,
			schoolName: school.name || classInfo.school_id || '',
			headTeacherUserId: businessAuth.compactId(classInfo.head_teacher_user_id),
			relation
		})
	}
	classes.forEach(classInfo => {
		const headTeacherUserId = businessAuth.compactId(classInfo.head_teacher_user_id)
		if (!headTeacherUserId) return
		addHeadTeacherClass(headTeacherUserId, classInfo, 'direct')
		const headTeacher = assignedUserMap.get(headTeacherUserId)
		const mobile = clean(headTeacher && headTeacher.mobile, 30)
		if (!mobile) return
		;(usersByMobile.get(mobile) || []).forEach(user => {
			const userId = businessAuth.compactId(user._id)
			addHeadTeacherClass(userId, classInfo, userId === headTeacherUserId ? 'direct' : 'linked')
		})
	})

	let rows = [...userMap.values()].map(user => {
		const userId = businessAuth.compactId(user._id)
		const roles = normalizeRoles(user.role)
		const globalRoleIds = scope.isGlobalBusinessAdmin
			? roles.filter(roleId => roleId === 'admin' || roleId === 'diana-admin')
			: []
		const managedSchools = [...(schoolAccessMap.get(userId) || new Map()).values()]
		const headTeacherClasses = [...(headTeacherClassMap.get(userId) || new Map()).values()]
		const source = getAccountSource(user)
		const status = Number(user.status || 0)
		const isEnabled = status === 0
		const canUseMiniProgram = isEnabled && source.isWechat
		const teacherManagementAuthorized = Boolean(globalRoleIds.length || managedSchools.length)
		const approvalAuthorized = Boolean(teacherManagementAuthorized || headTeacherClasses.length)
		const moduleState = (authorized, unauthorizedReason) => {
			if (!authorized) return { authorized: false, willShow: false, reason: unauthorizedReason }
			if (!isEnabled) return { authorized: true, willShow: false, reason: '账号当前不是正常状态' }
			if (!source.isWechat) return { authorized: true, willShow: false, reason: '未绑定微信小程序账号' }
			return { authorized: true, willShow: true, reason: '登录小程序后显示' }
		}
		const avatarFile = user.avatar_file || {}
		return {
			userId,
			displayName: userDisplayName(user),
			username: clean(user.username, 80),
			mobile: clean(user.mobile, 30),
			avatarUrl: typeof avatarFile === 'string' ? avatarFile : (avatarFile.url || ''),
			status,
			statusLabel: ['正常', '禁用', '审核中', '审核拒绝'][status] || '未知',
			accountSource: source.value,
			accountSourceLabel: source.label,
			globalRoles: globalRoleIds.map(roleId => ({
				roleId,
				roleName: roleId === 'admin' ? '超级管理员' : '业务超级管理员'
			})),
			managedSchools,
			headTeacherClasses,
			canUseMiniProgram,
			teacherManagement: moduleState(teacherManagementAuthorized, '仅管理员或学校负责人显示'),
			approval: moduleState(approvalAuthorized, '仅管理员、学校负责人或班主任显示')
		}
	}).filter(item => item.globalRoles.length || item.managedSchools.length || item.headTeacherClasses.length)

	const allRows = rows
	const summary = {
		total: allRows.length,
		teacherManagementCount: allRows.filter(item => item.teacherManagement.willShow).length,
		approvalCount: allRows.filter(item => item.approval.willShow).length,
		issueCount: allRows.filter(item => !item.canUseMiniProgram).length,
		globalCount: allRows.filter(item => item.globalRoles.length).length,
		schoolCount: allRows.filter(item => item.managedSchools.length).length,
		headTeacherCount: allRows.filter(item => item.headTeacherClasses.length).length
	}
	if (keyword) {
		rows = rows.filter(item => [
			item.displayName,
			item.username,
			item.mobile,
			item.userId,
			...item.globalRoles.map(role => role.roleName),
			...item.managedSchools.map(school => school.schoolName),
			...item.headTeacherClasses.flatMap(classInfo => [classInfo.schoolName, classInfo.className, classInfo.classCode])
		].some(value => String(value || '').toLowerCase().includes(keyword)))
	}
	if (moduleFilter === 'teacher-management') rows = rows.filter(item => item.teacherManagement.authorized)
	if (moduleFilter === 'approval') rows = rows.filter(item => item.approval.authorized)
	const isVisibleForFilter = item => {
		if (moduleFilter === 'teacher-management') return item.teacherManagement.willShow
		if (moduleFilter === 'approval') return item.approval.willShow
		return item.teacherManagement.willShow || item.approval.willShow
	}
	if (visibility === 'visible') rows = rows.filter(isVisibleForFilter)
	if (visibility === 'hidden') rows = rows.filter(item => !isVisibleForFilter(item))
	if (accessType === 'global') rows = rows.filter(item => item.globalRoles.length)
	if (accessType === 'school') rows = rows.filter(item => item.managedSchools.length)
	if (accessType === 'head-teacher') rows = rows.filter(item => item.headTeacherClasses.length)
	if (accessType === 'linked') {
		rows = rows.filter(item =>
			item.managedSchools.some(school => school.relation === 'linked') ||
			item.headTeacherClasses.some(classInfo => classInfo.relation === 'linked')
		)
	}
	if (accountSourceFilter) rows = rows.filter(item => item.accountSource === accountSourceFilter)
	rows.sort((left, right) => {
		return Number(right.approval.willShow || right.teacherManagement.willShow) -
			Number(left.approval.willShow || left.teacherManagement.willShow) ||
			left.displayName.localeCompare(right.displayName, 'zh-CN')
	})
	const total = rows.length
	const list = rows.slice((page - 1) * pageSize, page * pageSize)
	return { code: 200, msg: 'success', data: { list, total, page, pageSize, summary } }
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
		if (action === 'manager-access-list') return getManagerAccessList(event, scope)
		if (action === 'remove') return removeTeacher(event, scope)
		return { code: 400, msg: '未知操作' }
	} catch (error) {
		console.error('老师管理操作失败:', error)
		return businessAuth.toErrorResponse(error, '老师管理操作失败')
	}
}
