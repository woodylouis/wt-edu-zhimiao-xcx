'use strict'

const https = require('https')

const CONFIG_COLLECTION = 'wtdb-system-config'
const ACTIVE_PROVIDER_CONFIG_KEY = 'AI_MODEL_PROVIDER'
const KIMI_MAX_RPM_CONFIG_KEY = 'KIMI_MAX_RPM'
const KIMI_RATE_LIMIT_DOC_ID = 'kimi-organization-rate-limit'
const DEFAULT_KIMI_MAX_RPM = 3
const KIMI_REQUEST_ATTEMPTS = 3
const DEFAULT_PROVIDER = 'deepseek'
const PROVIDERS = Object.freeze({
	deepseek: Object.freeze({
		id: 'deepseek',
		provider: 'deepseek-official',
		label: 'DeepSeek',
		baseURL: 'https://api.deepseek.com',
		model: 'deepseek-v4-pro',
		apiKeyConfigKey: 'DEEPSEEK_API_KEY',
		apiKeyEnvKeys: ['DEEPSEEK_API_KEY', 'DEEPSEEK_KEY', 'DEEPSEEK_TOKEN'],
		baseUrlEnvKey: 'DEEPSEEK_BASE_URL',
		modelEnvKey: 'DEEPSEEK_MODEL'
	}),
	kimi: Object.freeze({
		id: 'kimi',
		provider: 'moonshot-official',
		label: 'Kimi K3',
		baseURL: 'https://api.moonshot.cn/v1',
		model: 'kimi-k3',
		apiKeyConfigKey: 'MOONSHOT_API_KEY',
		apiKeyEnvKeys: ['MOONSHOT_API_KEY', 'KIMI_API_KEY', 'MOONSHOT_KEY'],
		baseUrlEnvKey: 'MOONSHOT_BASE_URL',
		modelEnvKey: 'KIMI_MODEL'
	})
})

const DEFAULT_BASE_URL = PROVIDERS[DEFAULT_PROVIDER].baseURL
const DEFAULT_MODEL = PROVIDERS[DEFAULT_PROVIDER].model
let localKimiNextAllowedAt = 0

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, Math.max(0, ms)))
}

function normalizePositiveInteger(value, fallback, max = 10000) {
	const parsed = Number(value)
	if (!Number.isFinite(parsed) || parsed < 1) return fallback
	return Math.min(Math.floor(parsed), max)
}

function getKimiMinRequestIntervalMs(maxRpm = DEFAULT_KIMI_MAX_RPM) {
	const rpm = normalizePositiveInteger(maxRpm, DEFAULT_KIMI_MAX_RPM)
	return Math.ceil((60000 / rpm) * 1.05)
}

function normalizeProvider(provider) {
	const normalized = String(provider || '').trim().toLowerCase()
	return PROVIDERS[normalized] ? normalized : DEFAULT_PROVIDER
}

function getEnvValue(keys) {
	for (const key of keys) {
		const value = String(process.env[key] || '').trim()
		if (value) return value
	}
	return ''
}

async function getConfigValueFromDb(configKey) {
	if (typeof uniCloud === 'undefined') return ''

	try {
		const db = uniCloud.database()
		const res = await db.collection(CONFIG_COLLECTION)
			.where({ configKey })
			.field({ value: true })
			.limit(1)
			.get()

		const value = res.data && res.data[0] && res.data[0].value
		return typeof value === 'string' ? value.trim() : ''
	} catch (error) {
		console.warn(`读取AI模型配置 ${configKey} 失败，尝试使用环境变量:`, error.message)
		return ''
	}
}

async function getKimiMaxRpm() {
	const configured = await getConfigValueFromDb(KIMI_MAX_RPM_CONFIG_KEY)
	const fromEnv = process.env.KIMI_MAX_RPM || process.env.MOONSHOT_MAX_RPM
	return normalizePositiveInteger(configured || fromEnv, DEFAULT_KIMI_MAX_RPM)
}

