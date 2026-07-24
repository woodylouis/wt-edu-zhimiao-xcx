'use strict'

const crypto = require('crypto')
const aiModel = require('deepseek-client')
const {
	applyManualPlanAdjustments,
	assemblePlanFromParts,
	buildOverviewPrompt,
	buildSystemPrompt,
	buildWeekPrompt,
	extractJsonObject,
	normalizeDateRange,
	normalizeFocusDomains,
	normalizeGeneratedWeek,
	normalizePlanOverview
} = require('./lib/intervention-plan')

const db = uniCloud.database()
const dbCmd = db.command
const tasks = db.collection('wtdb-intervention-plan-tasks')
const reports = db.collection('wtdb-business-assess-report')

const ACTIVE_STATUSES = ['pending', 'generating_overview', 'generating_weeks', 'assembling']
const ERROR_STATUSES = ['failed', 'timed_out']
const REQUEST_TIMEOUT_MS = 70000
const REQUEST_ATTEMPTS = 2
const LEASE_MS = 100000

class TaskError extends Error {
	constructor(code, message, statusCode = 400) {
		super(message)
		this.code = code
		this.statusCode = statusCode
	}
}

function compactId(value) {
	if (!value) return ''
	if (typeof value === 'string') return value
	if (value.$oid) return String(value.$oid)
	if (value._id) return compactId(value._id)
	return String(value)
}

function createTaskId() {
	return `ip_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`
}

function isActiveStatus(status) {
	return ACTIVE_STATUSES.includes(status)
}

function isErrorStatus(status) {
	return ERROR_STATUSES.includes(status)
}

function hasPlanOverview(value) {
	return !!(
		value &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		value.title &&
		value.summary &&
		Array.isArray(value.caregiverGuidance) &&
		value.caregiverGuidance.length
	)
}

function statusText(status) {
	return {
		pending: '等待后台处理',
		generating_overview: '正在规划训练主线',
		generating_weeks: '正在生成每周训练安排',
		assembling: '正在检查并保存计划',
		completed: '训练计划已生成',
		failed: '生成失败',
		timed_out: '生成超时'
	}[status] || status || '等待后台处理'
}

function safeDiagnosticMessage(value) {
	return String(value || '')
		.split(/\r?\n/)[0]
		.replace(/authorization:\s*\S+/ig, 'authorization: [已隐藏]')
		.replace(/api[_-]?key[=:]\s*\S+/ig, 'api-key=[已隐藏]')
		.trim()
		.slice(0, 300)
}

function publicTask(task) {
	if (!task) return null
	return {
		taskId: task.taskId || '',
		reportId: task.reportId || '',
		status: task.status || 'pending',
		statusText: statusText(task.status),
		progress: Math.max(0, Math.min(100, Number(task.progress) || 0)),
		stage: task.stage || '',
		message: task.message || statusText(task.status),
		startDate: task.startDate || '',
		endDate: task.endDate || '',
		totalWeeks: Number(task.totalWeeks) || 0,
		focusDomains: Array.isArray(task.focusDomains) ? task.focusDomains : [],
		completedWeeks: Number(task.completedWeeks) || 0,
		currentWeek: Number(task.currentWeek) || 0,
		attempt: Number(task.attempt) || 0,
		maxAttempts: Number(task.maxAttempts) || REQUEST_ATTEMPTS,
		errorCode: task.errorCode || '',
		errorMessage: task.errorMessage || '',
		diagnosticMessage: safeDiagnosticMessage(task.technicalError),
		retryable: task.retryable !== false,
		retryCount: Number(task.retryCount) || 0,
		estimatedSeconds: Number(task.estimatedSeconds) || 0,
		createdAt: Number(task.createdAt) || 0,
		startedAt: Number(task.startedAt) || 0,
		updatedAt: Number(task.updatedAt) || 0,
		deadlineAt: Number(task.deadlineAt) || 0,
		completedAt: Number(task.completedAt) || 0,
		provider: task.provider || '',
		model: task.model || ''
	}
}

function buildDeadline(now, weeksCount) {
	return now + Math.max(20 * 60 * 1000, (10 + Number(weeksCount) * 3) * 60 * 1000)
}

function estimateSeconds(weeksCount) {
	return 30 + Number(weeksCount) * 45
}

function sameStringArray(left, right) {
	const leftValues = Array.isArray(left) ? [...left].sort() : []
	const rightValues = Array.isArray(right) ? [...right].sort() : []
	return leftValues.length === rightValues.length &&
		leftValues.every((item, index) => item === rightValues[index])
}

