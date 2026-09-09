'use strict'

const core = require('./core')

const db = uniCloud.database()
const dbCmd = db.command
const GRANT_COLLECTION = 'wtdb-wechat-sub-grants'
const OUTBOX_COLLECTION = 'wtdb-wechat-message-outbox'
const RECORD_COLLECTION = 'wtdb-business-assess-record'
const TASK_COLLECTION = 'wtdb-report-tasks'
const USER_COLLECTION = 'uni-id-users'
const TOKEN_COLLECTION = 'wtdb-wechat-token-cache'
const TOKEN_ID = 'mp_weixin_access_token'
const MAX_SEND_ATTEMPTS = 3
const TOKEN_ERROR_CODES = [40001, 40014, 42001]
const PERMANENT_SEND_ERROR_CODES = [40003, 40037, 41030, 43101, 47003]

function clean(value, maxLength = 300) {
	return String(value == null ? '' : value).trim().slice(0, maxLength)
}

function compactId(value) {
	if (!value) return ''
	if (typeof value === 'string') return value
	if (value.$oid) return String(value.$oid)
	if (value._id) return compactId(value._id)
	return String(value)
}

function getTemplate(templateKey, { requireConfigured = true } = {}) {
	const template = core.TEMPLATES[templateKey]
	if (!template) throw new Error('不支持的微信订阅消息模板')
	if (requireConfigured && !clean(template.id, 100)) {
		throw new Error(`微信订阅消息模板未配置: ${templateKey}`)
	}
	return template
}

function publicTemplateConfig() {
	return Object.entries(core.TEMPLATES).reduce((result, [key, template]) => {
		result[key] = {
			id: clean(template.id, 100),
			title: clean(template.title, 40),
			enabled: Boolean(clean(template.id, 100))
		}
		return result
	}, {})
}

function grantDocumentId(recipientUserId, recordId, templateKey) {
	return core.stableId('wxgrant', `${compactId(recipientUserId)}:${clean(recordId, 200)}:${templateKey}`)
}

async function getGrantStatus({ recipientUserId, recordId, templateKey }) {
	getTemplate(templateKey)
	const normalizedRecordId = clean(recordId, 200)
	const userId = compactId(recipientUserId)
	if (!normalizedRecordId || !userId) throw new Error('订阅状态查询缺少评估批次或用户信息')
	const grantId = grantDocumentId(userId, normalizedRecordId, templateKey)
	const result = await db.collection(GRANT_COLLECTION).doc(grantId).get()
	const grant = result.data && result.data[0]
	return {
		grantId,
		templateKey,
		status: grant ? grant.status : 'not_requested'
	}
}

async function recordGrantDecision({ recipientUserId, record, templateKey, nativeResult }) {
	const template = getTemplate(templateKey)
	const recordId = clean(record && record.recordId, 200)
	const userId = compactId(recipientUserId)
	if (!recordId || !userId) throw new Error('订阅授权缺少评估批次或用户信息')

	const now = Date.now()
	const grantId = grantDocumentId(userId, recordId, templateKey)
	const status = core.normalizeDecision(nativeResult)
	const existing = await db.collection(GRANT_COLLECTION).doc(grantId).get()
	const oldGrant = existing.data && existing.data[0]
	if (oldGrant && ['accepted', 'consumed'].includes(oldGrant.status)) {
		if (oldGrant.status === 'accepted') {
			await activateAcceptedGrant(oldGrant, record)
		}
		return { grantId, templateKey, status: oldGrant.status }
	}
	const payload = {
		recipient_user_id: userId,
		record_id: recordId,
		task_id: clean(oldGrant && oldGrant.task_id, 200),
		template_key: templateKey,
		template_id: template.id,
		status,
		native_result: clean(nativeResult, 40),
		planned_end_time: Number(record.plannedEndTime) ||
			(Number(record.createTime) || now) + core.PLANNED_DURATION_MS,
		...(status === 'accepted' && templateKey === core.TEMPLATE_KEYS.ASSESSMENT_REMINDER
			? {
				next_check_time: Number(record.nextReminderAt) ||
					(Number(record.lastSaveTime || record.createTime) || now) + core.REMINDER_DELAY_MS
			}
			: {}),
		...(status === 'accepted' ? { accepted_time: now } : {}),
		create_time: Number(oldGrant && oldGrant.create_time) || now,
		update_time: now
	}
	await db.collection(GRANT_COLLECTION).doc(grantId).set(payload)
	if (status === 'accepted') {
		await activateAcceptedGrant({ _id: grantId, ...payload }, record)
	}
	return { grantId, templateKey, status }
}

