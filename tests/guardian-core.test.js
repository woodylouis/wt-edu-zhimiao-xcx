'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')
const guardianCore = require('../uniCloud-aliyun/cloudfunctions/common/guardian-core')

test('normalizes supported guardian relationships and mainland mobile numbers', () => {
	assert.deepEqual(guardianCore.normalizeGuardians([
		{ relationship: '爸爸', mobile: '+86 138-0013-8000' },
		{ relationship: 'mother', mobile: '13900139000' },
		{ relationship: '其他监护人', mobile: '13700137000' }
	]), [
		{ relationship: 'father', mobile: '13800138000' },
		{ relationship: 'mother', mobile: '13900139000' },
		{ relationship: 'other_guardian', mobile: '13700137000' }
	])
})

test('allows one guardian mobile to match multiple children independently', () => {
	const children = [
		{ _id: 'child-a', guardians: [{ relationship: 'father', mobile: '13800138000' }] },
		{ _id: 'child-b', guardians: [{ relationship: 'other_guardian', mobile: '13800138000' }] },
		{ _id: 'child-c', guardians: [{ relationship: 'mother', mobile: '13900139000' }] }
	]
	const matches = children.filter(child => guardianCore.findGuardianByMobile(child.guardians, '13800138000'))
	assert.deepEqual(matches.map(child => child._id), ['child-a', 'child-b'])
})

test('rejects duplicate mobiles on one child and more than four guardians', () => {
	assert.throws(
		() => guardianCore.normalizeGuardians([
			{ relationship: 'father', mobile: '13800138000' },
			{ relationship: 'mother', mobile: '13800138000' }
		]),
		(error) => error.code === 400 && error.message === '同一个手机号不能重复绑定'
	)
	assert.throws(
		() => guardianCore.normalizeGuardians([
			{ relationship: 'father', mobile: '13800138000' },
			{ relationship: 'mother', mobile: '13900139000' },
			{ relationship: 'other_guardian', mobile: '13700137000' },
			{ relationship: 'other_guardian', mobile: '13600136000' },
			{ relationship: 'other_guardian', mobile: '13500135000' }
		]),
		(error) => error.code === 400 && error.message === '每个孩子最多绑定4位监护人'
	)
})

test('masks guardian mobile without exposing the middle digits', () => {
	assert.equal(guardianCore.maskMobile('13800138000'), '138****8000')
})

test('treats the same linked account or mobile as an existing child binding', () => {
	assert.equal(guardianCore.isSameGuardianMembership(
		{ user_id: 'linked-user', guardian_mobile: '' },
		['current-user', 'linked-user'],
		'13800138000'
	), true)
	assert.equal(guardianCore.isSameGuardianMembership(
		{ user_id: 'old-user', guardian_mobile: '13800138000' },
		['current-user'],
		'13800138000'
	), true)
	assert.equal(guardianCore.isSameGuardianMembership(
		{ user_id: 'another-user', guardian_mobile: '13900139000' },
		['current-user'],
		'13800138000'
	), false)
})