function classifyError(error) {
	const raw = String(error?.message || error || '未知错误')
	if (/timeout|超时|timed out|ETIMEDOUT/i.test(raw)) {
		return {
			code: 'AI_TIMEOUT',
			message: 'AI 模型响应超时，系统自动重试后仍未在限定时间内完成。',
			retryable: true,
			technicalMessage: raw.slice(0, 800)
		}
	}
	if (/finish_reason=length|输出.*(?:截断|长度限制)|达到.*token.*上限/i.test(raw)) {
		return {
			code: 'AI_OUTPUT_TRUNCATED',
			message: 'AI 模型返回内容达到长度上限，自动扩大输出空间后仍未完成。',
			retryable: true,
			technicalMessage: raw.slice(0, 800)
		}
	}
	if (/返回.*JSON|JSON.*解析|内容不足|不能为空|应包含|应返回|无效内容/i.test(raw)) {
		return {
			code: 'INVALID_AI_RESPONSE',
			message: 'AI 模型返回的计划内容不完整，未覆盖已有计划。',
			retryable: true,
			technicalMessage: raw.slice(0, 800)
		}
	}
	if (/401|403|API.?KEY|未配置/i.test(raw)) {
		return {
			code: 'AI_CONFIGURATION_ERROR',
			message: 'AI 服务配置异常，请联系管理员检查模型与 API Key 配置。',
			retryable: false,
			technicalMessage: raw.slice(0, 800)
		}
	}
	if (/ECONNRESET|ECONNREFUSED|EPIPE|ENOTFOUND|socket|network|连接.*(中断|重置|失败)/i.test(raw)) {
		return {
			code: 'AI_NETWORK_ERROR',
			message: '连接 AI 模型服务时网络中断，系统已保留当前生成进度。',
			retryable: true,
			technicalMessage: raw.slice(0, 800)
		}
	}
	if (/Cannot find module|is not a function|MODULE_NOT_FOUND/i.test(raw)) {
		return {
			code: 'DEPENDENCY_ERROR',
			message: '训练计划云函数依赖加载异常，请管理员重新上传公共模块及云函数。',
			retryable: false,
			technicalMessage: raw.slice(0, 800)
		}
	}
	if (/Cannot create field|schema|validation|database|collection|document|数据库|数据.*(保存|更新).*失败/i.test(raw)) {
		return {
			code: 'TASK_STORAGE_ERROR',
			message: '训练计划生成状态保存失败，请检查任务集合和报告表 Schema 是否已更新。',
			retryable: true,
			technicalMessage: raw.slice(0, 800)
		}
	}
	return {
		code: 'GENERATION_ERROR',
		message: '训练计划生成遇到未分类异常，已保留当前进度。',
		retryable: true,
		technicalMessage: raw.slice(0, 800)
	}
}

async function findTask(taskId) {
	if (!taskId) return null
	const result = await tasks.where({ taskId }).limit(1).get()
	return result.data?.[0] || null
}

async function findReportByDocumentId(documentId) {
	if (!documentId) return null
	const result = await reports.doc(documentId).get()
	return result.data?.[0] || null
}

async function findLatestTask(reportDocumentId) {
	if (!reportDocumentId) return null
	const result = await tasks.where({ reportDocumentId: compactId(reportDocumentId) })
		.orderBy('createdAt', 'desc')
		.limit(1)
		.get()
	return result.data?.[0] || null
}

function reportTaskFields(task) {
	const result = {
		interventionPlanGeneration: publicTask(task),
		interventionPlanUpdatedAt: Number(task.updatedAt) || Date.now(),
		updateTime: Number(task.updatedAt) || Date.now()
	}
	if (isActiveStatus(task.status)) result.interventionPlanStatus = 'generating'
	if (isErrorStatus(task.status)) result.interventionPlanStatus = 'failed'
	if (task.status === 'completed') result.interventionPlanStatus = 'completed'
	return result
}

async function persistTask(task, updates, reportUpdates = {}) {
	const now = Date.now()
	const next = { ...updates, updatedAt: updates.updatedAt || now }
	await tasks.doc(task._id).update(next)
	Object.assign(task, next)
	await reports.doc(task.reportDocumentId).update({
		...reportTaskFields(task),
		...reportUpdates
	})
	return task
}