async function acquireLocalKimiSlot(intervalMs) {
	const now = Date.now()
	const waitMs = Math.max(0, localKimiNextAllowedAt - now)
	if (waitMs) await sleep(waitMs)
	localKimiNextAllowedAt = Math.max(Date.now(), localKimiNextAllowedAt) + intervalMs
}

async function ensureKimiRateLimitDocument(collection) {
	try {
		const result = await collection.doc(KIMI_RATE_LIMIT_DOC_ID).get()
		if (result.data && result.data.length) return
		await collection.add({
			_id: KIMI_RATE_LIMIT_DOC_ID,
			configKey: 'KIMI_RATE_LIMIT_STATE',
			value: 'shared',
			nextAllowedAt: 0,
			createTime: Date.now(),
			updateTime: Date.now()
		})
	} catch (error) {
		// 并发初始化时可能已由另一实例创建。
		try {
			const result = await collection.doc(KIMI_RATE_LIMIT_DOC_ID).get()
			if (result.data && result.data.length) return
		} catch (_) { }
		throw error
	}
}

async function acquireKimiRequestSlot() {
	const maxRpm = await getKimiMaxRpm()
	const intervalMs = getKimiMinRequestIntervalMs(maxRpm)

	if (typeof uniCloud === 'undefined') {
		await acquireLocalKimiSlot(intervalMs)
		return { maxRpm, intervalMs }
	}

	const database = uniCloud.database()
	const command = database && database.command
	if (!command || typeof command.lte !== 'function') {
		await acquireLocalKimiSlot(intervalMs)
		return { maxRpm, intervalMs }
	}

	const collection = database.collection(CONFIG_COLLECTION)
	await ensureKimiRateLimitDocument(collection)

	while (true) {
		const now = Date.now()
		const updateResult = await collection.where({
			_id: KIMI_RATE_LIMIT_DOC_ID,
			nextAllowedAt: command.lte(now)
		}).update({
			nextAllowedAt: now + intervalMs,
			updateTime: now
		})
		const updated = Number(updateResult.updated || updateResult.affectedDocs || 0)
		if (updated > 0) return { maxRpm, intervalMs }

		const stateResult = await collection.doc(KIMI_RATE_LIMIT_DOC_ID).get()
		const state = stateResult.data && stateResult.data[0]
		if (!state) {
			await ensureKimiRateLimitDocument(collection)
			continue
		}

		const waitMs = Math.max(100, Number(state.nextAllowedAt || 0) - Date.now())
		await sleep(waitMs + 50 + Math.floor(Math.random() * 200))
	}
}

async function resolveProvider(provider = '') {
	if (provider && PROVIDERS[String(provider).trim().toLowerCase()]) {
		return normalizeProvider(provider)
	}
	const configured = await getConfigValueFromDb(ACTIVE_PROVIDER_CONFIG_KEY)
	const fromEnv = process.env.AI_MODEL_PROVIDER || process.env.AI_PROVIDER
	return normalizeProvider(configured || fromEnv || DEFAULT_PROVIDER)
}

function getProviderRuntimeConfig(provider) {
	const definition = PROVIDERS[normalizeProvider(provider)]
	return {
		...definition,
		baseURL: String(process.env[definition.baseUrlEnvKey] || definition.baseURL).trim(),
		model: String(process.env[definition.modelEnvKey] || definition.model).trim()
	}
}

async function getActiveModelInfo(provider = '') {
	const providerId = await resolveProvider(provider)
	const config = getProviderRuntimeConfig(providerId)
	return {
		id: config.id,
		provider: config.provider,
		label: config.label,
		model: config.model,
		baseURL: config.baseURL
	}
}

async function getRequestConfig(provider = '') {
	const providerId = await resolveProvider(provider)
	const config = getProviderRuntimeConfig(providerId)
	const apiKey = await getConfigValueFromDb(config.apiKeyConfigKey) ||
		getEnvValue(config.apiKeyEnvKeys)
	return { ...config, apiKey }
}

function normalizeBaseUrl(baseUrl, fallback = DEFAULT_BASE_URL) {
	return (baseUrl || fallback).replace(/\/+$/, '')
}

