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
		if (!(record.modulesStatus || []).some(module => module.sectionId === sectionId)) {
			return { code: 400, message: '该模块不属于当前评估记录' }
		}

		const assessorId = record.assessorId
		const query = { recordId, assessmentId, assessorId, childId, sectionId }
		const safeData = sanitizeHistoryData(data)
		const existingRecord = await collection.where(query).count()
		const now = Date.now()
		let result
		if (existingRecord.total > 0) {
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
		return { code: 200, message: existingRecord.total > 0 ? '记录更新成功' : '记录创建成功', data: result }
	} catch (error) {
		console.error('评估历史保存失败:', error)
		return subjectAuth.toErrorResponse(error, '评估历史保存失败')
	}
}

function sanitizeHistoryData(data) {
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
	return safeData
}

async function updateRecordSaveTime({ record, sectionId, data, now, currentSubSectionId, currentSubSectionName, currentSubSectionIndex }) {
	const modulesStatus = record.modulesStatus || []
	const assessmentRecords = data.assessmentRecords || []
	const completedSubSections = assessmentRecords.filter(item => item.allQuestionsCompleted).length
	const currentModule = modulesStatus.find(module => module.sectionId === sectionId)
	const totalSubSections = assessmentRecords.length || currentModule?.totalSubSections || 0
	const isModuleComplete = totalSubSections > 0 && completedSubSections >= totalSubSections
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
		lastSubSectionId: currentSubSectionId || module.lastSubSectionId,
		lastSubSectionName: currentSubSectionName || module.lastSubSectionName,
		lastSubSectionIndex: currentSubSectionIndex !== undefined ? currentSubSectionIndex : module.lastSubSectionIndex,
		subSectionsProgress
	} : module)
	const allModulesCompleted = updatedModulesStatus.length > 0 && updatedModulesStatus.every(module => module.status === 1)
	const updateData = {
		lastSaveTime: now,
		lastSectionId: sectionId,
		modulesStatus: updatedModulesStatus,
		isCompleted: allModulesCompleted
	}
	if (allModulesCompleted && !record.lastCompletedTime) updateData.lastCompletedTime = now
	await recordCollection.doc(record._id).update(updateData)
}
