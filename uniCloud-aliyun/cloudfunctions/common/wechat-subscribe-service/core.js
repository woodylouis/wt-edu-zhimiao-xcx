'use strict'

const crypto = require('crypto')

const DAY_MS = 24 * 60 * 60 * 1000
const REMINDER_DELAY_MS = DAY_MS
const PLANNED_DURATION_MS = 3 * DAY_MS

const TEMPLATE_KEYS = Object.freeze({
	ASSESSMENT_REMINDER: 'assessment_reminder',
	REPORT_RESULT: 'report_result'
})

const TEMPLATES = Object.freeze({
	[TEMPLATE_KEYS.ASSESSMENT_REMINDER]: {
		id: 'wbFkmIdPNgpDfLPEGjudl3QMJXuWtxSZd9mzkZVPKZ0',
		title: '量表任务未完成通知'
	},
	[TEMPLATE_KEYS.REPORT_RESULT]: {
		id: 'VlSHDV8Vz0fiR4oV0plxOJlSwjAgLcueTP3pIV4F5AE',
		title: '测评报告生成通知'
	}
})

function stableId(prefix, value) {
	const digest = crypto.createHash('sha256').update(String(value || '')).digest('hex')
	return `${prefix}_${digest.slice(0, 40)}`
}

function truncate(value, maxLength) {
	return Array.from(String(value == null ? '' : value).trim()).slice(0, maxLength).join('')
}

function formatWechatTime(value) {
	const date = new Date(Number(value) || Date.now())
	const parts = new Intl.DateTimeFormat('zh-CN', {
		timeZone: 'Asia/Shanghai',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	}).formatToParts(date).reduce((result, part) => {
		result[part.type] = part.value
		return result
	}, {})
	return `${parts.year}年${parts.month}月${parts.day}日 ${parts.hour}:${parts.minute}`
}

function normalizeDecision(value) {
	const decision = String(value || '').trim()
	if (decision === 'accept' || decision === 'acceptWithAudio') return 'accepted'
	if (decision === 'reject') return 'rejected'
	if (decision === 'ban') return 'banned'
	if (decision === 'filter') return 'filtered'
	if (decision === 'decline') return 'declined'
	return 'error'
}

function buildReminderMessage(record = {}) {
	const plannedEndTime = Number(record.plannedEndTime) ||
		(Number(record.createTime) || Date.now()) + PLANNED_DURATION_MS
	return {
		eventType: 'assessment_reminder',
		page: `pages/assessment/listMoudules?recordId=${encodeURIComponent(record.recordId || '')}`,
		data: {
			thing1: { value: truncate(record.assessmentTitle || '儿童成长评估', 20) },
			phrase2: { value: '未完成' },
			time4: { value: formatWechatTime(plannedEndTime) },
			thing5: { value: '评估尚未完成，请点击继续' }
		}
	}
}

function buildReportMessage(task = {}, record = {}) {
	const succeeded = task.status === 'completed'
	const reportId = task.report && task.report.reportId
	const page = succeeded
		? `pages/assessment/report-v2?isHistory=true&recordId=${encodeURIComponent(record.recordId || task.recordId || '')}`
		: `pages/assessment/afterAssess?taskId=${encodeURIComponent(task.taskId || '')}`
	const title = truncate(`${record.assessmentTitle || '儿童成长评估'}报告`, 20)
	return {
		eventType: succeeded ? 'report_succeeded' : 'report_failed',
		page: reportId && succeeded
			? `pages/assessment/report-v2?isHistory=true&reportId=${encodeURIComponent(reportId)}`
			: page,
		data: {
			thing1: { value: title },
			phrase2: { value: succeeded ? '生成成功' : '生成失败' },
			time3: { value: formatWechatTime(task.endTime || task.updateTime || Date.now()) },
			thing4: {
				value: succeeded ? '点击进入小程序查看报告' : '报告生成失败，请稍后重试'
			}
		}
	}
}

module.exports = {
	DAY_MS,
	REMINDER_DELAY_MS,
	PLANNED_DURATION_MS,
	TEMPLATE_KEYS,
	TEMPLATES,
	stableId,
	truncate,
	formatWechatTime,
	normalizeDecision,
	buildReminderMessage,
	buildReportMessage
}