function getChoiceFromResponse(data) {
	return data && Array.isArray(data.choices) ? data.choices[0] : null
}

function getContentFromResponse(data) {
	const choice = getChoiceFromResponse(data)
	const content = choice && choice.message && choice.message.content
	return typeof content === 'string' ? content.trim() : ''
}

function parseResponseData(data) {
	if (!data) return null
	if (Buffer.isBuffer(data)) {
		return JSON.parse(data.toString('utf8'))
	}
	if (typeof data === 'string') {
		return JSON.parse(data)
	}
	return data
}

function parseRetryAfterMs(headers = {}, data = null) {
	const value = headers['retry-after'] || headers['Retry-After'] || ''
	const seconds = Number(value)
	if (value !== '' && Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000)

	if (value) {
		const retryAt = Date.parse(value)
		if (Number.isFinite(retryAt)) return Math.max(0, retryAt - Date.now())
	}

	const providerMessage = String(data?.error?.message || data?.message || '')
	const match = providerMessage.match(/try again after\s+([\d.]+)\s*seconds?/i)
	return match ? Math.ceil(Number(match[1]) * 1000) : 0
}

function createProviderHttpError(config, statusCode, data, headers = {}) {
	const errorType = String(data?.error?.type || data?.type || '')
	let message = `${config.label} 请求失败(${statusCode})`

	if (statusCode === 429 && errorType === 'rate_limit_reached_error') {
		message = `${config.label} 请求频率超出组织限制，已按限流策略重试，请稍后再试`
	} else if (statusCode === 429 && errorType === 'engine_overloaded_error') {
		message = `${config.label} 服务当前繁忙，已按服务端要求重试`
	} else {
		const providerMessage = String(data?.error?.message || data?.message || '').trim()
		if (providerMessage) {
			const sanitized = providerMessage
				.replace(/<[^>]*ak-[^>]+>/gi, '<已隐藏>')
				.replace(/\bak-[a-z0-9_-]+\b/gi, '[已隐藏]')
			message += `: ${sanitized.slice(0, 300)}`
		}
	}

	const error = new Error(message)
	error.statusCode = statusCode
	error.providerId = config.id
	error.providerErrorType = errorType
	error.retryAfterMs = parseRetryAfterMs(headers, data)
	if (statusCode === 429) error.code = 'AI_RATE_LIMITED'
	return error
}

function isRetryableKimiRateLimit(error) {
	return error?.providerId === 'kimi' &&
		error?.statusCode === 429 &&
		['rate_limit_reached_error', 'engine_overloaded_error'].includes(error.providerErrorType)
}

function requestWithHttps(url, payload, headers, timeout, config) {
	return new Promise((resolve, reject) => {
		const req = https.request(url, {
			method: 'POST',
			headers,
			timeout
		}, res => {
			const chunks = []
			res.on('data', chunk => chunks.push(chunk))
			res.on('end', () => {
				const body = Buffer.concat(chunks).toString('utf8')
				let data = null
				try {
					data = body ? JSON.parse(body) : null
				} catch (error) {
					return reject(new Error(`${config.label} 响应解析失败`))
				}

				if (res.statusCode < 200 || res.statusCode >= 300) {
					return reject(createProviderHttpError(config, res.statusCode, data, res.headers || {}))
				}

				resolve(data)
			})
		})

		req.on('timeout', () => {
			req.destroy(new Error(`${config.label} 请求超时(${timeout}ms)`))
		})
		req.on('error', reject)
		req.write(JSON.stringify(payload))
		req.end()
	})
}

