'use strict'

const subjectAuth = require('business-subject-auth')
const wechatSubscribe = require('wechat-subscribe-service')

const db = uniCloud.database()

function safeRecord(record = {}) {
	return {
		recordId: record.recordId || '',
		assessmentId: record.assessmentId || record.assessment_id || '',
		assessmentTitle: record.assessmentTitle || '儿童成长评估',
		assessorId: record.assessorId || '',
		childId: record.childId || record.child_id || '',
		childName: record.childName || '',
		childAge: record.childAge || '',
		ageInt: Number(record.ageInt) || 0,
		classId: record.classId || record.class_id || '',
		className: record.className || '',
		avatar: record.avatar || '',
		birthdate: record.birthdate || null,
		gender: record.gender || '',
		modulesStatus: record.modulesStatus || [],
		createTime: Number(record.createTime) || null,
		lastSaveTime: Number(record.lastSaveTime) || null,
		lastCompletedTime: Number(record.lastCompletedTime) || null,
		lastSectionId: record.lastSectionId || '',
		lastSectionIndex: Number(record.lastSectionIndex) || 0,
		isCompleted: record.isCompleted === true,
		isAbandoned: record.isAbandoned === true,
		assessmentStatus: record.assessmentStatus || (record.isCompleted ? 'completed' : 'in_progress'),
		reportStatus: record.reportStatus || 'not_requested',
		plannedEndTime: Number(record.plannedEndTime) || null,
		nextReminderAt: Number(record.nextReminderAt) || null,
		prefillMode: record.prefillMode || '',
		prefilledQuestionCount: Number(record.prefilledQuestionCount) || 0,
		prefillReviewedQuestionCount: Number(record.prefillReviewedQuestionCount) || 0,
		prefillPendingQuestionCount: Number(record.prefillPendingQuestionCount) || 0
	}
}

async function resolveOwnedRecord(event, scope) {
	const recordId = subjectAuth.compactId(event.recordId)
	if (!recordId) throw new subjectAuth.AuthError(400, '缺少评估记录ID')
	const result = await db.collection('wtdb-business-assess-record').where({ recordId }).limit(1).get()
	const record = result.data && result.data[0]
	if (!record) throw new subjectAuth.AuthError(404, '评估记录不存在')
	return subjectAuth.assertOwnedAssessmentRecord(scope, {
		recordId,
		childId: record.childId || record.child_id,
		assessmentId: record.assessmentId || record.assessment_id
	})
}

exports.main = async (event = {}, context) => {
	try {
		const scope = await subjectAuth.getAuthScope(event, context)
		if (event.action === 'config') {
			return { code: 200, message: '查询成功', data: wechatSubscribe.publicTemplateConfig() }
		}

		const record = await resolveOwnedRecord(event, scope)
		if (event.action === 'grant-status') {
			const data = await wechatSubscribe.getGrantStatus({
				recipientUserId: scope.uid,
				recordId: record.recordId,
				templateKey: event.templateKey
			})
			return { code: 200, message: '查询成功', data }
		}

		if (event.action === 'record-decision') {
			const data = await wechatSubscribe.recordGrantDecision({
				recipientUserId: scope.uid,
				record,
				templateKey: event.templateKey,
				nativeResult: event.nativeResult
			})
			return { code: 200, message: '订阅选择已记录', data }
		}

		if (event.action === 'resolve-record') {
			return { code: 200, message: '查询成功', data: safeRecord(record) }
		}

		throw new subjectAuth.AuthError(400, '不支持的操作')
	} catch (error) {
		console.error('微信订阅消息操作失败:', error)
		return subjectAuth.toErrorResponse(error, '微信订阅消息操作失败')
	}
}
