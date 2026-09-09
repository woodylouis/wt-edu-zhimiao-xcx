const test = require('node:test')
const assert = require('node:assert/strict')
const Module = require('node:module')
const path = require('node:path')

class AuthError extends Error {
	constructor(code, message) {
		super(message)
		this.code = code
		this.isAuthError = true
	}
}

function loadRestartCloudFunction(records) {
	const grantCollection = {
		where() {
			return {
				async update() {
					return { updated: 0 }
				}
			}
		}
	}
	const recordCollection = {
		where(query) {
			return {
				async get() {
					return {
						data: records.filter(record =>
							record.childId === query.childId &&
							record.assessorId === query.assessorId &&
							record.assessmentId === query.assessmentId
						)
					}
				}
			}
		},
		doc(id) {
			return {
				async update(patch) {
					const record = records.find(item => item._id === id)
					Object.assign(record, patch)
					return { updated: 1 }
				}
			}
		},
		async add(data) {
			const id = `record-doc-${records.length + 1}`
			records.push({ ...data, _id: id })
			return { id }
		}
	}
	const database = {
		command: {
			in: values => ({ $in: values })
		},
		collection(name) {
			if (name === 'wtdb-business-assess-record') return recordCollection
			if (name === 'wtdb-wechat-sub-grants') return grantCollection
			if (name === 'wtdb-business-assessment-list') {
				return {
					doc() {
						return {
							async get() {
								return { data: [{ _id: 'assessment-1', title: 'ABLLS-R' }] }
							}
						}
					}
				}
			}
			if (name === 'wtdb-business-assess-section') {
				return {
					where() {
						return {
							async get() {
								return {
									data: [{ section_id: 'section-1', section: '基础能力' }]
								}
							}
						}
					}
				}
			}
			throw new Error(`Unexpected collection: ${name}`)
		}
	}
	const subjectAuth = {
		AuthError,
		compactId: value => String(value || ''),
		async getAuthScope() {
			return { uid: 'teacher-1' }
		},
		async assertChildAssessmentAccess() {
			return {
				child: { _id: 'child-1', name: '小苗' },
				classInfo: { _id: 'class-1', nickname: '向日葵班' }
			}
		},
		toErrorResponse(error, fallback) {
			return error.isAuthError
				? { code: error.code, message: error.message }
				: { code: 500, message: `${fallback}: ${error.message}` }
		}
	}

	const originalLoad = Module._load
	const originalUniCloud = global.uniCloud
	const modulePath = path.resolve(
		__dirname,
		'../uniCloud-aliyun/cloudfunctions/wt-upload-assess-record/index.js'
	)
	try {
		global.uniCloud = { database: () => database }
		Module._load = function (request, parent, isMain) {
			if (request === 'business-subject-auth') return subjectAuth
			return originalLoad.call(this, request, parent, isMain)
		}
		delete require.cache[modulePath]
		return require(modulePath)
	} finally {
		Module._load = originalLoad
		global.uniCloud = originalUniCloud
		delete require.cache[modulePath]
	}
}

test('restarting an assessment preserves the old record and creates fresh progress once', async () => {
	const records = [{
		_id: 'old-record-doc',
		recordId: 'old-record',
		assessmentId: 'assessment-1',
		assessorId: 'teacher-1',
		childId: 'child-1',
		createTime: 1700000000000,
		lastSaveTime: 1700100000000,
		isCompleted: false,
		modulesStatus: [{
			sectionId: 'section-1',
			status: 0,
			hasStarted: true,
			completedSubSections: 2
		}]
	}]
	const cloudFunction = loadRestartCloudFunction(records)
	const event = {
		childId: 'child-1',
		restartAssessment: true,
		restartRecordId: 'old-record',
		data: {
			assessmentId: 'assessment-1',
			modulesStatus: [{
				sectionId: 'section-1',
				totalSubSections: 5
			}]
		}
	}

	const firstResult = await cloudFunction.main(event, {})
	assert.equal(firstResult.code, 200)
	assert.equal(firstResult.isRestarted, true)
	assert.equal(firstResult.isContinue, false)
	assert.equal(records[0].isAbandoned, true)
	assert.equal(records[0].abandonReason, 'manual_restart')
	assert.equal(records.length, 2)
	assert.equal(firstResult.result.restartedFromRecordId, 'old-record')
	assert.ok(firstResult.result.createTime > records[0].createTime)
	assert.equal(firstResult.result.modulesStatus[0].completedSubSections, 0)
	assert.equal(firstResult.result.modulesStatus[0].hasStarted, false)

	const secondResult = await cloudFunction.main(event, {})
	assert.equal(secondResult.code, 200)
	assert.equal(secondResult.isRestarted, true)
	assert.equal(records.length, 2)
	assert.equal(secondResult.result.recordId, firstResult.result.recordId)
})