async function requestModel(payload, { timeout = 60000, baseURL, provider = '' } = {}) {
	const config = await getRequestConfig(provider)
	if (!config.apiKey) {
		throw new Error(`未配置 ${config.apiKeyConfigKey}，无法调用 ${config.label} API`)
	}

	const url = `${normalizeBaseUrl(baseURL || config.baseURL, config.baseURL)}/chat/completions`
	const headers = {
		'Content-Type': 'application/json',
		'Authorization': `Bearer ${config.apiKey}`
	}
	const attempts = config.id === 'kimi' ? KIMI_REQUEST_ATTEMPTS : 1
	let lastError = null

	for (let attempt = 1; attempt <= attempts; attempt++) {
		if (config.id === 'kimi') await acquireKimiRequestSlot()

		try {
			if (typeof uniCloud !== 'undefined' && uniCloud.httpclient) {
				const response = await uniCloud.httpclient.request(url, {
					method: 'POST',
					headers,
					data: JSON.stringify(payload),
					dataType: 'json',
					timeout
				})

				const statusCode = response.status || response.statusCode || 0
				const data = parseResponseData(response.data)
				if (statusCode < 200 || statusCode >= 300) {
					throw createProviderHttpError(config, statusCode, data, response.headers || {})
				}
				return { data, config }
			}

			const data = await requestWithHttps(url, payload, headers, timeout, config)
			return { data, config }
		} catch (error) {
			lastError = error
			if (!isRetryableKimiRateLimit(error) || attempt >= attempts) throw error
			const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 8000)
			await sleep(Math.max(error.retryAfterMs || 0, backoffMs) + Math.floor(Math.random() * 500))
		}
	}

	throw lastError
}

function buildChatPayload({
	provider,
	model,
	messages,
	maxTokens,
	temperature,
	thinking,
	reasoningEffort,
	responseFormat
}) {
	const payload = {
		model,
		messages,
		stream: false
	}

	if (provider === 'kimi') {
		payload.max_completion_tokens = maxTokens
		const kimiReasoningEffort = reasoningEffort ||
			(thinking && thinking.type === 'disabled' ? 'low' : '')
		if (kimiReasoningEffort) {
			payload.reasoning_effort = kimiReasoningEffort
		}
	} else {
		payload.max_tokens = maxTokens
		payload.temperature = temperature
		if (thinking) {
			payload.thinking = thinking
		}
		if (reasoningEffort) {
			payload.reasoning_effort = reasoningEffort
		}
	}

	if (responseFormat) {
		payload.response_format = responseFormat
	}
	return payload
}

async function chatCompletion({
	messages,
	provider = '',
	model = '',
	baseURL = '',
	maxTokens = 500,
	temperature = 0.3,
	timeout = 60000,
	thinking = { type: 'enabled' },
	reasoningEffort = 'high',
	responseFormat = null
} = {}) {
	if (!Array.isArray(messages) || messages.length === 0) {
		throw new Error('AI messages 不能为空')
	}

	const modelInfo = await getActiveModelInfo(provider)
	const resolvedModel = String(model || modelInfo.model).trim()
	const payload = buildChatPayload({
		provider: modelInfo.id,
		model: resolvedModel,
		messages,
		maxTokens,
		temperature,
		thinking,
		reasoningEffort,
		responseFormat
	})

	const result = await requestModel(payload, {
		timeout,
		baseURL,
		provider: modelInfo.id
	})
	const data = result.data
	const content = getContentFromResponse(data)
	const choice = getChoiceFromResponse(data)
	if (!content) {
		throw new Error(`${result.config.label} 返回空内容`)
	}

	return {
		content,
		model: data.model || resolvedModel,
		providerId: result.config.id,
		provider: result.config.provider,
		providerLabel: result.config.label,
		usage: data.usage || null,
		finishReason: choice?.finish_reason || '',
		raw: data
	}
}

async function chatText(options) {
	const result = await chatCompletion(options)
	return result.content
}

module.exports = {
	ACTIVE_PROVIDER_CONFIG_KEY,
	DEFAULT_BASE_URL,
	DEFAULT_KIMI_MAX_RPM,
	DEFAULT_MODEL,
	DEFAULT_PROVIDER,
	PROVIDERS,
	buildChatPayload,
	chatCompletion,
	chatText,
	createProviderHttpError,
	getActiveModelInfo,
	getKimiMinRequestIntervalMs,
	normalizeProvider,
	parseRetryAfterMs
}
