'use strict'

const assert = require('node:assert/strict')
const Module = require('node:module')
const path = require('node:path')
const test = require('node:test')

class AuthError extends Error {
	constructor(code, message) {
		super(message)
		this.code = code
		this.isAuthError = true
	}
}

global.uniCloud = {
	database: () => ({ command: {} })
}

const originalLoad = Module._load
Module._load = function loadWithBusinessAuthStub(request, parent, isMain) {
	if (request === 'business-auth') {
		return {
			AuthError,
			compactId: value => String(value || '')
		}
	}
	return originalLoad.call(this, request, parent, isMain)
}

const approvalPath = path.resolve(
	__dirname,
	'../uniCloud-aliyun/cloudfunctions/wtdb-class-approval/index.js'
)
delete require.cache[approvalPath]
const { _test: approval } = require(approvalPath)
Module._load = originalLoad

const birthdate = Date.UTC(2021, 4, 6)

test('parent application normalizes child profile and relationship values', () => {
	const result = approval.normalizeParentApplication({
		childName: '果果',
		childGender: 'female',
		childBirthdate: birthdate,
		relationship: '妈妈',
		childId: 'client-controlled-child'
	})

	assert.deepEqual(result, {
		childName: '果果',
		childGender: '女孩',
		childBirthdate: birthdate,
		relationship: 'mother'
	})
})

test('parent application rejects unsupported relationships and future birthdays', () => {
	assert.throws(
		() => approval.normalizeParentApplication({
			childName: '果果',
			childGender: '女孩',
			childBirthdate: birthdate,
			relationship: 'teacher'
		}),
		(error) => error.code === 400 && error.message === '请选择您与孩子的关系'
	)
	assert.throws(
		() => approval.normalizeParentApplication({
			childName: '果果',
			childGender: '女孩',
			childBirthdate: Date.now() + 86400000,
			relationship: 'mother'
		}),
		(error) => error.code === 400 && error.message === '孩子出生日期不正确'
	)
})

test('approved parent child record is scoped to the requested class and applicant', () => {
	const normalized = approval.normalizeParentApplication({
		child_name: '果果',
		child_gender: '女孩',
		child_birthdate: birthdate,
		relationship: 'mother'
	})
	const child = approval.buildParentChildData(normalized, 'class-a', 'parent-user', 123456)

	assert.equal(child.class_id, 'class-a')
	assert.equal(child.created_by, 'parent-user')
	assert.equal(child.name, '果果')
	assert.equal(child.birthdate, birthdate)
	assert.equal(child.formatBirthdate, '2021年05月06日')
})

test('approved parent membership always links the server-created child', () => {
	const membership = approval.buildMembershipData({
		request: {
			requested_role: 'parent',
			child_name: '果果',
			child_gender: '女孩',
			child_birthdate: birthdate,
			relationship: 'mother'
		},
		classId: 'class-a',
		applicantUserId: 'parent-user',
		applicantNickname: '果果妈妈',
		childId: 'server-created-child',
		now: 123456,
		reviewerId: 'head-teacher',
		approvalId: 'approval-a'
	})

	assert.equal(membership.role, 'parent')
	assert.equal(membership.child_id, 'server-created-child')
	assert.equal(membership.relationship, 'mother')
	assert.equal(membership.class_id, 'class-a')
	assert.equal(membership.user_id, 'parent-user')
})

test('parent membership cannot be created without a linked child', () => {
	assert.throws(
		() => approval.buildMembershipData({
			request: {
				requested_role: 'parent',
				child_name: '果果',
				child_gender: '女孩',
				child_birthdate: birthdate,
				relationship: 'mother'
			},
			classId: 'class-a',
			applicantUserId: 'parent-user',
			applicantNickname: '果果妈妈',
			childId: '',
			now: 123456,
			reviewerId: 'head-teacher',
			approvalId: 'approval-a'
		}),
		(error) => error.code === 409 && error.message === '家长成员缺少关联儿童'
	)
})
