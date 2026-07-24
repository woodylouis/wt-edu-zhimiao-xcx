'use strict'

const subjectAuth = require('business-subject-auth')
const db = uniCloud.database()
const collection = db.collection('wtdb-business-assess-history')
const recordCollection = db.collection('wtdb-business-assess-record')

exports.main = async (event = {}, context) => {
	try {
		const { recordId, assessmentId, childId, sectionId, data = {} } = event
		if (!recordId || !assessmentId || !childId || !sectionId) {
			return { code: 400, message: '缺少必要参数' }
		}
		if (!data || typeof data !== 'object' || Array.isArray(data)) {
			return { code: 400, message: '评估数据格式无效' }
		}

		const scope = await subjectAuth.getAuthScope(event, context)
		const record = await subjectAuth.assertOwnedAssessmentRecord(scope, { recordId, childId, assessmentId })
		if (record.isAbandoned === true) {
			throw new subjectAuth.AuthError(409, '该评估已重新开始，原进度不能再修改')
		}
		if (!(record.modulesStatus || []).some(module => module.sectionId === sectionId)) {
			return { code: 400, message: '该模块不属于当前评估记录' }
		}

		const assessorId = record.assessorId
		const query = { recordId, assessmentId, assessorId, childId, sectionId }
		const existingResult = await collection.where(query).limit(1).get()
		const existingHistory = existingResult.data?.[0] || null
		const safeData = sanitizeHistoryData(data, record, existingHistory)
		const now = Date.now()
		let result
		if (existingHistory) {
			result = await collection.where(query).update({ ...safeData, updateTime: now })
		} else {
			result = await collection.add({ ...safeData, ...query, createTime: now, updateTime: now })
		}

		await updateRecordSaveTime({
			record,
			sectionId,
			data: safeData,
			now,
			currentSubSectionId: event.currentSubSectionId,
			currentSubSectionName: event.currentSubSectionName,
			currentSubSectionIndex: event.currentSubSectionIndex
		})
		return { code: 200, message: existingHistory ? '记录更新成功' : '记录创建成功', data: result }
	} catch (error) {
		console.error('评估历史保存失败:', error)
		return subjectAuth.toErrorResponse(error, '评估历史保存失败')
	}
}

function questionKey(question = {}) {
	return subjectAuth.compactId(question._id || question.questionId)
}

function buildStoredPrefillMap(history = null) {
	const result = new Map()
	for (const group of history?.assessmentRecords || []) {
		for (const question of group.questions || []) {
			if (!question?.prefilled) continue
			const key = questionKey(question)
			if (key) result.set(key, question)
		}
	}
	return result
}

function sanitizeHistoryData(data, record = {}, existingHistory = null) {
	const safeData = { ...data }
	for (const key of [
		'_id', 'recordId', 'assessmentId', 'assessorId', 'childId', 'sectionId',
		'createTime', 'updateTime', 'taskId', 'reportId'
	]) delete safeData[key]
	if (safeData.assessmentRecords && !Array.isArray(safeData.assessmentRecords)) {
		throw new subjectAuth.AuthError(400, 'assessmentRecords 格式无效')
	}
	if (safeData.assessmentRecords?.length > 500) {
		throw new subjectAuth.AuthError(400, '单次保存的评估子项过多')
	}
	const storedPrefills = buildStoredPrefillMap(existingHistory)
	const incomingPrefills = new Map()
	for (const group of safeData.assessmentRecords || []) {
		if (!Array.isArray(group.questions)) {
			throw new subjectAuth.AuthError(400, '评估题目格式无效')
		}
		for (const question of group.questions) {
			if (!question?.prefilled) continue
			const key = questionKey(question)
			const storedQuestion = storedPrefills.get(key)
			if (!key || !storedQuestion) {
				throw new subjectAuth.AuthError(400, '不能新增或替换历史预填答案来源')
			}
			if (record.prefillMode !== 'history') {
				throw new subjectAuth.AuthError(400, '当前评估不是历史预填评估')
			}
			if (!['pending', 'confirmed', 'changed'].includes(question.reviewStatus)) {
				throw new subjectAuth.AuthError(400, '历史预填答案复核状态无效')
			}
			if (
				['confirmed', 'changed'].includes(storedQuestion.reviewStatus) &&
				question.reviewStatus === 'pending'
			) {
				throw new subjectAuth.AuthError(400, '已复核的历史答案不能恢复为待复核')
			}
			if (!question.sourceRecordId ||
				question.sourceRecordId !== record.prefilledFromRecordId) {
				throw new subjectAuth.AuthError(400, '历史预填答案来源记录无效')
			}
			if (question.reviewStatus !== 'pending' && (!question.reviewedBy || !question.reviewedAt)) {
				throw new subjectAuth.AuthError(400, '已复核的历史答案缺少复核人或复核时间')
			}
			if (question.reviewStatus !== 'pending' && question.reviewedBy !== record.assessorId) {
				throw new subjectAuth.AuthError(400, '历史答案复核人无效')
			}
			if (
				question.prefillOriginalAnswer !== storedQuestion.prefillOriginalAnswer ||
				Number(question.prefillOriginalScore) !== Number(storedQuestion.prefillOriginalScore)
			) {
				throw new subjectAuth.AuthError(400, '历史预填原始答案不可修改')
			}
			incomingPrefills.set(key, question)
		}
	}
	for (const key of storedPrefills.keys()) {
		if (!incomingPrefills.has(key)) {
			throw new subjectAuth.AuthError(400, '历史预填答案必须完成复核，不能移除')
		}
	}
	return safeData
}

