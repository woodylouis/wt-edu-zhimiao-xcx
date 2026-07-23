'use strict'

const https = require('https')

const CONFIG_COLLECTION = 'wtdb-system-config'
const ACTIVE_PROVIDER_CONFIG_KEY = 'AI_MODEL_PROVIDER'
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

function requestWithHttps(url, payload, headers, timeout, providerLabel) {
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
					return reject(new Error(`${providerLabel} 响应解析失败: ${body.slice(0, 300)}`))
				}

				if (res.statusCode < 200 || res.statusCode >= 300) {
					return reject(new Error(`${providerLabel} 请求失败(${res.statusCode}): ${body.slice(0, 500)}`))
				}

				resolve(data)
			})
		})

		req.on('timeout', () => {
			req.destroy(new Error(`${providerLabel} 请求超时(${timeout}ms)`))
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
			throw new Error(`${config.label} 请求失败(${statusCode}): ${JSON.stringify(data || {}).slice(0, 500)}`)
		}
		return { data, config }
	}

	const data = await requestWithHttps(url, payload, headers, timeout, config.label)
	return { data, config }
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
	DEFAULT_MODEL,
	DEFAULT_PROVIDER,
	PROVIDERS,
	buildChatPayload,
	chatCompletion,
	chatText,
	getActiveModelInfo,
	normalizeProvider
}
