'use strict'

let businessAuth
try {
	businessAuth = require('business-auth')
} catch (_) {
	businessAuth = require('../common/business-auth')
}

const db = uniCloud.database()
const dbCmd = db.command
const NOTIFICATION_COLLECTION = 'wtdb-business-notification'
const CLASS_COLLECTION = 'wtdb-business-class-list'

function clean(value, maxLength = 100) {
	return String(value == null ? '' : value).trim().slice(0, maxLength)
}

function safeNotification(item = {}) {
	return {
		_id: businessAuth.compactId(item._id),
		type: clean(item.type, 40),
		class_id: businessAuth.compactId(item.class_id),
		class_name: clean(item.class_name, 100),
		school_id: clean(item.school_id, 80),
		child_id: businessAuth.compactId(item.child_id),
		child_name: clean(item.child_name, 40),
		actor_name: clean(item.actor_name, 60),
		actor_mobile_masked: clean(item.actor_mobile_masked, 20),
		relationship: clean(item.relationship, 30),
		recipient_name: clean(item.recipient_name, 60),
		title: clean(item.title, 100),
		content: clean(item.content, 300),
		status: item.status === 'read' ? 'read' : 'unread',
		create_time: Number(item.create_time) || null,
		read_time: Number(item.read_time) || null
	}
}

function paging(event) {
	const pageNo = Math.max(1, Number(event.pageNo || event.page || 1))
	const pageSize = Math.min(100, Math.max(1, Number(event.pageSize || 20)))
	return { pageNo, pageSize }
}

function mineWhere(scope, event = {}) {
	const where = { recipient_user_id: dbCmd.in(scope.userIds) }
	if (['unread', 'read'].includes(event.status)) where.status = event.status
	return where
}

async function listMine(event, scope) {
	const { pageNo, pageSize } = paging(event)
	const where = mineWhere(scope, event)
	const [rows, total] = await Promise.all([
		db.collection(NOTIFICATION_COLLECTION)
			.where(where)
			.orderBy('create_time', 'desc')
			.skip((pageNo - 1) * pageSize)
			.limit(pageSize)
			.get(),
		db.collection(NOTIFICATION_COLLECTION).where(where).count()
	])
	return {
		code: 200,
		message: '查询成功',
		data: {
			list: (rows.data || []).map(safeNotification),
			total: total.total || 0,
			pageNo,
			pageSize
		}
	}
}

async function mineSummary(scope) {
	const result = await db.collection(NOTIFICATION_COLLECTION)
		.where({ recipient_user_id: dbCmd.in(scope.userIds), status: 'unread' })
		.count()
	return { code: 200, message: '查询成功', data: { unread: result.total || 0 } }
}

async function markRead(event, scope) {
	const notificationId = businessAuth.compactId(event.notificationId || event.id)
	if (!notificationId) throw new businessAuth.AuthError(400, '缺少通知ID')
	const result = await db.collection(NOTIFICATION_COLLECTION).doc(notificationId).get()
	const item = result.data && result.data[0]
	if (!item) throw new businessAuth.AuthError(404, '通知不存在')
	if (!scope.userIds.includes(businessAuth.compactId(item.recipient_user_id))) {
		throw new businessAuth.AuthError(403, '无权读取该通知')
	}
	if (item.status !== 'read') {
		await db.collection(NOTIFICATION_COLLECTION).doc(notificationId).update({
			status: 'read',
			read_time: Date.now()
		})
	}
	return { code: 200, message: '已读' }
}

async function markAllRead(scope) {
	await db.collection(NOTIFICATION_COLLECTION)
		.where({ recipient_user_id: dbCmd.in(scope.userIds), status: 'unread' })
		.update({ status: 'read', read_time: Date.now() })
	return { code: 200, message: '已全部读取' }
}

async function adminClassIds(scope) {
	if (scope.isGlobalBusinessAdmin) return null
	const ids = new Set(scope.headTeacherClassIds || [])
	if (scope.schoolIds && scope.schoolIds.length) {
		const result = await db.collection(CLASS_COLLECTION)
			.where({ school_id: dbCmd.in(scope.schoolIds) })
			.field({ _id: true })
			.get()
		;(result.data || []).forEach(item => ids.add(businessAuth.compactId(item._id)))
	}
	if (!ids.size) throw new businessAuth.AuthError(403, '无权查看通知管理')
	return [...ids]
}

async function adminWhere(event, scope) {
	const classIds = await adminClassIds(scope)
	const requestedClassId = businessAuth.compactId(event.classId || event.class_id)
	if (classIds && requestedClassId && !classIds.includes(requestedClassId)) {
		throw new businessAuth.AuthError(403, '无权查看该班级通知')
	}
	const where = {}
	if (requestedClassId) where.class_id = requestedClassId
	else if (classIds) where.class_id = dbCmd.in(classIds)
	if (['unread', 'read'].includes(event.status)) where.status = event.status
	if (event.type === 'guardian_joined') where.type = event.type
	return where
}

async function listAdmin(event, scope) {
	const { pageNo, pageSize } = paging(event)
	const where = await adminWhere(event, scope)
	const [rows, total] = await Promise.all([
		db.collection(NOTIFICATION_COLLECTION)
			.where(where)
			.orderBy('create_time', 'desc')
			.skip((pageNo - 1) * pageSize)
			.limit(pageSize)
			.get(),
		db.collection(NOTIFICATION_COLLECTION).where(where).count()
	])
	return {
		code: 200,
		message: '查询成功',
		data: {
			list: (rows.data || []).map(safeNotification),
			total: total.total || 0,
			pageNo,
			pageSize
		}
	}
}

async function adminSummary(event, scope) {
	const where = await adminWhere({ ...event, status: '' }, scope)
	const unreadWhere = { ...where, status: 'unread' }
	const [total, unread] = await Promise.all([
		db.collection(NOTIFICATION_COLLECTION).where(where).count(),
		db.collection(NOTIFICATION_COLLECTION).where(unreadWhere).count()
	])
	return {
		code: 200,
		message: '查询成功',
		data: { total: total.total || 0, unread: unread.total || 0 }
	}
}

exports.main = async (event = {}, context) => {
	try {
		const scope = await businessAuth.getBusinessAuthScope(event, context)
		if (event.action === 'list') return listMine(event, scope)
		if (event.action === 'summary') return mineSummary(scope)
		if (event.action === 'read') return markRead(event, scope)
		if (event.action === 'read-all') return markAllRead(scope)
		if (event.action === 'admin-list') return listAdmin(event, scope)
		if (event.action === 'admin-summary') return adminSummary(event, scope)
		throw new businessAuth.AuthError(400, '不支持的操作')
	} catch (error) {
		console.error('通知中心操作失败:', error)
		const response = businessAuth.toErrorResponse(error, '通知中心操作失败')
		return { ...response, message: response.msg }
	}
}