async function cancelGrant(grant, reason) {
	const now = Date.now()
	await db.collection(GRANT_COLLECTION).doc(grant._id).update({
		status: 'cancelled',
		cancelled_time: now,
		last_error: clean(reason, 300),
		update_time: now
	})
}

async function getRecord(recordId) {
	if (!recordId) return null
	const result = await db.collection(RECORD_COLLECTION).where({ recordId }).limit(1).get()
	return result.data && result.data[0]
}

async function getTaskById(taskId) {
	if (!taskId) return null
	const result = await db.collection(TASK_COLLECTION).where({ taskId }).limit(1).get()
	return result.data && result.data[0]
}

async function getLatestTask(recordId) {
	if (!recordId) return null
	let result = await db.collection(TASK_COLLECTION)
		.where({ recordId })
		.orderBy('updateTime', 'desc')
		.limit(1)
		.get()
	if (result.data && result.data[0]) return result.data[0]

	result = await db.collection(TASK_COLLECTION)
		.where({ 'originalParams.query.recordId': recordId })
		.orderBy('updateTime', 'desc')
		.limit(1)
		.get()
	return result.data && result.data[0]
}

function isAssessmentCompleted(record) {
	return record && (record.isCompleted === true || record.assessmentStatus === 'completed')
}

async function enqueueOutbox({ grant, eventId, eventType, record, task = null, message }) {
	const outboxId = core.stableId('wxmsg', `${grant.recipient_user_id}:${eventId}`)
	const existing = await db.collection(OUTBOX_COLLECTION).doc(outboxId).get()
	const oldItem = existing.data && existing.data[0]
	if (oldItem && oldItem.status !== 'skipped') {
		return { created: false, outboxId, status: oldItem.status }
	}

	const now = Date.now()
	await db.collection(OUTBOX_COLLECTION).doc(outboxId).set({
		event_id: eventId,
		event_type: eventType,
		recipient_user_id: grant.recipient_user_id,
		grant_id: compactId(grant._id),
		record_id: record.recordId,
		task_id: clean(task && task.taskId, 200),
		template_key: grant.template_key,
		template_id: grant.template_id,
		page: message.page,
		data: message.data,
		expected_task_status: clean(task && task.status, 30),
		status: 'pending',
		attempts: oldItem ? Number(oldItem.attempts) || 0 : 0,
		next_retry_time: now,
		create_time: Number(oldItem && oldItem.create_time) || now,
		update_time: now
	})
	return { created: true, outboxId, status: 'pending' }
}

async function findAcceptedGrant(recordId, templateKey) {
	const result = await db.collection(GRANT_COLLECTION).where({
		record_id: recordId,
		template_key: templateKey,
		status: 'accepted'
	}).limit(1).get()
	return result.data && result.data[0]
}

async function activateAcceptedGrant(grant, record) {
	if (grant.template_key === core.TEMPLATE_KEYS.ASSESSMENT_REMINDER) {
		if (record.isAbandoned === true || isAssessmentCompleted(record)) {
			await cancelGrant(grant, record.isAbandoned === true ? '评估已重新开始' : '评估已完成')
			return { status: 'cancelled' }
		}
		const dueAt = Number(record.nextReminderAt) ||
			(Number(record.lastSaveTime || record.createTime) || Date.now()) + core.REMINDER_DELAY_MS
		await db.collection(GRANT_COLLECTION).doc(grant._id).update({
			next_check_time: dueAt,
			update_time: Date.now()
		})
		return { status: 'waiting_for_due_time', nextCheckTime: dueAt }
	}

	if (grant.template_key === core.TEMPLATE_KEYS.REPORT_RESULT) {
		const task = await getLatestTask(record.recordId)
		if (!task || !['completed', 'failed'].includes(task.status)) {
			return { status: 'waiting_for_report' }
		}
		return handleReportTerminal(task, { grant, record })
	}

	return { status: 'ignored' }
}