async function updateRecordSaveTime({ record, sectionId, data, now, currentSubSectionId, currentSubSectionName, currentSubSectionIndex }) {
	const modulesStatus = record.modulesStatus || []
	const assessmentRecords = data.assessmentRecords || []
	const completedSubSections = assessmentRecords.filter(item => item.allQuestionsCompleted).length
	const currentModule = modulesStatus.find(module => module.sectionId === sectionId)
	const totalSubSections = assessmentRecords.length || currentModule?.totalSubSections || 0
	const moduleQuestions = assessmentRecords.flatMap(item => item.questions || [])
	const prefilledQuestions = moduleQuestions.filter(question => question.prefilled)
	const reviewedPrefilledQuestions = prefilledQuestions.filter(question =>
		['confirmed', 'changed'].includes(question.reviewStatus)
	)
	const pendingPrefilledQuestions = Math.max(
		0,
		prefilledQuestions.length - reviewedPrefilledQuestions.length
	)
	const isModuleComplete = totalSubSections > 0 &&
		completedSubSections >= totalSubSections &&
		pendingPrefilledQuestions === 0
	const subSectionsProgress = assessmentRecords.map(item => {
		const questions = item.questions || []
		return {
			subSectionId: item.alphabet,
			subSectionName: item.sectioName || item.sectionName,
			completedQuestions: questions.filter(question => question.options?.some(option => option.selected)).length,
			totalQuestions: item.totalQuestions || questions.length,
			isCompleted: item.allQuestionsCompleted || false
		}
	})

	const updatedModulesStatus = modulesStatus.map(module => module.sectionId === sectionId ? {
		...module,
		status: isModuleComplete ? 1 : 0,
		completedSubSections,
		totalSubSections: totalSubSections > 0 ? totalSubSections : module.totalSubSections,
		hasStarted: true,
		prefilledQuestions: prefilledQuestions.length,
		reviewedPrefilledQuestions: reviewedPrefilledQuestions.length,
		pendingPrefilledQuestions,
		lastSubSectionId: currentSubSectionId || module.lastSubSectionId,
		lastSubSectionName: currentSubSectionName || module.lastSubSectionName,
		lastSubSectionIndex: currentSubSectionIndex !== undefined ? currentSubSectionIndex : module.lastSubSectionIndex,
		subSectionsProgress
	} : module)
	const allModulesCompleted = updatedModulesStatus.length > 0 && updatedModulesStatus.every(module => module.status === 1)
	const prefillSummary = await calculatePrefillReviewSummary(record.recordId)
	const updateData = {
		lastSaveTime: now,
		lastSectionId: sectionId,
		modulesStatus: updatedModulesStatus,
		isCompleted: allModulesCompleted,
		prefilledQuestionCount: prefillSummary.prefilledQuestionCount,
		prefillReviewedQuestionCount: prefillSummary.reviewedQuestionCount,
		prefillPendingQuestionCount: prefillSummary.pendingQuestionCount
	}
	if (allModulesCompleted && !record.lastCompletedTime) updateData.lastCompletedTime = now
	await recordCollection.doc(record._id).update(updateData)
}

async function calculatePrefillReviewSummary(recordId) {
	if (!recordId) {
		return { prefilledQuestionCount: 0, reviewedQuestionCount: 0, pendingQuestionCount: 0 }
	}
	const result = await collection.where({ recordId }).limit(100).get()
	let prefilledQuestionCount = 0
	let reviewedQuestionCount = 0
	for (const history of result.data || []) {
		for (const group of history.assessmentRecords || []) {
			for (const question of group.questions || []) {
				if (!question.prefilled) continue
				prefilledQuestionCount++
				if (['confirmed', 'changed'].includes(question.reviewStatus)) {
					reviewedQuestionCount++
				}
			}
		}
	}
	return {
		prefilledQuestionCount,
		reviewedQuestionCount,
		pendingQuestionCount: Math.max(0, prefilledQuestionCount - reviewedQuestionCount)
	}
}
