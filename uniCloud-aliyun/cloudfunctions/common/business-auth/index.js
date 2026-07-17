'use strict'

const path = require('path')
const Module = require('module')

function addModulePath(dir) {
	const paths = process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : []
	if (!paths.includes(dir)) {
		paths.push(dir)
		process.env.NODE_PATH = paths.join(path.delimiter)
		Module._initPaths()
	}
}

let uniID
try {
	uniID = require('uni-id-common')
} catch (error) {
	addModulePath(path.join(__dirname, '../../../../uni_modules/uni-id-common/uniCloud/cloudfunctions/common'))
	addModulePath(path.join(__dirname, '../../../../uni_modules/uni-config-center/uniCloud/cloudfunctions/common'))
	uniID = require('uni-id-common')
}

const db = uniCloud.database()

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
	if (value.$oid) return value.$oid
	if (value._id) return compactId(value._id)
	return String(value)
}

function normalizeArray(value) {
	if (!value) return []
	return Array.isArray(value) ? value : [value]
}

function hasRole(roles, roleId) {
	return normalizeArray(roles).includes(roleId)
}

function hasGlobalBusinessAccess(roles) {
	return hasRole(roles, 'admin') || hasRole(roles, 'diana-admin')
}

async function getLinkedUserIds(uid) {
	const ids = new Set([uid])
	const userRes = await db.collection('uni-id-users')
		.where({ _id: uid })
		.field({ mobile: true })
		.limit(1)
		.get()
	const mobile = userRes.data && userRes.data[0] && userRes.data[0].mobile
	if (!mobile) return [...ids]

	const linkedRes = await db.collection('uni-id-users')
		.where({ mobile })
		.field({ _id: true })
		.get()
	;(linkedRes.data || []).forEach(user => {
		const linkedId = compactId(user._id)
		if (linkedId) ids.add(linkedId)
	})
	return [...ids]
}

async function getDirectedSchools(userIds) {
	if (!userIds.length) return []
	const res = await db.collection('wtdb-business-school-list')
		.where({
			director_user_id: db.command.in(userIds)
		})
		.field({
			_id: true,
			school_id: true,
			name: true,
			director_user_id: true
		})
		.get()
	return res.data || []
}

async function getBusinessAuthScope(event, context) {
	const token = event && event.uniIdToken
	if (!token) throw new AuthError(401, '请先登录')

	let tokenRes
	try {
		tokenRes = await uniID.createInstance({ context }).checkToken(token)
	} catch (error) {
		throw new AuthError(401, '登录状态已失效，请重新登录')
	}
	if (!tokenRes || tokenRes.errCode || !tokenRes.uid) {
		throw new AuthError(401, '登录状态已失效，请重新登录')
	}

	const uid = compactId(tokenRes.uid)
	const roles = normalizeArray(tokenRes.role)
	const isSystemAdmin = hasRole(roles, 'admin')
	const isBusinessAdmin = hasRole(roles, 'diana-admin')
	const isGlobalBusinessAdmin = hasGlobalBusinessAccess(roles)
	const userIds = isGlobalBusinessAdmin ? [uid] : await getLinkedUserIds(uid)
	const schools = isGlobalBusinessAdmin ? [] : await getDirectedSchools(userIds)

	return {
		uid,
		roles,
		permissions: normalizeArray(tokenRes.permission),
		isSystemAdmin,
		isBusinessAdmin,
		isGlobalBusinessAdmin,
		userIds,
		schools,
		schoolIds: schools.map(item => item.school_id).filter(Boolean)
	}
}

function canAccessSchool(scope, school) {
	if (!scope || !school) return false
	if (scope.isGlobalBusinessAdmin) return true
	const directorId = compactId(school.director_user_id)
	return !!directorId && scope.userIds.includes(directorId)
}

function assertSchoolAccess(scope, school, message = '无权管理该学校的业务') {
	if (!canAccessSchool(scope, school)) throw new AuthError(403, message)
}

function toErrorResponse(error, fallbackMessage = '请求处理失败') {
	if (error && error.isAuthError) {
		return { code: error.code, msg: error.message }
	}
	return {
		code: 500,
		msg: `${fallbackMessage}: ${error && error.message ? error.message : '未知错误'}`
	}
}

module.exports = {
	AuthError,
	compactId,
	normalizeArray,
	hasRole,
	hasGlobalBusinessAccess,
	getBusinessAuthScope,
	canAccessSchool,
	assertSchoolAccess,
	toErrorResponse
}