async function handleReportTerminal(task, resolved = {}) {
	const storedTask = await getTaskById(task?.taskId)
	const currentTask = storedTask || task
	if (!currentTask || !['completed', 'failed'].includes(currentTask.status)) {
		return { status: 'not_terminal' }
	}
	const record = resolved.record || await getRecord(currentTask.recordId)
	if (!record) return { status: 'record_missing' }
	const grant = resolved.grant || await findAcceptedGrant(
		record.recordId,
		core.TEMPLATE_KEYS.REPORT_RESULT
	)
	if (!grant) return { status: 'not_subscribed' }

	const message = core.buildReportMessage(currentTask, record)
	const queued = await enqueueOutbox({
		grant,
		eventId: `report_result:${currentTask.taskId}:${currentTask.status}`,
		eventType: message.eventType,
		record,
		task: currentTask,
		message
	})
	return processOutboxById(queued.outboxId)
}

async function processDueReminderGrants(limit = 200) {
	const now = Date.now()
	const pageSize = Math.min(500, Math.max(1, Number(limit) || 200))
	const result = await db.collection(GRANT_COLLECTION).where({
		template_key: core.TEMPLATE_KEYS.ASSESSMENT_REMINDER,
		status: 'accepted',
		next_check_time: dbCmd.lte(now)
	}).orderBy('next_check_time', 'asc').limit(pageSize).get()
	const summary = {
		checked: 0,
		sent: 0,
		cancelled: 0,
		deferred: 0,
		failed: 0
	}

	for (const grant of result.data || []) {
		summary.checked++
		try {
			const record = await getRecord(grant.record_id)
			if (!record) {
				await cancelGrant(grant, '评估记录不存在')
				summary.cancelled++
				continue
			}
			if (record.isAbandoned === true || isAssessmentCompleted(record)) {
				await cancelGrant(grant, record.isAbandoned === true ? '评估已重新开始' : '评估已完成')
				summary.cancelled++
				continue
			}

			const dueAt = Number(record.nextReminderAt) ||
				(Number(record.lastSaveTime || record.createTime) || now) + core.REMINDER_DELAY_MS
			if (dueAt > now) {
				await db.collection(GRANT_COLLECTION).doc(grant._id).update({
					next_check_time: dueAt,
					update_time: now
				})
				summary.deferred++
				continue
			}

			const message = core.buildReminderMessage(record)
			const queued = await enqueueOutbox({
				grant,
				eventId: `assessment_reminder:${record.recordId}`,
				eventType: message.eventType,
				record,
				message
			})
			const sendResult = await processOutboxById(queued.outboxId)
			if (sendResult.status === 'sent') summary.sent++
			else if (sendResult.status === 'skipped') summary.cancelled++
			else summary.failed++
		} catch (error) {
			summary.failed++
			console.error('处理到期量表提醒失败:', {
				grantId: compactId(grant._id),
				recordId: grant.record_id,
				message: clean(error.message, 300)
			})
		}
	}
	return summary
}

function getWechatConfig() {
	let createConfig
	try {
		createConfig = require('uni-config-center')
	} catch (_) {
		createConfig = require('../../../../uni_modules/uni-config-center/uniCloud/cloudfunctions/common/uni-config-center')
	}
	const config = createConfig({ pluginId: 'uni-id' }).config()
	const weixin = config && config['mp-weixin'] && config['mp-weixin'].oauth && config['mp-weixin'].oauth.weixin
	if (!weixin || !weixin.appid || !weixin.appsecret) throw new Error('小程序微信配置不完整')
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
		const error = new Error(data.errmsg || '获取微信调用凭证失败')
		error.errcode = Number(data.errcode) || 0
		throw error
	}
	const now = Date.now()
	await db.collection(TOKEN_COLLECTION).doc(TOKEN_ID).set({
		access_token: data.access_token,
		expires_at: now + Math.max(300, Number(data.expires_in) || 7200) * 1000,
		update_time: now
	})
	return data.access_token
}

