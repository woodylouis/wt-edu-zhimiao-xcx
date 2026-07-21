'use strict'

let businessAuth
try {
	businessAuth = require('business-auth')
} catch (error) {
	businessAuth = require('../common/business-auth')
}

const db = uniCloud.database()
const dbCmd = db.command
const APPROVAL_COLLECTION = 'wtdb-business-class-approval'
const CLASS_COLLECTION = 'wtdb-business-class-list'
const SCHOOL_COLLECTION = 'wtdb-business-school-list'
const MEMBER_COLLECTION = 'wtdb-business-class-member'
const CHILD_COLLECTION = 'wtdb-business-children'
const USER_COLLECTION = 'uni-id-users'
const REVIEW_STATUSES = ['pending', 'approved', 'rejected']
const REQUESTED_ROLES = ['teacher', 'parent']
const PARENT_RELATIONSHIPS = ['father', 'mother', 'grandfather', 'grandmother', 'other']
const RELATIONSHIP_ALIASES = {
	'爸爸': 'father',
	'妈妈': 'mother',
	'爷爷': 'grandfather',
	'奶奶': 'grandmother',
	'其他': 'other'
}
const QUERY_BATCH_SIZE = 100

function sanitizeText(value, maxLength = 100) {
	return String(value || '').trim().slice(0, maxLength)
}

function throwBusinessError(code, message) {
	throw new businessAuth.AuthError(code, message)
}

