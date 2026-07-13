'use strict'

const https = require('https')

const DEFAULT_BASE_URL = 'https://api.deepseek.com'
const DEFAULT_MODEL = 'deepseek-v4-pro'
const CONFIG_COLLECTION = 'wtdb-system-config'
const API_KEY_CONFIG_KEY = 'DEEPSEEK_API_KEY'

function getEnvApiKey() {
	return (process.env.DEEPSEEK_API_KEY ||
		process.env.DEEPSEEK_KEY ||
		process.env.DEEPSEEK_TOKEN ||
		'').trim()
}

async function getApiKeyFromDb() {
	if (typeof uniCloud === 'undefined') return ''

	try {
		const db = uniCloud.database()
		const res = await db.collection(CONFIG_COLLECTION)
			.where({ configKey: API_KEY_CONFIG_KEY })
			.field({ value: true })
			.limit(1)
			.get()

		const value = res.data && res.data[0] && res.data[0].value
		return typeof value === 'string' ? value.trim() : ''
	} catch (error) {
		console.warn('读取DeepSeek API Key配置失败，尝试使用环境变量:', error.message)
		return ''
	}
}

async function getApiKey() {
	return await getApiKeyFromDb() || getEnvApiKey()
}

function normalizeBaseUrl(baseUrl) {
	return (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

function getContentFromResponse(data) {
	const choice = data && Array.isArray(data.choices) && data.choices[0]
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

function requestWithHttps(url, payload, headers, timeout) {
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
					return reject(new Error(`DeepSeek 响应解析失败: ${body.slice(0, 300)}`))
				}

				if (res.statusCode < 200 || res.statusCode >= 300) {
					return reject(new Error(`DeepSeek 请求失败(${res.statusCode}): ${body.slice(0, 500)}`))
				}

				resolve(data)
			})
		})

		req.on('timeout', () => {
			req.destroy(new Error(`DeepSeek 请求超时(${timeout}ms)`))
		})
		req.on('error', reject)
		req.write(JSON.stringify(payload))
		req.end()
	})
}

async function requestDeepSeek(payload, { timeout = 60000, baseURL } = {}) {
	const apiKey = await getApiKey()
	if (!apiKey) {
		throw new Error('未配置 DEEPSEEK_API_KEY，无法调用 DeepSeek 官方 API')
	}

	const url = `${normalizeBaseUrl(baseURL || process.env.DEEPSEEK_BASE_URL)}/chat/completions`
	const headers = {
		'Content-Type': 'application/json',
		'Authorization': `Bearer ${apiKey}`
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
			throw new Error(`DeepSeek 请求失败(${statusCode}): ${JSON.stringify(data || {}).slice(0, 500)}`)
		}
		return data
	}

	return requestWithHttps(url, payload, headers, timeout)
}

async function chatCompletion({
	messages,
	model = process.env.DEEPSEEK_MODEL || DEFAULT_MODEL,
	maxTokens = 500,
	temperature = 0.3,
	timeout = 60000,
	thinking = { type: 'enabled' },
	reasoningEffort = 'high'
}) {
	if (!Array.isArray(messages) || messages.length === 0) {
		throw new Error('DeepSeek messages 不能为空')
	}

	const payload = {
		model,
		messages,
		stream: false,
		temperature,
		max_tokens: maxTokens
	}

	if (thinking) {
		payload.thinking = thinking
	}
	if (reasoningEffort) {
		payload.reasoning_effort = reasoningEffort
	}

	const data = await requestDeepSeek(payload, { timeout })
	const content = getContentFromResponse(data)
	if (!content) {
		throw new Error('DeepSeek 返回空内容')
	}

	return {
		content,
		model: data.model || model,
		usage: data.usage || null,
		raw: data
	}
}

async function chatText(options) {
	const result = await chatCompletion(options)
	return result.content
}

module.exports = {
	DEFAULT_BASE_URL,
	DEFAULT_MODEL,
	chatCompletion,
	chatText
}
