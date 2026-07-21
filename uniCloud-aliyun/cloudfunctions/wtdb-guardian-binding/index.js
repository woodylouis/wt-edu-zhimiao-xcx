'use strict'

const crypto = require('crypto')

let businessAuth
let guardianCore
try {
	businessAuth = require('business-auth')
	guardianCore = require('guardian-core')
} catch (_) {
	businessAuth = require('../common/business-auth')
	guardianCore = require('../common/guardian-core')
}

const db = uniCloud.database()
const dbCmd = db.command
const CLASS_COLLECTION = 'wtdb-business-class-list'
const CHILD_COLLECTION = 'wtdb-business-children'
const MEMBER_COLLECTION = 'wtdb-business-class-member'
const USER_COLLECTION = 'uni-id-users'
const NOTIFICATION_COLLECTION = 'wtdb-business-notification'

function clean(value, maxLength = 100) {
	return String(value == null ? '' : value).trim().slice(0, maxLength)
}

function className(classInfo = {}) {
	if (classInfo.nickname) return clean(classInfo.nickname, 100)
	const grade = clean(classInfo.grade, 30)
	const group = clean(classInfo.class, 20)
	return grade || group ? `${grade}${group}${group && !group.endsWith('班') ? '班' : ''}` : '未命名班级'
}

function stableId(prefix, value) {
	return `${prefix}_${crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 28)}`
}

function safeClass(classInfo = {}) {
	return {
		_id: businessAuth.compactId(classInfo._id),
		nickname: className(classInfo),
		code: clean(classInfo.code, 20),
		grade: clean(classInfo.grade, 30),
		class: clean(classInfo.class, 20),
		school_id: clean(classInfo.school_id, 80)
	}
}

function safeChild(child, matchedGuardian, boundMembership) {
	return {
		_id: businessAuth.compactId(child._id),
		name: clean(child.name, 40),
		avatar: clean(child.avatar, 1000),
		birthdate: Number(child.birthdate) || null,
		relationship: matchedGuardian.relationship,
		relationshipLabel: guardianCore.relationshipLabel(matchedGuardian.relationship),
		alreadyBound: Boolean(boundMembership),
		membershipId: businessAuth.compactId(boundMembership && boundMembership._id)
	}
}

async function getAccount(scope) {
	const res = await db.collection(USER_COLLECTION)
		.where({ _id: scope.uid })
		.field({ nickname: true, username: true, mobile: true })
		.limit(1)
		.get()
	const account = res.data && res.data[0]
	if (!account) throw new businessAuth.AuthError(401, '用户资料不存在，请重新登录')
	const mobile = guardianCore.normalizeMobile(account.mobile)
	if (!guardianCore.isValidMobile(mobile)) {
		throw new businessAuth.AuthError(428, '请先绑定本人手机号后再加入班级')
	}
	return {
		mobile,
		name: clean(account.nickname || account.username, 60) || '家长'
	}
}

async function getClass(event) {
	const classId = businessAuth.compactId(event.classId || event.class_id)
	const code = clean(event.classCode || event.class_code || event.scene, 20)
	let res
	if (classId) {
		res = await db.collection(CLASS_COLLECTION).doc(classId).get()
	} else if (code) {
		res = await db.collection(CLASS_COLLECTION).where({ code }).limit(1).get()
	} else {
		throw new businessAuth.AuthError(400, '请输入班级码')
	}
	const classInfo = res.data && res.data[0]
	if (!classInfo) throw new businessAuth.AuthError(404, '没有找到这个班级，请核对班级码')
	return classInfo
}

async function getMatches(scope, classInfo, mobile) {
	const classId = businessAuth.compactId(classInfo._id)
	const [childrenRes, membersRes] = await Promise.all([
		db.collection(CHILD_COLLECTION)
			.where({ class_id: classId })
			.field({ name: true, avatar: true, birthdate: true, guardians: true })
			.limit(500)
			.get(),
		db.collection(MEMBER_COLLECTION)
			.where({ class_id: classId, role: 'parent' })
			.field({ user_id: true, child_id: true, guardian_mobile: true })
			.limit(500)
			.get()
	])
	const boundByChild = new Map()
	;(membersRes.data || []).forEach(member => {
		const sameGuardian = guardianCore.isSameGuardianMembership(member, scope.userIds, mobile)
		if (sameGuardian) boundByChild.set(businessAuth.compactId(member.child_id), member)
	})

	return (childrenRes.data || []).reduce((result, child) => {
		const matchedGuardian = guardianCore.findGuardianByMobile(child.guardians, mobile)
		if (!matchedGuardian) return result
		const childId = businessAuth.compactId(child._id)
		result.push(safeChild(child, matchedGuardian, boundByChild.get(childId)))
		return result
	}, [])
}

