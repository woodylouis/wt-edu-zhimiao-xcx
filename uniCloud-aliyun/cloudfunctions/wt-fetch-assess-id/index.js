'use strict'

const subjectAuth = require('business-subject-auth')
const db = uniCloud.database()
const collection = db.collection('wtdb-business-assess-record')

exports.main = async (event = {}, context) => {
	try {
		const { childId } = event
		if (!childId) return { code: 400, message: '缺少必要参数: childId' }
		const scope = await subjectAuth.getAuthScope(event, context)
		const { child } = await subjectAuth.assertChildAssessmentAccess(scope, childId)
		const res = await collection.where({ childId: child._id, assessorId: scope.uid }).get()
		const existing = (res.data || []).find(record =>
			(record.modulesStatus || []).some(module => module.status !== 1)
		)
		if (existing) return { code: 200, data: { recordId: existing.recordId } }

		const now = Date.now()
		return {
			code: 200,
			data: { recordId: `ablls_${child._id}_${now}`, suffix: `${child._id}_${now}` }
		}
	} catch (error) {
		console.error('评估ID查询失败:', error)
		return subjectAuth.toErrorResponse(error, '评估ID查询失败')
	}
}
