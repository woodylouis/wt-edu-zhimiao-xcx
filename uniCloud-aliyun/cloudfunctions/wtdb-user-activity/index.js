'use strict'

let businessAuth
try {
	businessAuth = require('business-auth')
} catch (error) {
	businessAuth = require('../common/business-auth')
}

const uniID = require('uni-id-common')
const db = uniCloud.database()
const dbCmd = db.command

const USER_COLLECTION = 'uni-id-users'
const UNI_ID_LOG_COLLECTION = 'uni-id-log'
const LOG_COLLECTION = 'wtdb-user-activity-log'
const MINI_PROGRAM_APP_ID = '__UNI__0FAB82A'
const ADMIN_APP_ID = '__UNI__B9C18F8'
const DAY = 24 * 60 * 60 * 1000
const USER_BATCH_SIZE = 500
const EVENT_TYPES = ['app_show', 'page_view', 'user_action']

function clean(value, maxLength = 100) {
	return String(value == null ? '' : value).trim().slice(0, maxLength)
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function compactId(value) {
	return businessAuth.compactId(value)
}

function normalizeArray(value) {
	if (!value) return []
	return Array.isArray(value) ? value : [value]
}

function combineWhere(conditions) {
	const list = (conditions || []).filter(Boolean)
	if (!list.length) return {}
	if (list.length === 1) return list[0]
	return dbCmd.and(list)
}

async function fetchAllUsers(fields) {
	const rows = []
	for (let skip = 0; ; skip += USER_BATCH_SIZE) {
		const res = await db.collection(USER_COLLECTION)
			.field(fields)
			.skip(skip)
			.limit(USER_BATCH_SIZE)
			.get()
		const batch = res.data || []
		rows.push(...batch)
		if (batch.length < USER_BATCH_SIZE) break
	}
	return rows
}

function resolveAppId(event = {}, context = {}) {
	return clean(
		context.APPID || context.appId || event.appid || (event.client && event.client.appid),
		80
	)
}

function resolveChannel(event = {}, context = {}) {
	const appId = resolveAppId(event, context)
	if (appId === MINI_PROGRAM_APP_ID) return 'miniapp'
	if (appId === ADMIN_APP_ID) return 'admin'
	return event.channel === 'admin' ? 'admin' : 'miniapp'
}

function clientContext(event = {}, context = {}) {
	const client = event.client || {}
	return {
		appid: resolveAppId(event, context),
		platform: clean(context.PLATFORM || context.platform || client.platform, 40),
		deviceModel: clean(client.model, 100),
		deviceId: clean(context.DEVICEID || context.deviceId || client.deviceId, 160),
		ip: clean(context.CLIENTIP || context.clientIP, 80),
		userAgent: clean(context.CLIENTUA || context.userAgent || client.userAgent, 500)
	}
}

async function getAuthenticatedUser(event, context) {
	const token = event.uniIdToken
	if (!token) throw new businessAuth.AuthError(401, '请先登录')
	let tokenResult
	try {
		tokenResult = await uniID.createInstance({ context }).checkToken(token, { autoRefresh: false })
	} catch (error) {
		throw new businessAuth.AuthError(401, '登录状态已失效，请重新登录')
	}
	if (!tokenResult || tokenResult.errCode || !tokenResult.uid) {
		throw new businessAuth.AuthError(401, '登录状态已失效，请重新登录')
	}
	const uid = compactId(tokenResult.uid)
	const userRes = await db.collection(USER_COLLECTION)
		.doc(uid)
		.field({ nickname: true, username: true })
		.get()
	const user = userRes.data && userRes.data[0]
	if (!user) throw new businessAuth.AuthError(404, '用户不存在')
	return { uid, user }
}

function getUserDisplayName(user = {}) {
	return clean(user.nickname || user.username, 80) || '未命名用户'
}

async function trackActivity(event, context) {
	const eventType = EVENT_TYPES.includes(event.eventType) ? event.eventType : 'page_view'
	const { uid, user } = await getAuthenticatedUser(event, context)
	const channel = resolveChannel(event, context)
	const client = clientContext(event, context)
	const now = Date.now()
	const activityField = channel === 'admin'
		? 'last_admin_activity_date'
		: 'last_miniapp_activity_date'
	const page = clean(event.page, 240).split('?')[0].split('#')[0]
	const logData = {
		user_id: uid,
		user_name: getUserDisplayName(user),
		username: clean(user.username, 80),
		channel,
		event_type: eventType,
		action: clean(event.actionName || eventType, 100),
		action_detail: clean(event.actionDetail, 200),
		duration_ms: Math.max(0, Math.floor(Number(event.durationMs) || 0)),
		target_type: clean(event.targetType, 60),
		target_id: clean(event.targetId, 120),
		page,
		page_title: clean(event.pageTitle, 100),
		session_id: clean(event.sessionId, 120),
		appid: client.appid,
		platform: client.platform,
		device_model: client.deviceModel,
		device_id: client.deviceId,
		ip: client.ip,
		user_agent: client.userAgent,
		create_time: now
	}
	if (['success', 'failure'].includes(event.resultStatus)) {
		logData.result = event.resultStatus
	}

	await Promise.all([
		db.collection(USER_COLLECTION).doc(uid).update({ [activityField]: now }),
		db.collection(LOG_COLLECTION).add(logData)
	])
	return { code: 200, msg: 'success', data: { createTime: now } }
}

function hasIdentityValue(value) {
	if (!value) return false
	if (typeof value === 'string') return Boolean(value.trim())
	if (Array.isArray(value)) return value.some(hasIdentityValue)
	if (typeof value === 'object') return Object.values(value).some(hasIdentityValue)
	return true
}

function getAccountSource(user = {}) {
	const appIds = normalizeArray(user.dcloud_appid).map(item => clean(item, 80))
	const miniapp = appIds.includes(MINI_PROGRAM_APP_ID) ||
		hasIdentityValue(user.wx_openid) ||
		Boolean(Number(user.last_miniapp_login_date) || Number(user.last_miniapp_activity_date))
	const admin = appIds.includes(ADMIN_APP_ID) ||
		(!miniapp && Boolean(clean(user.username, 80))) ||
		Boolean(Number(user.last_admin_login_date) || Number(user.last_admin_activity_date))
	if (miniapp && admin) return 'both'
	if (miniapp) return 'miniapp'
	if (admin) return 'admin'
	return 'unknown'
}

function userMatchesChannel(source, channel) {
	if (!channel) return true
	if (channel === 'miniapp') return source === 'miniapp' || source === 'both'
	if (channel === 'admin') return source === 'admin' || source === 'both'
	return source === channel
}

function maskMobile(value) {
	const mobile = clean(value, 30)
	if (!mobile) return ''
	return mobile.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}

function safeUser(user = {}) {
	const source = getAccountSource(user)
	const historicalLogin = Number(user.last_login_date) || 0
	const miniappLogin = Number(user.last_miniapp_login_date) ||
		(source === 'miniapp' ? historicalLogin : 0)
	const adminLogin = Number(user.last_admin_login_date) ||
		(source === 'admin' ? historicalLogin : 0)
	const miniappActivity = Math.max(Number(user.last_miniapp_activity_date) || 0, miniappLogin)
	const adminActivity = Math.max(Number(user.last_admin_activity_date) || 0, adminLogin)
	return {
		_id: compactId(user._id),
		nickname: clean(user.nickname, 80),
		username: clean(user.username, 80),
		mobile: maskMobile(user.mobile),
		role: normalizeArray(user.role).map(item => clean(item, 60)).filter(Boolean),
		accountSource: source,
		lastMiniappLoginDate: miniappLogin,
		lastMiniappActivityDate: miniappActivity,
		lastAdminLoginDate: adminLogin,
		lastAdminActivityDate: adminActivity,
		latestActivityDate: Math.max(miniappActivity, adminActivity),
		status: Number(user.status) || 0
	}
}

function assertAuditAccess(scope) {
	if (!scope.isGlobalBusinessAdmin) {
		throw new businessAuth.AuthError(403, '只有业务管理员可查看全量用户活动日志')
	}
}

async function getHistoricalLoginMap(userIds, appid) {
	if (!userIds.length) return new Map()
	const res = await db.collection(UNI_ID_LOG_COLLECTION)
		.aggregate()
		.match({
			user_id: dbCmd.in(userIds),
			appid,
			type: 'login',
			state: 1
		})
		.group({
			_id: '$user_id',
			lastLoginDate: { $max: '$create_date' }
		})
		.end()
	return new Map((res.data || []).map(item => [
		compactId(item._id),
		Number(item.lastLoginDate) || 0
	]))
}

async function fillHistoricalLoginDates(rows) {
	const userIds = rows.map(item => compactId(item._id)).filter(Boolean)
	if (!userIds.length) return rows
	try {
		const [miniappLogins, adminLogins] = await Promise.all([
			getHistoricalLoginMap(userIds, MINI_PROGRAM_APP_ID),
			getHistoricalLoginMap(userIds, ADMIN_APP_ID)
		])
		rows.forEach(item => {
			if (!item.lastMiniappLoginDate) {
				item.lastMiniappLoginDate = miniappLogins.get(item._id) || 0
			}
			if (!item.lastAdminLoginDate) {
				item.lastAdminLoginDate = adminLogins.get(item._id) || 0
			}
			item.lastMiniappActivityDate = Math.max(
				item.lastMiniappActivityDate,
				item.lastMiniappLoginDate
			)
			item.lastAdminActivityDate = Math.max(
				item.lastAdminActivityDate,
				item.lastAdminLoginDate
			)
			item.latestActivityDate = Math.max(
				item.lastMiniappActivityDate,
				item.lastAdminActivityDate
			)
		})
	} catch (error) {
		console.warn('读取历史登录时间失败:', error)
	}
	return rows
}

async function listUsers(event, context) {
	const scope = await businessAuth.getBusinessAuthScope(event, context)
	assertAuditAccess(scope)
	const keyword = clean(event.keyword, 80).toLowerCase()
	const channel = ['miniapp', 'admin', 'both', 'unknown'].includes(event.channel)
		? event.channel
		: ''
	const activityStatus = ['active7d', 'inactive30d', 'never'].includes(event.activityStatus)
		? event.activityStatus
		: ''
	const page = Math.max(1, Math.floor(Number(event.page) || 1))
	const pageSize = [20, 50, 100].includes(Number(event.pageSize)) ? Number(event.pageSize) : 20
	const now = Date.now()
	const sevenDaysAgo = now - 7 * DAY
	const thirtyDaysAgo = now - 30 * DAY
	const users = await fetchAllUsers({
		_id: true,
		nickname: true,
		username: true,
		mobile: true,
		role: true,
		status: true,
		dcloud_appid: true,
		wx_openid: true,
		last_login_date: true,
		last_miniapp_login_date: true,
		last_miniapp_activity_date: true,
		last_admin_login_date: true,
		last_admin_activity_date: true
	})
	const safeRows = users.map(safeUser)
	const summary = {
		userCount: safeRows.length,
		miniappUserCount: safeRows.filter(item => userMatchesChannel(item.accountSource, 'miniapp')).length,
		adminUserCount: safeRows.filter(item => userMatchesChannel(item.accountSource, 'admin')).length,
		miniappActive7d: safeRows.filter(item => item.lastMiniappActivityDate >= sevenDaysAgo).length,
		adminActive7d: safeRows.filter(item => item.lastAdminActivityDate >= sevenDaysAgo).length
	}
	let rows = safeRows.filter(item => {
		if (!userMatchesChannel(item.accountSource, channel)) return false
		if (keyword) {
			const haystack = [item.nickname, item.username, item.mobile, item._id].join(' ').toLowerCase()
			if (!haystack.includes(keyword)) return false
		}
		if (activityStatus === 'active7d' && item.latestActivityDate < sevenDaysAgo) return false
		if (activityStatus === 'inactive30d' && (!item.latestActivityDate || item.latestActivityDate >= thirtyDaysAgo)) return false
		if (activityStatus === 'never' && item.latestActivityDate) return false
		return true
	})
	rows.sort((a, b) => {
		return b.latestActivityDate - a.latestActivityDate ||
			(a.nickname || a.username || a._id).localeCompare(b.nickname || b.username || b._id, 'zh-CN')
	})
	const total = rows.length
	const start = (page - 1) * pageSize
	const pageRows = await fillHistoricalLoginDates(rows.slice(start, start + pageSize))
	return {
		code: 200,
		msg: 'success',
		data: {
			summary,
			rows: pageRows,
			pagination: {
				current: page,
				size: pageSize,
				total,
				pageCount: Math.max(1, Math.ceil(total / pageSize))
			}
		}
	}
}

async function listLogs(event, context) {
	const scope = await businessAuth.getBusinessAuthScope(event, context)
	assertAuditAccess(scope)
	const page = Math.max(1, Math.floor(Number(event.page) || 1))
	const pageSize = [20, 50, 100].includes(Number(event.pageSize)) ? Number(event.pageSize) : 20
	const channel = ['miniapp', 'admin'].includes(event.channel) ? event.channel : ''
	const eventType = ['login', ...EVENT_TYPES].includes(event.eventType) ? event.eventType : ''
	const resultStatus = ['success', 'failure'].includes(event.resultStatus) ? event.resultStatus : ''
	const userId = compactId(event.userId)
	const startTime = Number(event.startTime) || 0
	const endTime = Number(event.endTime) || 0
	const keyword = clean(event.keyword, 80)
	const conditions = []
	if (channel) conditions.push({ channel })
	if (eventType) conditions.push({ event_type: eventType })
	if (resultStatus) conditions.push({ result: resultStatus })
	if (userId) conditions.push({ user_id: userId })
	if (startTime) conditions.push({ create_time: dbCmd.gte(startTime) })
	if (endTime) conditions.push({ create_time: dbCmd.lte(endTime) })
	if (keyword) {
		const keywordPattern = new RegExp(escapeRegExp(keyword), 'i')
		conditions.push(dbCmd.or([
			{ user_name: keywordPattern },
			{ username: keywordPattern },
			{ user_id: keywordPattern },
			{ page: keywordPattern },
			{ page_title: keywordPattern },
			{ action: keywordPattern },
			{ action_detail: keywordPattern },
			{ target_id: keywordPattern },
			{ ip: keywordPattern }
		]))
	}
	const where = combineWhere(conditions)
	const query = db.collection(LOG_COLLECTION).where(where)
	const [countRes, listRes] = await Promise.all([
		query.count(),
		db.collection(LOG_COLLECTION)
			.where(where)
			.orderBy('create_time', 'desc')
			.skip((page - 1) * pageSize)
			.limit(pageSize)
			.get()
	])
	return {
		code: 200,
		msg: 'success',
		data: {
			rows: listRes.data || [],
			pagination: {
				current: page,
				size: pageSize,
				total: Number(countRes.total) || 0,
				pageCount: Math.max(1, Math.ceil((Number(countRes.total) || 0) / pageSize))
			}
		}
	}
}

exports.main = async (event = {}, context) => {
	try {
		if (event.action === 'track') return trackActivity(event, context)
		if (event.action === 'users') return listUsers(event, context)
		if (event.action === 'logs') return listLogs(event, context)
		return { code: 400, msg: '未知操作' }
	} catch (error) {
		console.error('用户活动审计操作失败:', error)
		return businessAuth.toErrorResponse(error, '用户活动审计操作失败')
	}
}