async function failTask(task, error, forcedCode = '') {
	const classified = classifyError(error)
	if (forcedCode === 'TASK_TIMEOUT') {
		classified.code = 'TASK_TIMEOUT'
		classified.message = '任务超过预计处理时限，已停止继续生成。已完成的周次会保留，可点击重试后继续。'
		classified.retryable = true
	}
	await persistTask(task, {
		status: forcedCode === 'TASK_TIMEOUT' ? 'timed_out' : 'failed',
		stage: 'error',
		message: classified.message,
		errorCode: classified.code,
		errorMessage: classified.message,
		technicalError: classified.technicalMessage,
		retryable: classified.retryable,
		failedAt: Date.now(),
		workerId: '',
		leaseUntil: 0
	})
	return task
}

async function reconcileTimeout(task) {
	if (task && isActiveStatus(task.status) && Number(task.deadlineAt) > 0 && Date.now() > Number(task.deadlineAt)) {
		await failTask(task, new Error('task deadline exceeded'), 'TASK_TIMEOUT')
	}
	return task
}

async function createTask({ report, requestedBy, startDate, endDate, weeksCount, focusDomains = null, forceRegenerate = false }) {
	const reportDocumentId = compactId(report?._id)
	if (!reportDocumentId) throw new TaskError('REPORT_NOT_FOUND', '报告不存在', 404)
	const normalizedFocusDomains = normalizeFocusDomains(report, focusDomains)
	const defaultFocusDomains = normalizeFocusDomains(report)
	const existing = report.interventionPlan
	if (existing) {
		throw new TaskError(
			'PLAN_ALREADY_EXISTS',
			'该报告已生成训练方案；请使用手动调整，不支持重复调用 AI 覆盖生成',
			409
		)
	}

	const latest = await findLatestTask(reportDocumentId)
	await reconcileTimeout(latest)
	if (latest && isActiveStatus(latest.status)) {
		const sameRange = latest.startDate === startDate &&
			latest.endDate === endDate &&
			Number(latest.totalWeeks) === Number(weeksCount)
		const latestFocusDomains = Array.isArray(latest.focusDomains) && latest.focusDomains.length
			? latest.focusDomains
			: defaultFocusDomains
		if (sameRange && sameStringArray(latestFocusDomains, normalizedFocusDomains)) {
			return { task: latest, reused: true }
		}
		throw new TaskError('TASK_ALREADY_RUNNING', '当前报告已有训练计划正在生成，请等待完成后再调整日期或训练方向。', 409)
	}
	if (latest && isErrorStatus(latest.status)) {
		throw new TaskError('TASK_RETRY_REQUIRED', '已有失败的训练方案任务，请从原任务进度重试', 409)
	}
	if (latest?.status === 'completed') {
		throw new TaskError('PLAN_STATE_INVALID', '训练方案任务已完成但方案数据异常，请联系管理员核查', 409)
	}

	const now = Date.now()
	const modelInfo = await aiModel.getActiveModelInfo()
	const task = {
		taskId: createTaskId(),
		reportId: String(report.reportId || reportDocumentId),
		reportDocumentId,
		childId: compactId(report.childId || report.child_id),
		requestedBy: compactId(requestedBy),
		status: 'pending',
		stage: 'queued',
		message: '任务已创建，等待后台开始处理',
		progress: 0,
		startDate,
		endDate,
		totalWeeks: Number(weeksCount),
		focusDomains: normalizedFocusDomains,
		completedWeeks: 0,
		currentWeek: 0,
		attempt: 0,
		maxAttempts: REQUEST_ATTEMPTS,
		overview: {},
		weeklyPlans: [],
		providerId: modelInfo.id,
		provider: modelInfo.provider,
		model: modelInfo.model,
		sourceAnalysisRevision: Math.max(1, Number(report.analysisRevision) || 1),
		retryable: true,
		retryCount: 0,
		estimatedSeconds: estimateSeconds(weeksCount),
		createdAt: now,
		startedAt: 0,
		updatedAt: now,
		deadlineAt: buildDeadline(now, weeksCount),
		completedAt: 0,
		workerId: '',
		leaseUntil: 0,
		errorCode: '',
		errorMessage: '',
		technicalError: ''
	}
	const result = await tasks.add(task)
	task._id = result.id
	await reports.doc(reportDocumentId).update(reportTaskFields(task))
	return { task, reused: false }
}

