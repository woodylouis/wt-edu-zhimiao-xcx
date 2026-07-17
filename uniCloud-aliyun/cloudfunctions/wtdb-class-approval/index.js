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
const USER_COLLECTION = 'uni-id-users'
const REVIEW_STATUSES = ['pending', 'approved', 'rejected']

function sanitizeText(value, maxLength = 100) {
	return String(value || '').trim().slice(0, maxLength)
}

function throwBusinessError(code, message) {
	throw new businessAuth.AuthError(code, message)
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

async function getClassInfo({ classId, classCode }, source = db) {
	let res
	if (classId) {
		res = await source.collection(CLASS_COLLECTION).doc(classId).get()
	} else if (classCode) {
		res = await source.collection(CLASS_COLLECTION)
			.where({ code: classCode })
			.limit(1)
			.get()
	} else {
		throwBusinessError(400, '缺少班级信息')
	}

	const classInfo = res.data && res.data[0]
	if (!classInfo) throwBusinessError(404, '班级不存在')
	if (classCode && classInfo.code !== classCode) {
		throwBusinessError(400, '班级信息不匹配')
	}
	if (!classInfo.school_id) {
		throwBusinessError(409, '班级尚未关联学校，无法提交审批')
	}
	return classInfo
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

async function buildScopeWhere(scope, status, requestedSchoolId = '') {
	if (!scope.isGlobalBusinessAdmin && !scope.schoolIds.length) {
		throwBusinessError(403, '您不是学校负责人，无权查看审批')
	}

	const conditions = []
	if (status === 'processed') {
		conditions.push({ status: dbCmd.in(['approved', 'rejected']) })
	} else if (status && status !== 'all') {
		if (!REVIEW_STATUSES.includes(status)) throwBusinessError(400, '审批状态无效')
		conditions.push({ status })
	}

	if (scope.isGlobalBusinessAdmin) {
		if (requestedSchoolId) {
			const classIds = await getClassIdsBySchoolIds([requestedSchoolId])
			conditions.push({ class_id: dbCmd.in(classIds.length ? classIds : ['__no_accessible_class__']) })
		}
	} else {
		if (requestedSchoolId && !scope.schoolIds.includes(requestedSchoolId)) {
			throwBusinessError(403, '无权查看该学校审批')
		}
		const classIds = await getClassIdsBySchoolIds(
			requestedSchoolId ? [requestedSchoolId] : scope.schoolIds
		)
		conditions.push({ class_id: dbCmd.in(classIds.length ? classIds : ['__no_accessible_class__']) })
	}

	if (!conditions.length) return {}
	return conditions.length === 1 ? conditions[0] : dbCmd.and(conditions)
}

async function submitApproval(event, scope) {
	const requestedRole = sanitizeText(event.requestedRole || event.role, 20)
	if (requestedRole !== 'teacher') {
		throwBusinessError(400, '当前仅支持老师提交入班申请')
	}
	const classCode = sanitizeText(event.classCode || event.class_code || event.code, 20)
	if (!classCode) throwBusinessError(400, '请输入班级码')

	const classInfo = await getClassInfo({
		classId: businessAuth.compactId(event.classId || event.class_id),
		classCode
	})
	const school = await getSchoolByBusinessId(classInfo.school_id)
	const profile = await getUserProfile(scope.uid)
	if (!profile) throwBusinessError(404, '申请人账号不存在')

	const applicantName = sanitizeText(
		event.nickname || event.applicantName || profile.nickname || profile.username,
		30
	)
	if (!applicantName) throwBusinessError(400, '请填写申请人姓名')

	const memberRes = await db.collection(MEMBER_COLLECTION)
		.where({
			class_id: businessAuth.compactId(classInfo._id),
			user_id: scope.uid
		})
		.limit(1)
		.get()
	if (memberRes.data && memberRes.data.length) {
		throwBusinessError(409, '您已经是该班级成员')
	}

	const pendingRes = await db.collection(APPROVAL_COLLECTION)
		.where({
			class_id: businessAuth.compactId(classInfo._id),
			applicant_user_id: scope.uid,
			requested_role: requestedRole,
			status: 'pending'
		})
		.limit(1)
		.get()
	if (pendingRes.data && pendingRes.data[0]) {
		return {
			code: 200,
			msg: '申请已提交，请等待学校负责人审批',
			data: {
				approvalId: businessAuth.compactId(pendingRes.data[0]._id),
				status: 'pending',
				existing: true
			}
		}
	}

	const now = Date.now()
	const addRes = await db.collection(APPROVAL_COLLECTION).add({
		class_id: businessAuth.compactId(classInfo._id),
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
	})

	return {
		code: 200,
		msg: '申请已提交，请等待学校负责人审批',
		data: {
			approvalId: addRes.id,
			status: 'pending',
			existing: false
		}
	}
}

async function getApprovalSummary(scope) {
	const canReview = scope.isGlobalBusinessAdmin || scope.schoolIds.length > 0
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
	}

	return {
		code: 200,
		msg: 'success',
		data: {
			canReview: true,
			pending: pendingRes.total || 0,
			approved: approvedRes.total || 0,
			rejected: rejectedRes.total || 0,
			scopeType: scope.isGlobalBusinessAdmin ? 'global' : 'school',
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

	return {
		code: 200,
		msg: 'success',
		data: {
			list: listRes.data || [],
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
	const transaction = await db.startTransaction()

	try {
		const requestRes = await transaction.collection(APPROVAL_COLLECTION).doc(approvalId).get()
		const request = requestRes.data && requestRes.data[0]
		if (!request) throwBusinessError(404, '审批记录不存在')
		if (request.status !== 'pending') {
			throwBusinessError(409, '该申请已处理，请刷新列表')
		}
		if (request.requested_role !== 'teacher') {
			throwBusinessError(400, '当前仅支持审批老师入班申请')
		}

		const classInfo = await getClassInfo({
			classId: businessAuth.compactId(request.class_id),
			classCode: request.class_code
		}, transaction)
		const school = await getSchoolByBusinessId(classInfo.school_id, transaction)
		businessAuth.assertSchoolAccess(scope, school, '您无权审批该学校的入班申请')

		let memberId = ''
		let memberAlreadyExists = false
		if (decision === 'approve') {
			const memberRes = await transaction.collection(MEMBER_COLLECTION)
				.where({
					class_id: businessAuth.compactId(classInfo._id),
					user_id: request.applicant_user_id
				})
				.limit(1)
				.get()
			const existingMember = memberRes.data && memberRes.data[0]
			if (existingMember) {
				memberId = businessAuth.compactId(existingMember._id)
				memberAlreadyExists = true
			} else {
				const memberData = {
					class_id: businessAuth.compactId(classInfo._id),
					user_id: request.applicant_user_id,
					role: request.requested_role,
					nickname: request.nickname || request.applicant_name,
					join_time: Date.now(),
					approved_by: scope.uid,
					approval_id: approvalId
				}
				const addRes = await transaction.collection(MEMBER_COLLECTION).add(memberData)
				memberId = addRes.id
			}
		}

		const now = Date.now()
		const nextStatus = decision === 'approve' ? 'approved' : 'rejected'
		await transaction.collection(APPROVAL_COLLECTION).doc(approvalId).update({
			status: nextStatus,
			reviewer_user_id: scope.uid,
			reviewer_name: reviewerName,
			review_remark: remark,
			review_time: now,
			update_time: now,
			school_id: school.school_id,
			school_name: school.name || school.school_id
		})
		await transaction.commit()

		return {
			code: 200,
			msg: decision === 'approve' ? '已通过申请' : '已拒绝申请',
			data: {
				approvalId,
				status: nextStatus,
				memberId,
				memberAlreadyExists
			}
		}
	} catch (error) {
		try {
			await transaction.rollback()
		} catch (rollbackError) {
			console.error('审批事务回滚失败:', rollbackError)
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