async function createTeacherNotifications({ classInfo, child, membershipId, account, relationship }) {
	const classId = businessAuth.compactId(classInfo._id)
	const teacherRes = await db.collection(MEMBER_COLLECTION)
		.where({ class_id: classId, role: 'teacher' })
		.field({ user_id: true, nickname: true })
		.limit(500)
		.get()
	const teachers = []
	const seen = new Set()
	;(teacherRes.data || []).forEach(member => {
		const userId = businessAuth.compactId(member.user_id)
		if (!userId || seen.has(userId)) return
		seen.add(userId)
		teachers.push({ userId, fallbackName: clean(member.nickname, 60) })
	})
	if (!teachers.length) return

	const userRes = await db.collection(USER_COLLECTION)
		.where({ _id: dbCmd.in(teachers.map(item => item.userId)) })
		.field({ nickname: true, username: true })
		.get()
	const names = new Map((userRes.data || []).map(user => [
		businessAuth.compactId(user._id),
		clean(user.nickname || user.username, 60)
	]))
	const now = Date.now()
	const eventId = `guardian_joined:${membershipId}`
	const existingRes = await db.collection(NOTIFICATION_COLLECTION)
		.where({ event_id: eventId })
		.field({ recipient_user_id: true })
		.limit(500)
		.get()
	const notifiedUsers = new Set((existingRes.data || []).map(item => businessAuth.compactId(item.recipient_user_id)))
	const relationLabel = guardianCore.relationshipLabel(relationship)
	const base = {
		event_id: eventId,
		type: 'guardian_joined',
		class_id: classId,
		class_name: className(classInfo),
		school_id: clean(classInfo.school_id, 80),
		child_id: businessAuth.compactId(child._id),
		child_name: clean(child.name, 40),
		actor_user_id: account.uid,
		actor_name: account.name,
		actor_mobile_masked: guardianCore.maskMobile(account.mobile),
		relationship: relationLabel,
		title: '新家长已加入班级',
		content: `${account.name}（${relationLabel}）已绑定${clean(child.name, 40)}`,
		status: 'unread',
		create_time: now
	}
	await Promise.all(teachers
		.filter(teacher => !notifiedUsers.has(teacher.userId))
		.map(teacher => db.collection(NOTIFICATION_COLLECTION)
			.doc(stableId('notice', `${eventId}:${teacher.userId}`))
			.set({
				...base,
				recipient_user_id: teacher.userId,
				recipient_name: names.get(teacher.userId) || teacher.fallbackName || '老师'
			})))
}

async function lookup(event, scope) {
	const [account, classInfo] = await Promise.all([getAccount(scope), getClass(event)])
	const children = await getMatches(scope, classInfo, account.mobile)
	return {
		code: 200,
		message: '匹配完成',
		data: {
			classInfo: safeClass(classInfo),
			mobileMasked: guardianCore.maskMobile(account.mobile),
			children
		}
	}
}

async function bind(event, scope) {
	const childId = businessAuth.compactId(event.childId || event.child_id)
	if (!childId) throw new businessAuth.AuthError(400, '请选择要绑定的孩子')
	const [accountData, classInfo] = await Promise.all([getAccount(scope), getClass(event)])
	const account = { ...accountData, uid: scope.uid }
	const childRes = await db.collection(CHILD_COLLECTION).doc(childId).get()
	const child = childRes.data && childRes.data[0]
	if (!child || businessAuth.compactId(child.class_id) !== businessAuth.compactId(classInfo._id)) {
		throw new businessAuth.AuthError(404, '该班级中没有这个孩子')
	}
	const matchedGuardian = guardianCore.findGuardianByMobile(child.guardians, account.mobile)
	if (!matchedGuardian) {
		throw new businessAuth.AuthError(403, '老师登记的监护人手机号与当前账号不匹配')
	}

	const existingRes = await db.collection(MEMBER_COLLECTION)
		.where({ class_id: businessAuth.compactId(classInfo._id), child_id: childId, role: 'parent' })
		.field({ user_id: true, child_id: true, relationship: true, guardian_mobile: true, join_time: true })
		.limit(20)
		.get()
	const existing = (existingRes.data || []).find(member =>
		guardianCore.isSameGuardianMembership(member, scope.userIds, account.mobile)
	)
	if (existing) {
		await createTeacherNotifications({
			classInfo,
			child,
			membershipId: businessAuth.compactId(existing._id),
			account,
			relationship: matchedGuardian.relationship
		})
		return {
			code: 200,
			message: '您已经绑定这个孩子',
			data: {
				created: false,
				classInfo: safeClass(classInfo),
				child: safeChild(child, matchedGuardian, existing),
				membership: { ...existing, _id: businessAuth.compactId(existing._id), role: 'parent' }
			}
		}
	}

	const memberData = {
		user_id: scope.uid,
		class_id: businessAuth.compactId(classInfo._id),
		role: 'parent',
		nickname: account.name,
		child_id: childId,
		relationship: guardianCore.membershipRelationship(matchedGuardian.relationship),
		guardian_mobile: account.mobile,
		join_source: 'mobile_match',
		join_time: Date.now()
	}
	// 以“孩子 + 监护人手机号”生成确定性ID，并发确认时也不会产生重复成员。
	const membershipId = stableId('guardian', `${childId}:${account.mobile}`)
	await db.collection(MEMBER_COLLECTION).doc(membershipId).set(memberData)
	await createTeacherNotifications({
		classInfo,
		child,
		membershipId,
		account,
		relationship: matchedGuardian.relationship
	})
	const membership = { ...memberData, _id: membershipId }
	return {
		code: 200,
		message: '已成功加入班级',
		data: {
			created: true,
			classInfo: safeClass(classInfo),
			child: safeChild(child, matchedGuardian, membership),
			membership
		}
	}
}

exports.main = async (event = {}, context) => {
	try {
		const scope = await businessAuth.getBusinessAuthScope(event, context)
		if (event.action === 'lookup') return lookup(event, scope)
		if (event.action === 'bind') return bind(event, scope)
		throw new businessAuth.AuthError(400, '不支持的操作')
	} catch (error) {
		console.error('监护人匹配失败:', error)
		const response = businessAuth.toErrorResponse(error, '监护人匹配失败')
		return { ...response, message: response.msg }
	}
}