async function retryTask(task, report) {
	if (!task || !report || compactId(task.reportDocumentId) !== compactId(report._id)) {
		throw new TaskError('TASK_NOT_FOUND', '训练计划任务不存在', 404)
	}
	if (report.interventionPlan) {
		throw new TaskError('PLAN_ALREADY_EXISTS', '该报告已生成训练方案，不需要再次生成', 409)
	}
	if (!isErrorStatus(task.status)) return task
	if (task.retryable === false) throw new TaskError('TASK_NOT_RETRYABLE', task.errorMessage || '该异常需要管理员处理后再重试', 409)

	const now = Date.now()
	if (!task.overview || typeof task.overview !== 'object' || Array.isArray(task.overview)) {
		await tasks.doc(task._id).update({ overview: dbCmd.remove() })
		delete task.overview
	}
	await persistTask(task, {
		status: 'pending',
		stage: 'queued',
		message: task.completedWeeks
			? `将从第${Number(task.completedWeeks) + 1}周继续生成`
			: '任务已重新进入队列',
		progress: task.completedWeeks
			? Math.max(10, Math.round(10 + (Number(task.completedWeeks) / Number(task.totalWeeks)) * 80))
			: 0,
		currentWeek: Math.min(Number(task.totalWeeks), Number(task.completedWeeks) + 1),
		attempt: 0,
		errorCode: '',
		errorMessage: '',
		technicalError: '',
		failedAt: 0,
		retryCount: Number(task.retryCount) + 1,
		deadlineAt: buildDeadline(now, task.totalWeeks),
		workerId: '',
		leaseUntil: 0
	})
	return task
}

async function requestJson({ task, messages, maxTokens, retryMaxTokens, onAttempt, normalize }) {
	let lastError = null
	const providerId = task.providerId ||
		(task.provider === 'moonshot-official' || /^kimi-/i.test(task.model || '') ? 'kimi' : '') ||
		(task.provider === 'deepseek-official' || /^deepseek-/i.test(task.model || '') ? 'deepseek' : '')
	for (let attempt = 1; attempt <= REQUEST_ATTEMPTS; attempt++) {
		const attemptMaxTokens = attempt > 1 && retryMaxTokens
			? Math.max(maxTokens, retryMaxTokens)
			: maxTokens
		await onAttempt(attempt, lastError, attemptMaxTokens)
		try {
			const completion = await aiModel.chatCompletion({
				provider: providerId,
				model: providerId ? (task.model || '') : '',
				messages,
				maxTokens: attemptMaxTokens,
				temperature: 0.3,
				timeout: REQUEST_TIMEOUT_MS,
				thinking: { type: 'disabled' },
				reasoningEffort: '',
				responseFormat: { type: 'json_object' }
			})
			if (completion.finishReason === 'length') {
				const completionTokens = Number(completion.usage?.completion_tokens) || 0
				throw new Error(
					`AI模型输出因长度限制被截断(finish_reason=length, max_tokens=${attemptMaxTokens}` +
					`${completionTokens ? `, completion_tokens=${completionTokens}` : ''})`
				)
			}
			const json = extractJsonObject(completion.content)
			return {
				json,
				value: typeof normalize === 'function' ? normalize(json) : json,
				providerId: completion.providerId,
				provider: completion.provider,
				model: completion.model || task.model || aiModel.DEFAULT_MODEL
			}
		} catch (error) {
			lastError = error
			if (attempt < REQUEST_ATTEMPTS) {
				await new Promise(resolve => setTimeout(resolve, 1200 * attempt))
			}
		}
	}
	throw lastError || new Error('AI 模型请求失败')
}

async function claimTask(task) {
	const now = Date.now()
	if (Number(task.leaseUntil) > now && task.workerId) return ''
	const workerId = crypto.randomBytes(8).toString('hex')
	const previousUpdatedAt = Number(task.updatedAt) || 0
	const result = await tasks.where({ _id: task._id, updatedAt: previousUpdatedAt }).update({
		workerId,
		leaseUntil: now + LEASE_MS,
		updatedAt: now
	})
	if (!result.updated) return ''
	task.workerId = workerId
	task.leaseUntil = now + LEASE_MS
	task.updatedAt = now
	return workerId
}

async function refreshOwnedTask(taskId, workerId) {
	const latest = await findTask(taskId)
	if (!latest || latest.workerId !== workerId || !isActiveStatus(latest.status)) return null
	return latest
}

async function ensureTaskCanContinue(task, report) {
	if (Date.now() > Number(task.deadlineAt)) {
		await failTask(task, new Error('task deadline exceeded'), 'TASK_TIMEOUT')
		return false
	}
	if (Number(report.analysisRevision || 1) !== Number(task.sourceAnalysisRevision || 1)) {
		await failTask(task, new Error('报告与训练方案任务的版本状态异常'))
		task.errorCode = 'REPORT_CHANGED'
		task.errorMessage = '报告版本状态异常，本次生成已停止，请联系管理员核查。'
		await persistTask(task, {
			errorCode: task.errorCode,
			errorMessage: task.errorMessage,
			message: task.errorMessage,
			retryable: false
		})
		return false
	}
	return true
}

