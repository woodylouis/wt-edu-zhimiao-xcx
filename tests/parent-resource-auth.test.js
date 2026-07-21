'use strict'

const assert = require('node:assert/strict')
const Module = require('node:module')
const test = require('node:test')
const path = require('node:path')

const rows = {
	'uni-id-users': [
		{ _id: 'parent-user' }
	],
	'wtdb-business-school-list': [],
	'wtdb-business-children': [
		{ _id: 'child-linked', class_id: 'class-a', name: '关联孩子' },
		{ _id: 'child-other', class_id: 'class-a', name: '其他孩子' }
	],
	'wtdb-business-class-list': [
		{ _id: 'class-a', school_id: 'school-a' }
	],
	'wtdb-business-class-member': [
		{
			_id: 'membership-parent',
			class_id: 'class-a',
			user_id: 'parent-user',
			role: 'parent',
			child_id: 'child-linked'
		},
		{
			_id: 'membership-teacher',
			class_id: 'class-a',
			user_id: 'teacher-user',
			role: 'teacher'
		}
	],
	'wtdb-business-assess-report': [
		{
			_id: 'report-linked-document',
			reportId: 'report-linked',
			childId: 'child-linked',
			childName: '关联孩子',
			completionTime: 100
		},
		{
			_id: 'report-other-document',
			reportId: 'report-other',
			childId: 'child-other',
			childName: '其他孩子',
			completionTime: 200
		}
	],
	'wtdb-business-assessment-list': []
}

function matches(document, where = {}) {
	return Object.entries(where).every(([key, expected]) => {
		if (expected && expected.__operator === 'in') {
			return expected.values.includes(document[key])
		}
		return document[key] === expected
	})
}

function queryResult(data) {
	return {
		field() { return this },
		orderBy() { return this },
		limit() { return this },
		async get() { return { data } }
	}
}

const fakeDb = {
	command: {
		in(values) {
			return { __operator: 'in', values }
		}
	},
	collection(name) {
		return {
			doc(id) {
				return queryResult((rows[name] || []).filter(item => item._id === id))
			},
			where(where) {
				return queryResult((rows[name] || []).filter(item => matches(item, where)))
			}
		}
	}
}

global.uniCloud = { database: () => fakeDb }

const originalLoad = Module._load
Module._load = function loadWithUniIdStub(request, parent, isMain) {
	if (request === 'uni-id-common') {
		return { createInstance: () => ({ checkToken: async () => ({ uid: 'parent-user' }) }) }
	}
	return originalLoad.call(this, request, parent, isMain)
}

const authPath = path.resolve(
	__dirname,
	'../uniCloud-aliyun/cloudfunctions/common/business-subject-auth/index.js'
)
delete require.cache[authPath]
const subjectAuth = require(authPath)
Module._load = originalLoad

const reportHistoryPath = path.resolve(
	__dirname,
	'../uniCloud-aliyun/cloudfunctions/wt-fetch-child-report-history/index.js'
)
delete require.cache[reportHistoryPath]
const reportHistory = require(reportHistoryPath)

const parentScope = {
	uid: 'parent-user',
	userIds: ['parent-user'],
	schoolIds: [],
	isGlobalBusinessAdmin: false
}

const teacherScope = {
	uid: 'teacher-user',
	userIds: ['teacher-user'],
	schoolIds: [],
	isGlobalBusinessAdmin: false
}

test('parent can read the child linked by the selected membership', async () => {
	const result = await subjectAuth.assertChildReadAccess(parentScope, 'child-linked')
	assert.equal(result.child._id, 'child-linked')
})

test('parent cannot read another child in the same class', async () => {
	await assert.rejects(
		() => subjectAuth.assertChildReadAccess(parentScope, 'child-other'),
		(error) => error.code === 403 && error.message === '无权访问该儿童数据'
	)
})

test('parent cannot start or modify an assessment for the linked child', async () => {
	await assert.rejects(
		() => subjectAuth.assertChildAssessmentAccess(parentScope, 'child-linked'),
		(error) => error.code === 403 && error.message === '只有该班级的授权老师可以进行评估'
	)
})

test('authorized teacher retains assessment access for children in the class', async () => {
	const result = await subjectAuth.assertChildAssessmentAccess(teacherScope, 'child-other')
	assert.equal(result.child._id, 'child-other')
})

test('linked-child report request succeeds through the protected report endpoint', async () => {
	const result = await reportHistory.main({
		childId: 'child-linked',
		uniIdToken: 'parent-token'
	}, {})

	assert.equal(result.code, 200)
	assert.deepEqual(result.data.map(item => item.reportId), ['report-linked'])
})

test('client-controlled report id is reauthorized and cannot expose another child', async () => {
	const originalConsoleError = console.error
	console.error = () => {}
	let result
	try {
		result = await reportHistory.main({
			reportId: 'report-other',
			uniIdToken: 'parent-token'
		}, {})
	} finally {
		console.error = originalConsoleError
	}

	assert.equal(result.code, 403)
	assert.equal(result.msg, '无权访问该儿童数据')
})
