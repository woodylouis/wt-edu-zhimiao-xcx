'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')
const {
	buildChatPayload,
	chatCompletion,
	getActiveModelInfo,
	normalizeProvider
} = require('../uniCloud-aliyun/cloudfunctions/common/deepseek-client')

const messages = [{ role: 'user', content: '你好' }]

test('normalizes supported providers and keeps DeepSeek as the compatibility default', () => {
	assert.equal(normalizeProvider('kimi'), 'kimi')
	assert.equal(normalizeProvider('DEEPSEEK'), 'deepseek')
	assert.equal(normalizeProvider('unknown'), 'deepseek')
})

test('resolves the official Kimi K3 endpoint and model', async () => {
	const originalModel = process.env.KIMI_MODEL
	const originalBaseUrl = process.env.MOONSHOT_BASE_URL
	delete process.env.KIMI_MODEL
	delete process.env.MOONSHOT_BASE_URL
	try {
		const info = await getActiveModelInfo('kimi')
		assert.deepEqual(info, {
			id: 'kimi',
			provider: 'moonshot-official',
			label: 'Kimi K3',
			model: 'kimi-k3',
			baseURL: 'https://api.moonshot.cn/v1'
		})
	} finally {
		if (originalModel === undefined) delete process.env.KIMI_MODEL
		else process.env.KIMI_MODEL = originalModel
		if (originalBaseUrl === undefined) delete process.env.MOONSHOT_BASE_URL
		else process.env.MOONSHOT_BASE_URL = originalBaseUrl
	}
})

test('keeps existing DeepSeek request parameters unchanged', () => {
	const payload = buildChatPayload({
		provider: 'deepseek',
		model: 'deepseek-v4-pro',
		messages,
		maxTokens: 500,
		temperature: 0.3,
		thinking: { type: 'enabled' },
		reasoningEffort: 'high',
		responseFormat: null
	})

	assert.equal(payload.max_tokens, 500)
	assert.equal(payload.temperature, 0.3)
	assert.deepEqual(payload.thinking, { type: 'enabled' })
	assert.equal(payload.reasoning_effort, 'high')
	assert.equal('max_completion_tokens' in payload, false)
})

test('uses Kimi K3 parameters without unsupported temperature or thinking fields', () => {
	const payload = buildChatPayload({
		provider: 'kimi',
		model: 'kimi-k3',
		messages,
		maxTokens: 800,
		temperature: 0.3,
		thinking: { type: 'enabled' },
		reasoningEffort: 'high',
		responseFormat: { type: 'json_object' }
	})

	assert.equal(payload.max_completion_tokens, 800)
	assert.equal(payload.reasoning_effort, 'high')
	assert.deepEqual(payload.response_format, { type: 'json_object' })
	assert.equal('max_tokens' in payload, false)
	assert.equal('temperature' in payload, false)
	assert.equal('thinking' in payload, false)
})

test('maps a disabled-thinking request to Kimi low reasoning effort', () => {
	const payload = buildChatPayload({
		provider: 'kimi',
		model: 'kimi-k3',
		messages,
		maxTokens: 800,
		temperature: 0.3,
		thinking: { type: 'disabled' },
		reasoningEffort: '',
		responseFormat: null
	})

	assert.equal(payload.reasoning_effort, 'low')
})

test('routes an unqualified chat request through the database-selected Kimi provider', async () => {
	const configValues = {
		AI_MODEL_PROVIDER: 'kimi',
		MOONSHOT_API_KEY: 'test-kimi-key'
	}
	let capturedRequest = null
	const query = {
		configKey: '',
		where(value) {
			this.configKey = value.configKey
			return this
		},
		field() {
			return this
		},
		limit() {
			return this
		},
		async get() {
			const value = configValues[this.configKey]
			return { data: value ? [{ value }] : [] }
		}
	}
	global.uniCloud = {
		database: () => ({
			collection: () => query
		}),
		httpclient: {
			async request(url, options) {
				capturedRequest = { url, options }
				return {
					status: 200,
					data: {
						model: 'kimi-k3',
						choices: [{
							message: { content: '已完成' },
							finish_reason: 'stop'
						}]
					}
				}
			}
		}
	}

	try {
		const completion = await chatCompletion({
			messages,
			maxTokens: 300,
			thinking: { type: 'disabled' },
			reasoningEffort: ''
		})
		const body = JSON.parse(capturedRequest.options.data)
		assert.equal(capturedRequest.url, 'https://api.moonshot.cn/v1/chat/completions')
		assert.equal(capturedRequest.options.headers.Authorization, 'Bearer test-kimi-key')
		assert.equal(body.model, 'kimi-k3')
		assert.equal(body.max_completion_tokens, 300)
		assert.equal(body.reasoning_effort, 'low')
		assert.equal('temperature' in body, false)
		assert.equal(completion.providerId, 'kimi')
		assert.equal(completion.provider, 'moonshot-official')
	} finally {
		delete global.uniCloud
	}
})