async function processTask(taskId, { maxRunMs = 8 * 60 * 1000 } = {}) {
	const runStartedAt = Date.now()
	let task = await findTask(taskId)
	if (!task) throw new TaskError('TASK_NOT_FOUND', '训练计划任务不存在', 404)
	await reconcileTimeout(task)
	if (task.status === 'completed' || isErrorStatus(task.status)) return { task, busy: false }

	const workerId = await claimTask(task)
	if (!workerId) return { task: await findTask(taskId), busy: true }

	let shouldRelease = true
	try {
		const report = await findReportByDocumentId(task.reportDocumentId)
		if (!report) {
			await failTask(task, new Error('关联报告不存在'))
			return { task, busy: false }
		}
		if (!await ensureTaskCanContinue(task, report)) return { task, busy: false }

		if (!task.startedAt) {
			await persistTask(task, { startedAt: Date.now() })
		}

		if (!hasPlanOverview(task.overview)) {
			await tasks.doc(task._id).update({ overview: dbCmd.remove() })
			delete task.overview
			await persistTask(task, {
				status: 'generating_overview',
				stage: 'overview',
				message: '正在规划训练目标和每周递进主线',
				progress: Math.max(3, Number(task.progress) || 0)
			})
			const overviewResult = await requestJson({
				task,
				messages: [
					{ role: 'system', content: buildSystemPrompt() },
					{ role: 'user', content: buildOverviewPrompt(report, { ...task, weeksCount: task.totalWeeks }) }
				],
				maxTokens: 1800,
				retryMaxTokens: 3000,
				normalize: normalizePlanOverview,
				onAttempt: async (attempt, lastError) => {
					const retrying = !!lastError
					await persistTask(task, {
						attempt,
						leaseUntil: Date.now() + LEASE_MS,
						message: retrying
							? `训练主线响应超时或异常，正在自动重试（${attempt}/${REQUEST_ATTEMPTS}）`
							: '正在规划训练目标和每周递进主线'
					})
				}
			})
			const ownedAfterOverview = await refreshOwnedTask(taskId, workerId)
			if (!ownedAfterOverview) {
				shouldRelease = false
				return { task: await findTask(taskId), busy: true, abandoned: true }
			}
			task = ownedAfterOverview
			const overview = overviewResult.value
			await persistTask(task, {
				overview,
				providerId: overviewResult.providerId || task.providerId,
				provider: overviewResult.provider || task.provider,
				model: overviewResult.model,
				attempt: 0,
				progress: 10,
				message: '训练主线已完成，开始生成每周安排'
			})
		}

		const weeklyPlans = Array.isArray(task.weeklyPlans) ? [...task.weeklyPlans] : []
		for (let weekNumber = weeklyPlans.length + 1; weekNumber <= Number(task.totalWeeks); weekNumber++) {
			if (Date.now() - runStartedAt > maxRunMs - REQUEST_TIMEOUT_MS - 10000) {
				await persistTask(task, {
					status: 'pending',
					stage: 'queued',
					currentWeek: weekNumber,
					message: `已完成${weeklyPlans.length}/${task.totalWeeks}周，等待后台继续处理`
				})
				return { task, busy: false, yielded: true }
			}
			const currentReport = await findReportByDocumentId(task.reportDocumentId)
			if (!currentReport || !await ensureTaskCanContinue(task, currentReport)) return { task, busy: false }

			await persistTask(task, {
				status: 'generating_weeks',
				stage: 'weeks',
				currentWeek: weekNumber,
				message: `正在生成第${weekNumber}/${task.totalWeeks}周训练安排`,
				progress: Math.max(10, Math.round(10 + (weeklyPlans.length / Number(task.totalWeeks)) * 80))
			})

			const weekResult = await requestJson({
				task,
				messages: [
					{ role: 'system', content: buildSystemPrompt() },
					{
						role: 'user',
						content: buildWeekPrompt(currentReport, {
							...task,
							weeksCount: task.totalWeeks,
							weekNumber,
							previousWeek: weeklyPlans[weeklyPlans.length - 1] || null
						})
					}
				],
				maxTokens: 6000,
				retryMaxTokens: 10000,
				normalize: rawWeek => normalizeGeneratedWeek(rawWeek, {
					weekNumber,
					startDate: task.startDate
				}),
				onAttempt: async (attempt, lastError) => {
					const retrying = !!lastError
					await persistTask(task, {
						attempt,
						leaseUntil: Date.now() + LEASE_MS,
						message: retrying
							? `第${weekNumber}周响应超时或内容异常，正在自动重试（${attempt}/${REQUEST_ATTEMPTS}）`
							: `正在生成第${weekNumber}/${task.totalWeeks}周训练安排`
					})
				}
			})
			const ownedAfterWeek = await refreshOwnedTask(taskId, workerId)
			if (!ownedAfterWeek) {
				shouldRelease = false
				return { task: await findTask(taskId), busy: true, abandoned: true }
			}
			task = ownedAfterWeek
			const normalizedWeek = weekResult.value
			weeklyPlans.push(normalizedWeek)
			await persistTask(task, {
				weeklyPlans,
				providerId: weekResult.providerId || task.providerId,
				provider: weekResult.provider || task.provider,
				model: weekResult.model || task.model,
				completedWeeks: weeklyPlans.length,
				attempt: 0,
				progress: Math.round(10 + (weeklyPlans.length / Number(task.totalWeeks)) * 80),
				message: weeklyPlans.length === Number(task.totalWeeks)
					? '所有周次已生成，正在检查计划完整性'
					: `第${weekNumber}周已完成，准备生成第${weekNumber + 1}周`
			})
		}

		await persistTask(task, {
			status: 'assembling',
			stage: 'assembling',
			currentWeek: Number(task.totalWeeks),
			progress: 95,
			message: '正在检查日期、每日安排和完整性'
		})

		const latestReport = await findReportByDocumentId(task.reportDocumentId)
		if (!latestReport || !await ensureTaskCanContinue(task, latestReport)) return { task, busy: false }
		const plan = assemblePlanFromParts({
			overview: task.overview,
			weeklyPlans
		}, {
			startDate: task.startDate,
			endDate: task.endDate,
			weeksCount: task.totalWeeks,
			childName: latestReport.childName,
			generatedAt: Date.now(),
			generatedBy: task.requestedBy,
			provider: task.provider || 'deepseek-official',
			model: task.model || aiModel.DEFAULT_MODEL,
			sourceAnalysisRevision: task.sourceAnalysisRevision,
			focusDomains: task.focusDomains
		})

		const completedAt = Date.now()
		if (latestReport.interventionPlan === null) {
			await reports.doc(task.reportDocumentId).update({ interventionPlan: dbCmd.remove() })
		}
		await persistTask(task, {
			status: 'completed',
			stage: 'completed',
			message: '训练计划已生成',
			progress: 100,
			completedWeeks: Number(task.totalWeeks),
			currentWeek: Number(task.totalWeeks),
			completedAt,
			workerId: '',
			leaseUntil: 0
		}, {
			interventionPlan: plan,
			interventionPlanStatus: 'completed',
			interventionPlanStaleReason: '',
			interventionPlanUpdatedAt: completedAt,
			updateTime: completedAt
		})
		shouldRelease = false
		return { task, plan, busy: false }
	} catch (error) {
		console.error('训练计划后台任务失败:', error)
		await failTask(task, error)
		shouldRelease = false
		return { task, busy: false, error }
	} finally {
		if (shouldRelease && task?._id && task.workerId === workerId) {
			try {
				await tasks.doc(task._id).update({ workerId: '', leaseUntil: 0, updatedAt: Date.now() })
			} catch (_) {}
		}
	}
}

async function processPendingTasks({ limit = 2, maxRunMs } = {}) {
	const result = await tasks.where({ status: dbCmd.in(ACTIVE_STATUSES) })
		.orderBy('updatedAt', 'asc')
		.limit(limit)
		.get()
	const outcomes = []
	for (const task of result.data || []) {
		outcomes.push(await processTask(task.taskId, { maxRunMs }))
	}
	return outcomes
}

module.exports = {
	ACTIVE_STATUSES,
	ERROR_STATUSES,
	TaskError,
	applyManualPlanAdjustments,
	classifyError,
	compactId,
	createTask,
	findLatestTask,
	findReportByDocumentId,
	findTask,
	isActiveStatus,
	isErrorStatus,
	normalizeDateRange,
	processPendingTasks,
	processTask,
	publicTask,
	reconcileTimeout,
	retryTask,
	safeDiagnosticMessage,
	statusText
}