async function callSendApi(item, forceRefresh = false) {
	const token = await getAccessToken(forceRefresh)
	return requestJson(
		`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${encodeURIComponent(token)}`,
		{
			method: 'POST',
			contentType: 'json',
			data: {
				touser: item.openid,
				template_id: item.template_id,
				page: item.page,
				lang: 'zh_CN',
				data: item.data
			}
		}
	)
}

async function sendSubscriptionMessage(item) {
	let response = await callSendApi(item, false)
	if (TOKEN_ERROR_CODES.includes(Number(response.errcode))) {
		response = await callSendApi(item, true)
	}
	if (Number(response.errcode) !== 0) {
		const error = new Error(response.errmsg || '微信订阅消息发送失败')
		error.errcode = Number(response.errcode) || 0
		throw error
	}
	return response
}

function getMiniProgramOpenId(user) {
	const openid = user && user.wx_openid
	if (typeof openid === 'string') return clean(openid, 128)
	return clean(openid && openid.mp, 128)
}

async function markSkipped(item, reason, { cancelGrantStatus = '' } = {}) {
	const now = Date.now()
	await db.collection(OUTBOX_COLLECTION).doc(item._id).update({
		status: 'skipped',
		last_error: clean(reason, 300),
		update_time: now
	})
	if (cancelGrantStatus && item.grant_id) {
		await db.collection(GRANT_COLLECTION).doc(item.grant_id).update({
			status: cancelGrantStatus,
			last_error: clean(reason, 300),
			update_time: now
		})
	}
}

async function validateOutboxItem(item) {
	const [grantRes, record] = await Promise.all([
		db.collection(GRANT_COLLECTION).doc(item.grant_id).get(),
		getRecord(item.record_id)
	])
	const grant = grantRes.data && grantRes.data[0]
	if (!grant || grant.status !== 'accepted') return { valid: false, reason: '订阅授权已不可用' }
	if (!record) return { valid: false, reason: '评估记录不存在', cancelGrantStatus: 'cancelled' }

	if (item.event_type === 'assessment_reminder') {
		if (record.isAbandoned === true || isAssessmentCompleted(record)) {
			return { valid: false, reason: '评估已完成或已重新开始', cancelGrantStatus: 'cancelled' }
		}
		const dueAt = Number(record.nextReminderAt) ||
			(Number(record.lastSaveTime || record.createTime) || Date.now()) + core.REMINDER_DELAY_MS
		if (dueAt > Date.now()) return { valid: false, reason: '评估近期有新进度' }
		return { valid: true, grant, record }
	}

	const task = await getTaskById(item.task_id)
	if (!task || task.status !== item.expected_task_status || !['completed', 'failed'].includes(task.status)) {
		return { valid: false, reason: '报告任务状态已变化' }
	}
	return { valid: true, grant, record, task }
}

async function markSent(item, response) {
	const now = Date.now()
	// 微信已返回成功后，不能再把该任务放回重试队列，否则可能重复推送。
	// 因此先固化发送结果，其余状态作最大努力回写，回写失败不再触发发送重试。
	try {
		await db.collection(OUTBOX_COLLECTION).doc(item._id).update({
			status: 'sent',
			wechat_msgid: clean(response.msgid, 100),
			wechat_errcode: 0,
			sent_time: now,
			update_time: now
		})
	} catch (error) {
		console.error('微信订阅消息已发送，但发件箱状态回写失败:', {
			eventId: item.event_id,
			message: clean(error.message, 300)
		})
		return
	}

	try {
		await db.collection(GRANT_COLLECTION).doc(item.grant_id).update({
			status: 'consumed',
			consumed_event_id: item.event_id,
			consumed_time: now,
			update_time: now
		})
	} catch (error) {
		console.warn('微信订阅授权消耗状态回写失败:', clean(error.message, 300))
	}
	if (item.event_type === 'assessment_reminder') {
		try {
			await db.collection(RECORD_COLLECTION).where({ recordId: item.record_id }).update({
				reminderSentAt: now,
				updateTime: now
			})
		} catch (error) {
			console.warn('评估记录提醒时间回写失败:', clean(error.message, 300))
		}
	}
}