function normalizeParentApplication(event = {}) {
	const childInput = event.child || event.parentData || {}
	const childName = sanitizeText(
		event.childName || event.child_name || childInput.childName || childInput.name,
		40
	)
	const rawGender = sanitizeText(
		event.childGender || event.child_gender || childInput.gender,
		20
	)
	const gender = {
		'男': '男孩',
		'male': '男孩',
		'boy': '男孩',
		'女': '女孩',
		'female': '女孩',
		'girl': '女孩'
	}[rawGender] || rawGender
	const birthdate = Number(
		event.childBirthdate || event.child_birthdate || childInput.birthdate
	)
	const rawRelationship = sanitizeText(
		event.relationship || childInput.relationship,
		20
	)
	const relationship = RELATIONSHIP_ALIASES[rawRelationship] || rawRelationship

	if (!childName) throwBusinessError(400, '请填写孩子姓名')
	if (!['男孩', '女孩'].includes(gender)) throwBusinessError(400, '请选择孩子性别')
	if (!Number.isFinite(birthdate) || birthdate <= 0 || birthdate > Date.now()) {
		throwBusinessError(400, '孩子出生日期不正确')
	}
	if (!PARENT_RELATIONSHIPS.includes(relationship)) {
		throwBusinessError(400, '请选择您与孩子的关系')
	}

	return {
		childName,
		childGender: gender,
		childBirthdate: Math.trunc(birthdate),
		relationship
	}
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

function formatBirthdate(birthdate) {
	const date = new Date(birthdate)
	const pad = value => String(value).padStart(2, '0')
	return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日`
}

function buildParentChildData(parentApplication, classId, applicantUserId, now) {
	const calculatedAge = buildAge(parentApplication.childBirthdate)
	return {
		name: parentApplication.childName,
		class_id: classId,
		birthdate: parentApplication.childBirthdate,
		gender: parentApplication.childGender,
		age: calculatedAge.age,
		ageInt: calculatedAge.ageInt,
		formatBirthdate: formatBirthdate(parentApplication.childBirthdate),
		avatar: '',
		created_by: applicantUserId,
		create_time: now,
		update_time: now
	}
}

function buildMembershipData({ request, classId, applicantUserId, applicantNickname, childId, now, reviewerId, approvalId }) {
	const memberData = {
		class_id: classId,
		user_id: applicantUserId,
		role: request.requested_role,
		nickname: applicantNickname,
		join_time: now,
		approved_by: reviewerId,
		approval_id: approvalId
	}
	if (request.requested_role === 'parent') {
		if (!childId) throwBusinessError(409, '家长成员缺少关联儿童')
		const parentApplication = normalizeParentApplication(request)
		memberData.child_id = childId
		memberData.relationship = parentApplication.relationship
	}
	return memberData
}

async function findRecordByCompactId(source, collectionName, recordId) {
	if (!recordId) return null
	try {
		const directRes = await source.collection(collectionName).doc(recordId).get()
		if (directRes.data && directRes.data[0]) return directRes.data[0]
	} catch (lookupError) {
		console.warn(`按ID查询${collectionName}失败，尝试兼容旧数据:`, lookupError.message)
	}

	for (let skip = 0; ; skip += QUERY_BATCH_SIZE) {
		const res = await source.collection(collectionName)
			.skip(skip)
			.limit(QUERY_BATCH_SIZE)
			.get()
		const rows = res.data || []
		const record = rows.find(item => businessAuth.compactId(item._id) === recordId)
		if (record) return record
		if (rows.length < QUERY_BATCH_SIZE) return null
	}
}

async function getUserProfile(uid, source = db) {
	const res = await source.collection(USER_COLLECTION)
		.where({ _id: uid })
		.field({
			_id: true,
			nickname: true,
			username: true,
			mobile: true
		})
		.limit(1)
		.get()
	return res.data && res.data[0] || null
}

async function getUserProfileMap(userIds) {
	const ids = [...new Set(userIds.filter(Boolean))]
	if (!ids.length) return new Map()
	const res = await db.collection(USER_COLLECTION)
		.where({ _id: dbCmd.in(ids) })
		.field({ _id: true, nickname: true, username: true, mobile: true })
		.get()
	return new Map((res.data || []).map(item => [businessAuth.compactId(item._id), item]))
}

async function getClassInfo({ classId, classCode }, source = db) {
	let classInfo
	if (classId) {
		classInfo = await findRecordByCompactId(source, CLASS_COLLECTION, classId)
	} else if (classCode) {
		const res = await source.collection(CLASS_COLLECTION)
			.where({ code: classCode })
			.limit(1)
			.get()
		classInfo = res.data && res.data[0]
	} else {
		throwBusinessError(400, '缺少班级信息')
	}

	if (!classInfo) throwBusinessError(404, '班级不存在')
	if (classCode && classInfo.code !== classCode) {
		throwBusinessError(400, '班级信息不匹配')
	}
	if (!classInfo.school_id) {
		throwBusinessError(409, '班级尚未关联学校，无法提交审批')
	}
	return classInfo
}

async function findClassMember(classId, userId, role) {
	const directRes = await db.collection(MEMBER_COLLECTION)
		.where({ class_id: classId, user_id: userId, role })
		.limit(1)
		.get()
	if (directRes.data && directRes.data[0]) return directRes.data[0]

	for (let skip = 0; ; skip += QUERY_BATCH_SIZE) {
		const res = await db.collection(MEMBER_COLLECTION)
			.where({ role })
			.skip(skip)
			.limit(QUERY_BATCH_SIZE)
			.get()
		const rows = res.data || []
		const member = rows.find(item =>
			businessAuth.compactId(item.class_id) === classId &&
			businessAuth.compactId(item.user_id) === userId
		)
		if (member) return member
		if (rows.length < QUERY_BATCH_SIZE) return null
	}
}

async function findParentMemberForChild(classId, userId, parentApplication) {
	const directRes = await db.collection(MEMBER_COLLECTION)
		.where({ class_id: classId, user_id: userId, role: 'parent' })
		.limit(QUERY_BATCH_SIZE)
		.get()
	let members = directRes.data || []

	if (!members.length) {
		for (let skip = 0; ; skip += QUERY_BATCH_SIZE) {
			const res = await db.collection(MEMBER_COLLECTION)
				.where({ role: 'parent' })
				.skip(skip)
				.limit(QUERY_BATCH_SIZE)
				.get()
			const rows = res.data || []
			members.push(...rows.filter(item =>
				businessAuth.compactId(item.class_id) === classId &&
				businessAuth.compactId(item.user_id) === userId
			))
			if (rows.length < QUERY_BATCH_SIZE) break
		}
	}

	for (const member of members) {
		const childId = businessAuth.compactId(member.child_id)
		if (!childId) continue
		const child = await findRecordByCompactId(db, CHILD_COLLECTION, childId)
		if (
			child &&
			sanitizeText(child.name, 40) === parentApplication.childName &&
			Number(child.birthdate) === parentApplication.childBirthdate
		) {
			return member
		}
	}
	return null
}

async function getSchoolByBusinessId(schoolId, source = db) {
	const res = await source.collection(SCHOOL_COLLECTION)
		.where({ school_id: schoolId })
		.limit(1)
		.get()
	const school = res.data && res.data[0]
	if (!school) throwBusinessError(404, '班级所属学校不存在')
	return school
}

async function getClassIdsBySchoolIds(schoolIds) {
	if (!schoolIds.length) return []
	const classRes = await db.collection(CLASS_COLLECTION)
		.where({ school_id: dbCmd.in(schoolIds) })
		.field({ _id: true })
		.get()
	return (classRes.data || []).map(item => businessAuth.compactId(item._id)).filter(Boolean)
}

async function getReviewableClassIds(scope, requestedSchoolId = '') {
	if (scope.isGlobalBusinessAdmin) {
		return requestedSchoolId ? getClassIdsBySchoolIds([requestedSchoolId]) : null
	}

	const headTeacherClassIds = (scope.headTeacherClasses || [])
		.filter(item => !requestedSchoolId || item.school_id === requestedSchoolId)
		.map(item => businessAuth.compactId(item._id))
		.filter(Boolean)
	const directedSchoolIds = requestedSchoolId
		? (scope.schoolIds.includes(requestedSchoolId) ? [requestedSchoolId] : [])
		: scope.schoolIds

	if (requestedSchoolId && !directedSchoolIds.length && !headTeacherClassIds.length) {
		throwBusinessError(403, '无权查看该学校审批')
	}

	const directedClassIds = await getClassIdsBySchoolIds(directedSchoolIds)
	return [...new Set([...directedClassIds, ...headTeacherClassIds])]
}

async function buildScopeWhere(scope, status, requestedSchoolId = '') {
	if (!scope.isGlobalBusinessAdmin && !scope.schoolIds.length && !scope.headTeacherClassIds.length) {
		throwBusinessError(403, '您不是班主任或学校负责人，无权查看审批')
	}

	const conditions = []
	if (status === 'processed') {
		conditions.push({ status: dbCmd.in(['approved', 'rejected']) })
	} else if (status && status !== 'all') {
		if (!REVIEW_STATUSES.includes(status)) throwBusinessError(400, '审批状态无效')
		conditions.push({ status })
	}

	const classIds = await getReviewableClassIds(scope, requestedSchoolId)
	if (classIds !== null) {
		conditions.push({ class_id: dbCmd.in(classIds.length ? classIds : ['__no_accessible_class__']) })
	}

	if (!conditions.length) return {}
	return conditions.length === 1 ? conditions[0] : dbCmd.and(conditions)
}

async function submitApproval(event, scope) {
	const requestedRole = sanitizeText(event.requestedRole || event.role, 20)
	if (!REQUESTED_ROLES.includes(requestedRole)) {
		throwBusinessError(400, '申请身份无效')
	}
	const parentApplication = requestedRole === 'parent'
		? normalizeParentApplication(event)
		: null
	const classCode = sanitizeText(event.classCode || event.class_code || event.code, 20)
	if (!classCode) throwBusinessError(400, '请输入班级码')

	const classInfo = await getClassInfo({
		classId: businessAuth.compactId(event.classId || event.class_id),
		classCode
	})
	const school = await getSchoolByBusinessId(classInfo.school_id)
	const profile = await getUserProfile(scope.uid)
	if (!profile) throwBusinessError(404, '申请人账号不存在')

	let applicantName = sanitizeText(profile.nickname || profile.username, 30)
	if (!applicantName && requestedRole === 'teacher') {
		throwBusinessError(400, '请先在个人资料中设置昵称')
	}
	if (!applicantName) applicantName = `${parentApplication.childName}家长`

	const classId = businessAuth.compactId(classInfo._id)
	const existingMember = requestedRole === 'parent'
		? await findParentMemberForChild(classId, scope.uid, parentApplication)
		: await findClassMember(classId, scope.uid, requestedRole)
	if (existingMember) throwBusinessError(409, '该身份已经加入班级')

	const pendingWhere = {
		class_id: classId,
		applicant_user_id: scope.uid,
		requested_role: requestedRole,
		status: 'pending'
	}
	if (parentApplication) {
		pendingWhere.child_name = parentApplication.childName
		pendingWhere.child_birthdate = parentApplication.childBirthdate
	}
	const pendingRes = await db.collection(APPROVAL_COLLECTION)
		.where(pendingWhere)
		.limit(1)
		.get()
	if (pendingRes.data && pendingRes.data[0]) {
		const pendingUpdate = {
			applicant_name: applicantName,
			nickname: applicantName,
			update_time: Date.now()
		}
		if (parentApplication) {
			Object.assign(pendingUpdate, {
				child_name: parentApplication.childName,
				child_gender: parentApplication.childGender,
				child_birthdate: parentApplication.childBirthdate,
				relationship: parentApplication.relationship
			})
		}
		await db.collection(APPROVAL_COLLECTION).doc(pendingRes.data[0]._id).update(pendingUpdate)
		return {
			code: 200,
			msg: '申请已提交，请等待班主任或学校负责人审批',
			data: {
				approvalId: businessAuth.compactId(pendingRes.data[0]._id),
				nickname: applicantName,
				status: 'pending',
				existing: true
			}
		}
	}

	const now = Date.now()
	const approvalData = {
		class_id: classId,
		class_code: classInfo.code || '',
		class_name: classInfo.nickname || (classInfo.grade || '') + (classInfo.class || '') + '班',
		school_id: school.school_id,
		school_name: school.name || school.school_id,
		applicant_user_id: scope.uid,
		applicant_name: applicantName,
		applicant_mobile: profile.mobile || '',
		requested_role: requestedRole,
		nickname: applicantName,
		status: 'pending',
		apply_time: now,
		update_time: now
	}
	if (parentApplication) {
		Object.assign(approvalData, {
			child_name: parentApplication.childName,
			child_gender: parentApplication.childGender,
			child_birthdate: parentApplication.childBirthdate,
			relationship: parentApplication.relationship
		})
	}
	const addRes = await db.collection(APPROVAL_COLLECTION).add(approvalData)

	return {
		code: 200,
		msg: '申请已提交，请等待班主任或学校负责人审批',
		data: {
			approvalId: addRes.id,
			nickname: applicantName,
			status: 'pending',
			existing: false
		}
	}
}

async function getApprovalSummary(scope) {
	const canReview = scope.isGlobalBusinessAdmin || scope.schoolIds.length > 0 || scope.headTeacherClassIds.length > 0
	if (!canReview) {
		return {
			code: 200,
			msg: 'success',
			data: {
				canReview: false,
				pending: 0,
				approved: 0,
				rejected: 0,
				scopeType: 'none',
				schools: []
			}
		}
	}

	const scopeWhere = await buildScopeWhere(scope, 'all')
	const countStatus = status => {
		const where = Object.keys(scopeWhere).length
			? dbCmd.and([scopeWhere, { status }])
			: { status }
		return db.collection(APPROVAL_COLLECTION).where(where).count()
	}
	const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
		countStatus('pending'),
		countStatus('approved'),
		countStatus('rejected')
	])
	let availableSchools = scope.schools
	if (scope.isGlobalBusinessAdmin) {
		const schoolRes = await db.collection(SCHOOL_COLLECTION)
			.field({ school_id: true, name: true })
			.orderBy('name', 'asc')
			.get()
		availableSchools = schoolRes.data || []
	} else {
		const schoolIds = [...new Set([
			...scope.schoolIds,
			...(scope.headTeacherClasses || []).map(item => item.school_id).filter(Boolean)
		])]
		const schoolRes = schoolIds.length
			? await db.collection(SCHOOL_COLLECTION)
				.where({ school_id: dbCmd.in(schoolIds) })
				.field({ school_id: true, name: true })
				.orderBy('name', 'asc')
				.get()
			: { data: [] }
		availableSchools = schoolRes.data || []
	}

	return {
		code: 200,
		msg: 'success',
		data: {
			canReview: true,
			pending: pendingRes.total || 0,
			approved: approvedRes.total || 0,
			rejected: rejectedRes.total || 0,
			scopeType: scope.isGlobalBusinessAdmin
				? 'global'
				: scope.schoolIds.length
					? (scope.headTeacherClassIds.length ? 'mixed' : 'school')
					: 'class',
			schools: availableSchools.map(item => ({
				schoolId: item.school_id,
				schoolName: item.name || item.school_id
			}))
		}
	}
}

async function listApprovals(event, scope) {
	const status = sanitizeText(event.status || 'pending', 20)
	const schoolId = sanitizeText(event.schoolId || event.school_id, 60)
	const page = Math.max(1, Number(event.page) || 1)
	const pageSize = Math.min(50, Math.max(1, Number(event.pageSize) || 20))
	const where = await buildScopeWhere(scope, status, schoolId)

	const [listRes, countRes] = await Promise.all([
		db.collection(APPROVAL_COLLECTION)
			.where(where)
			.orderBy('apply_time', 'desc')
			.skip((page - 1) * pageSize)
			.limit(pageSize)
			.get(),
		db.collection(APPROVAL_COLLECTION).where(where).count()
	])
	const rows = listRes.data || []
	const userMap = await getUserProfileMap(rows
		.map(item => businessAuth.compactId(item.applicant_user_id)))
	const list = rows.map(item => {
		const user = userMap.get(businessAuth.compactId(item.applicant_user_id)) || {}
		const nickname = sanitizeText(user.nickname, 30) || item.applicant_name || item.nickname || ''
		return { ...item, applicant_name: nickname, nickname }
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

async function reviewApproval(event, scope) {
	const approvalId = businessAuth.compactId(event.approvalId || event.id)
	const decision = sanitizeText(event.decision, 20)
	const remark = sanitizeText(event.remark, 200)
	if (!approvalId) throwBusinessError(400, '缺少审批记录ID')
	if (!['approve', 'reject'].includes(decision)) {
		throwBusinessError(400, '审批操作无效')
	}
	if (decision === 'reject' && !remark) {
		throwBusinessError(400, '请填写拒绝原因')
	}

	const reviewerProfile = await getUserProfile(scope.uid)
	const reviewerName = sanitizeText(
		reviewerProfile && (reviewerProfile.nickname || reviewerProfile.username),
		30
	) || '管理员'

	const request = await findRecordByCompactId(db, APPROVAL_COLLECTION, approvalId)
	if (!request) throwBusinessError(404, '审批记录不存在')
	if (request.status !== 'pending') {
		throwBusinessError(409, '该申请已处理，请刷新列表')
	}
	if (!REQUESTED_ROLES.includes(request.requested_role)) {
		throwBusinessError(400, '申请身份无效')
	}
	const parentApplication = request.requested_role === 'parent'
		? normalizeParentApplication(request)
		: null

	const classInfo = await getClassInfo({
		classId: businessAuth.compactId(request.class_id),
		classCode: request.class_code
	})
	const school = await getSchoolByBusinessId(classInfo.school_id)
	businessAuth.assertClassReviewAccess(scope, classInfo, school, '您无权审批该班级的入班申请')

	const classId = businessAuth.compactId(classInfo._id)
	const applicantUserId = businessAuth.compactId(request.applicant_user_id)
	let existingMember = null
	if (decision === 'approve') {
		existingMember = request.requested_role === 'parent'
			? await findParentMemberForChild(classId, applicantUserId, parentApplication)
			: await findClassMember(classId, applicantUserId, request.requested_role)
	}

	const now = Date.now()
	const nextStatus = decision === 'approve' ? 'approved' : 'rejected'
	let approvalUpdated = false
	let addedMemberId = ''
	let addedChildId = ''
	let memberId = existingMember ? businessAuth.compactId(existingMember._id) : ''
	let childId = existingMember ? businessAuth.compactId(existingMember.child_id) : ''
	const memberAlreadyExists = Boolean(existingMember)

	try {
		// 用原始 _id 兼容旧 BSON/ObjectId 数据；状态条件同时防止重复审批。
		const updateRes = await db.collection(APPROVAL_COLLECTION)
			.where({ _id: request._id, status: 'pending' })
			.update({
				status: nextStatus,
				reviewer_user_id: scope.uid,
				reviewer_name: reviewerName,
				review_remark: remark,
				review_time: now,
				update_time: now,
				school_id: school.school_id,
				school_name: school.name || school.school_id
			})
		if (!updateRes || Number(updateRes.updated) < 1) {
			throwBusinessError(409, '该申请已处理，请刷新列表')
		}
		approvalUpdated = true

		if (decision === 'approve' && !existingMember) {
			const applicantProfile = await getUserProfile(applicantUserId)
			const applicantNickname = sanitizeText(
				applicantProfile && applicantProfile.nickname,
				30
			) || sanitizeText(request.applicant_name || request.nickname, 30)
			if (parentApplication) {
				const childRes = await db.collection(CHILD_COLLECTION).add(
					buildParentChildData(parentApplication, classId, applicantUserId, now)
				)
				addedChildId = childRes.id
				childId = childRes.id
			}
			const addRes = await db.collection(MEMBER_COLLECTION).add(buildMembershipData({
				request,
				classId,
				applicantUserId,
				applicantNickname,
				childId,
				now,
				reviewerId: scope.uid,
				approvalId
			}))
			addedMemberId = addRes.id
			memberId = addRes.id
		}

		return {
			code: 200,
			msg: decision === 'approve' ? '已通过申请' : '已拒绝申请',
			data: {
				approvalId,
					status: nextStatus,
					memberId,
					childId,
					memberAlreadyExists
			}
		}
	} catch (error) {
		if (addedMemberId) {
			try {
				await db.collection(MEMBER_COLLECTION).doc(addedMemberId).remove()
			} catch (rollbackError) {
				console.error('审批新增成员回滚失败:', rollbackError)
			}
		}
		if (addedChildId) {
			try {
				await db.collection(CHILD_COLLECTION).doc(addedChildId).remove()
			} catch (rollbackError) {
				console.error('审批新增儿童回滚失败:', rollbackError)
			}
		}
		if (approvalUpdated) {
			try {
				await db.collection(APPROVAL_COLLECTION)
					.where({
						_id: request._id,
						status: nextStatus,
						reviewer_user_id: scope.uid,
						review_time: now
					})
					.update({
						status: 'pending',
						reviewer_user_id: dbCmd.remove(),
						reviewer_name: dbCmd.remove(),
						review_remark: dbCmd.remove(),
						review_time: dbCmd.remove(),
						update_time: Date.now()
					})
			} catch (rollbackError) {
				console.error('审批状态回滚失败:', rollbackError)
			}
		}
		throw error
	}
}

exports.main = async (event = {}, context) => {
	const action = event.action || 'summary'
	try {
		const scope = await businessAuth.getBusinessAuthScope(event, context)
		if (action === 'submit') return submitApproval(event, scope)
		if (action === 'summary') return getApprovalSummary(scope)
		if (action === 'list') return listApprovals(event, scope)
		if (action === 'review') return reviewApproval(event, scope)
		return { code: 400, msg: '未知操作' }
	} catch (error) {
		console.error('班级审批操作失败:', error)
		return businessAuth.toErrorResponse(error, '班级审批操作失败')
	}
}

exports._test = {
	normalizeParentApplication,
	buildParentChildData,
	buildMembershipData
}
