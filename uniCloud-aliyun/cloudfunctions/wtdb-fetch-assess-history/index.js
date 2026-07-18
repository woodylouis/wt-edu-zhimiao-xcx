'use strict'

const subjectAuth = require('business-subject-auth')
const db = uniCloud.database()
const collection = db.collection('wtdb-business-assess-history')

exports.main = async (event = {}, context) => {
	try {
		const { recordId, sectionId, childId } = event
		if (!recordId || !sectionId || !childId) {
			return { code: 400, message: '缺少必要参数: recordId, sectionId, childId' }
		}
		const scope = await subjectAuth.getAuthScope(event, context)
		const record = await subjectAuth.assertOwnedAssessmentRecord(scope, { recordId, childId })
		if (!(record.modulesStatus || []).some(module => module.sectionId === sectionId)) {
			return { code: 400, message: '该模块不属于当前评估记录' }
		}
		const res = await collection.where({ recordId, sectionId, assessorId: record.assessorId, childId }).get()
		return {
			code: 200,
			data: res.data || [],
			message: res.data?.length ? '查询成功' : '无历史记录'
		}
	} catch (error) {
		console.error('评估历史查询失败:', error)
		return subjectAuth.toErrorResponse(error, '评估历史查询失败')
	}
}
