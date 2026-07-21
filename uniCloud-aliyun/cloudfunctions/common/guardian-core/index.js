'use strict'

const MAX_GUARDIANS = 4
const RELATIONSHIPS = ['father', 'mother', 'other_guardian']
const RELATIONSHIP_LABELS = {
	father: '爸爸',
	mother: '妈妈',
	other_guardian: '其他监护人'
}
const RELATIONSHIP_ALIASES = {
	'爸爸': 'father',
	'父亲': 'father',
	'妈妈': 'mother',
	'母亲': 'mother',
	'其他': 'other_guardian',
	'其他监护人': 'other_guardian',
	other: 'other_guardian'
}

class GuardianValidationError extends Error {
	constructor(message) {
		super(message)
		this.code = 400
		this.isGuardianValidationError = true
	}
}

function normalizeMobile(value) {
	let mobile = String(value == null ? '' : value).trim().replace(/[\s-]/g, '')
	if (mobile.startsWith('+86')) mobile = mobile.slice(3)
	if (/^861[3-9]\d{9}$/.test(mobile)) mobile = mobile.slice(2)
	return mobile
}

function isValidMobile(value) {
	return /^1[3-9]\d{9}$/.test(normalizeMobile(value))
}

function normalizeRelationship(value) {
	const relationship = String(value == null ? '' : value).trim()
	return RELATIONSHIP_ALIASES[relationship] || relationship
}

function relationshipLabel(value) {
	return RELATIONSHIP_LABELS[normalizeRelationship(value)] || '其他监护人'
}

function membershipRelationship(value) {
	const relationship = normalizeRelationship(value)
	return relationship === 'other_guardian' ? 'other' : relationship
}

function normalizeGuardians(value, options = {}) {
	const required = options.required !== false
	if (!Array.isArray(value)) {
		if (!required && (value === undefined || value === null)) return []
		throw new GuardianValidationError('请至少填写一位监护人')
	}

	const candidates = value.filter(item => {
		if (!item || typeof item !== 'object') return false
		return Boolean(String(item.mobile || '').trim() || String(item.relationship || '').trim())
	})
	if (required && !candidates.length) {
		throw new GuardianValidationError('请至少填写一位监护人')
	}
	if (candidates.length > MAX_GUARDIANS) {
		throw new GuardianValidationError(`每个孩子最多绑定${MAX_GUARDIANS}位监护人`)
	}

	const seenMobiles = new Set()
	return candidates.map((item, index) => {
		const mobile = normalizeMobile(item.mobile)
		const relationship = normalizeRelationship(item.relationship)
		if (!isValidMobile(mobile)) {
			throw new GuardianValidationError(`第${index + 1}位监护人的手机号格式不正确`)
		}
		if (!RELATIONSHIPS.includes(relationship)) {
			throw new GuardianValidationError(`请选择第${index + 1}位监护人的关系`)
		}
		if (seenMobiles.has(mobile)) {
			throw new GuardianValidationError('同一个手机号不能重复绑定')
		}
		seenMobiles.add(mobile)
		return { mobile, relationship }
	})
}

function findGuardianByMobile(guardians, mobile) {
	const target = normalizeMobile(mobile)
	if (!target) return null
	let normalized
	try {
		normalized = normalizeGuardians(guardians, { required: false })
	} catch (_) {
		return null
	}
	return normalized.find(item => item.mobile === target) || null
}

function maskMobile(value) {
	const mobile = normalizeMobile(value)
	return isValidMobile(mobile) ? `${mobile.slice(0, 3)}****${mobile.slice(-4)}` : ''
}

function isSameGuardianMembership(member = {}, userIds = [], mobile = '') {
	const linkedIds = new Set((Array.isArray(userIds) ? userIds : [userIds]).map(String))
	return linkedIds.has(String(member.user_id || '')) ||
		normalizeMobile(member.guardian_mobile) === normalizeMobile(mobile)
}

module.exports = {
	MAX_GUARDIANS,
	RELATIONSHIPS,
	RELATIONSHIP_LABELS,
	GuardianValidationError,
	normalizeMobile,
	isValidMobile,
	normalizeRelationship,
	relationshipLabel,
	membershipRelationship,
	normalizeGuardians,
	findGuardianByMobile,
	maskMobile,
	isSameGuardianMembership
}