async function markSendFailed(item, error) {
	const now = Date.now()
	const attempts = Number(item.attempts) + 1
	const errcode = Number(error.errcode) || 0
	const permanent = PERMANENT_SEND_ERROR_CODES.includes(errcode)
	const exhausted = attempts >= MAX_SEND_ATTEMPTS
	await db.collection(OUTBOX_COLLECTION).doc(item._id).update({
		status: permanent || exhausted ? 'failed' : 'pending',
		attempts,
		next_retry_time: now,
		wechat_errcode: errcode,
		last_error: clean(error.message, 300),
		update_time: now
	})
	if ((permanent || exhausted) && item.grant_id) {
		await db.collection(GRANT_COLLECTION).doc(item.grant_id).update({
			status: 'unavailable',
			last_error: clean(error.message, 300),
			update_time: now
		})
	}
	return { retryable: !permanent && !exhausted, attempts }
}

async function processOutboxById(outboxId) {
	const normalizedOutboxId = clean(outboxId, 200)
	if (!normalizedOutboxId) throw new Error('微信发送任务ID不能为空')

	for (let retry = 0; retry < MAX_SEND_ATTEMPTS; retry++) {
		const itemResult = await db.collection(OUTBOX_COLLECTION).doc(normalizedOutboxId).get()
		const item = itemResult.data && itemResult.data[0]
		if (!item) return { status: 'missing', outboxId: normalizedOutboxId }
		if (['sent', 'failed', 'skipped'].includes(item.status)) {
			return { status: item.status, outboxId: normalizedOutboxId }
		}
		if (item.status === 'processing') {
			return { status: 'processing', outboxId: normalizedOutboxId }
		}

		const lock = await db.collection(OUTBOX_COLLECTION).where({
			_id: normalizedOutboxId,
			status: 'pending'
		}).update({ status: 'processing', update_time: Date.now() })
		if (Number(lock.updated || lock.affectedDocs || 0) < 1) {
			return { status: 'processing', outboxId: normalizedOutboxId }
		}

		try {
			const validation = await validateOutboxItem(item)
			if (!validation.valid) {
				await markSkipped(item, validation.reason, { cancelGrantStatus: validation.cancelGrantStatus })
				return { status: 'skipped', reason: validation.reason, outboxId: normalizedOutboxId }
			}

			const userRes = await db.collection(USER_COLLECTION).doc(item.recipient_user_id).get()
			const openid = getMiniProgramOpenId(userRes.data && userRes.data[0])
			if (!openid) {
				await markSkipped(item, '接收人未绑定微信小程序身份', { cancelGrantStatus: 'unavailable' })
				return { status: 'skipped', reason: '接收人未绑定微信小程序身份', outboxId: normalizedOutboxId }
			}

			const response = await sendSubscriptionMessage({ ...item, openid })
			await markSent(item, response)
			return { status: 'sent', outboxId: normalizedOutboxId }
		} catch (error) {
			console.error('微信订阅消息发送失败:', {
				eventId: item.event_id,
				errcode: Number(error.errcode) || 0,
				message: clean(error.message, 300)
			})
			const failure = await markSendFailed(item, error)
			if (!failure.retryable) {
				return { status: 'failed', outboxId: normalizedOutboxId, attempts: failure.attempts }
			}
			await new Promise(resolve => setTimeout(resolve, 250 * (retry + 1)))
		}
	}

	return { status: 'failed', outboxId: normalizedOutboxId }
}

module.exports = {
	...core,
	publicTemplateConfig,
	getGrantStatus,
	recordGrantDecision,
	getRecord,
	processDueReminderGrants,
	handleReportTerminal,
	processOutboxById
}
