'use strict'

let businessAuth
let createConfig
try {
	businessAuth = require('business-auth')
	createConfig = require('uni-config-center')
} catch (_) {
	businessAuth = require('../common/business-auth')
	createConfig = require('../../../uni_modules/uni-config-center/uniCloud/cloudfunctions/common/uni-config-center')
}

const db = uniCloud.database()
const dbCmd = db.command
const CLASS_COLLECTION = 'wtdb-business-class-list'
const MEMBER_COLLECTION = 'wtdb-business-class-member'
const TOKEN_COLLECTION = 'wtdb-wechat-token-cache'
const TOKEN_ID = 'mp_weixin_access_token'

function clean(value, maxLength = 100) {
	return String(value == null ? '' : value).trim().slice(0, maxLength)
}

function getClassName(classInfo = {}) {
	if (classInfo.nickname) return clean(classInfo.nickname, 100)
	const grade = clean(classInfo.grade, 30)
	const group = clean(classInfo.class, 20)
	return grade || group ? `${grade}${group}${group && !group.endsWith('班') ? '班' : ''}` : '未命名班级'
}

async function assertInviteAccess(scope, classId) {
	if (!classId) throw new businessAuth.AuthError(400, '缺少班级ID')
	const result = await db.collection(CLASS_COLLECTION).doc(classId).get()
	const classInfo = result.data && result.data[0]
	if (!classInfo) throw new businessAuth.AuthError(404, '班级不存在')
	if (scope.isGlobalBusinessAdmin ||
		(scope.schoolIds || []).includes(classInfo.school_id) ||
		(scope.headTeacherClassIds || []).includes(classId)) {
		return classInfo
	}
	const memberRes = await db.collection(MEMBER_COLLECTION)
		.where({ class_id: classId, user_id: dbCmd.in(scope.userIds), role: 'teacher' })
		.limit(1)
		.get()
	if (!memberRes.data || !memberRes.data.length) {
		throw new businessAuth.AuthError(403, '只有该班级的老师可以生成家长邀请码')
	}
	return classInfo
}

function getWechatConfig() {
	const config = createConfig({ pluginId: 'uni-id' }).config()
	const weixin = config && config['mp-weixin'] && config['mp-weixin'].oauth && config['mp-weixin'].oauth.weixin
	if (!weixin || !weixin.appid || !weixin.appsecret) {
		throw new businessAuth.AuthError(500, '小程序微信配置不完整')
	}
	return { appid: weixin.appid, appsecret: weixin.appsecret }
}

async function requestJson(url, options = {}) {
	const response = await uniCloud.httpclient.request(url, {
		...options,
		dataType: 'json',
		timeout: 10000
	})
	if (response.status < 200 || response.status >= 300) {
		throw new Error(`微信接口请求失败（${response.status}）`)
	}
	return response.data || {}
}

async function getAccessToken(forceRefresh = false) {
	if (!forceRefresh) {
		const cached = await db.collection(TOKEN_COLLECTION).doc(TOKEN_ID).get()
		const token = cached.data && cached.data[0]
		if (token && token.access_token && Number(token.expires_at) > Date.now() + 120000) {
			return token.access_token
		}
	}
	const { appid, appsecret } = getWechatConfig()
	const data = await requestJson('https://api.weixin.qq.com/cgi-bin/token', {
		method: 'GET',
		data: { grant_type: 'client_credential', appid, secret: appsecret }
	})
	if (!data.access_token) {
		throw new Error(data.errmsg || '获取微信调用凭证失败')
	}
	const now = Date.now()
	await db.collection(TOKEN_COLLECTION).doc(TOKEN_ID).set({
		access_token: data.access_token,
		expires_at: now + Math.max(300, Number(data.expires_in) || 7200) * 1000,
		update_time: now
	})
	return data.access_token
}

function parseCodeResponse(data) {
	const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data || '')
	const preview = buffer.slice(0, 200).toString('utf8').trim()
	if (preview.startsWith('{')) {
		try {
			return { error: JSON.parse(buffer.toString('utf8')) }
		} catch (_) {
			return { error: { errmsg: '微信返回了无效数据' } }
		}
	}
	return { buffer }
}

async function requestInviteCode(accessToken, scene) {
	const response = await uniCloud.httpclient.request(
		`https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${encodeURIComponent(accessToken)}`,
		{
			method: 'POST',
			contentType: 'json',
			timeout: 15000,
			data: {
				scene,
				page: 'pages/guardian/join',
				check_path: false,
				env_version: 'release',
				width: 430,
				auto_color: false,
				line_color: { r: 57, g: 47, b: 89 },
				is_hyaline: false
			}
		}
	)
	if (response.status < 200 || response.status >= 300) {
		throw new Error(`微信小程序码生成失败（${response.status}）`)
	}
	return parseCodeResponse(response.data)
}

async function generateCode(classInfo) {
	let accessToken = await getAccessToken(false)
	let result = await requestInviteCode(accessToken, clean(classInfo.code, 20))
	if (result.error && [40001, 40014, 42001].includes(Number(result.error.errcode))) {
		accessToken = await getAccessToken(true)
		result = await requestInviteCode(accessToken, clean(classInfo.code, 20))
	}
	if (result.error) {
		throw new Error(result.error.errmsg || '微信小程序码生成失败')
	}
	return `data:image/png;base64,${result.buffer.toString('base64')}`
}

exports.main = async (event = {}, context) => {
	try {
		const scope = await businessAuth.getBusinessAuthScope(event, context)
		const classId = businessAuth.compactId(event.classId || event.class_id)
		const classInfo = await assertInviteAccess(scope, classId)
		if (!clean(classInfo.code, 20)) throw new businessAuth.AuthError(400, '该班级尚未设置班级码')
		const imageBase64 = await generateCode(classInfo)
		return {
			code: 200,
			message: '邀请码生成成功',
			data: {
				classId: businessAuth.compactId(classInfo._id),
				classCode: clean(classInfo.code, 20),
				className: getClassName(classInfo),
				imageBase64
			}
		}
	} catch (error) {
		console.error('生成家长邀请码失败:', error)
		const response = businessAuth.toErrorResponse(error, '生成家长邀请码失败')
		return { ...response, message: response.msg }
	}
}
