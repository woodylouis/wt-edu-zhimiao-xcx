'use strict'

const crypto = require('crypto')
const db = uniCloud.database()
const taskCollection = db.collection('wtdb-report-tasks')
const RUN_TOKEN_TTL_MS = 12 * 60 * 1000

function hashToken(token) {
	return crypto.createHash('sha256').update(String(token)).digest('hex')
}

function safeEqual(left, right) {
	const leftBuffer = Buffer.from(String(left))
	const rightBuffer = Buffer.from(String(right))
	return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

async function getTask(taskId) {
	const res = await taskCollection.where({ taskId }).limit(1).get()
	return res.data?.[0] || null
}

async function issueRunToken(taskId, actorId = '') {
	const task = await getTask(taskId)
	if (!task) throw new Error('报告任务不存在')
	const token = crypto.randomBytes(32).toString('base64url')
	const now = Date.now()
	await taskCollection.doc(task._id).update({
		metadata: {
			...(task.metadata || {}),
			internalRunTokenHash: hashToken(token),
			internalRunTokenIssuedAt: now,
			internalRunTokenExpiresAt: now + RUN_TOKEN_TTL_MS,
			internalRunTokenIssuedBy: actorId
		},
		updateTime: now
	})
	return token
}

async function hasRunAccess(taskId, runToken) {
	if (!taskId || !runToken) return false
	const task = await getTask(taskId)
	const expectedHash = task?.metadata?.internalRunTokenHash
	const expiresAt = Number(task?.metadata?.internalRunTokenExpiresAt) || 0
	if (!expectedHash || expiresAt < Date.now()) return false
	return safeEqual(expectedHash, hashToken(runToken))
}

async function revokeRunToken(taskId, runToken) {
	if (!await hasRunAccess(taskId, runToken)) return false
	const task = await getTask(taskId)
	if (!task) return false
	await taskCollection.doc(task._id).update({
		metadata: {
			...(task.metadata || {}),
			internalRunTokenHash: '',
			internalRunTokenExpiresAt: 0,
			internalRunTokenRevokedAt: Date.now()
		},
		updateTime: Date.now()
	})
	return true
}

module.exports = { issueRunToken, hasRunAccess, revokeRunToken }
