'use strict'

const subjectAuth = require('business-subject-auth')
const db = uniCloud.database()
const collection = db.collection('wtdb-business-assess-record')

exports.main = async (event = {}, context) => {
	try {
		const { childId, data = {}, restartAssessment = false, restartRecordId = '' } = event
		if (!childId || !data || typeof data !== 'object' || Array.isArray(data)) {
			return { code: 400, message: '缺少必要参数: childId 或 data' }
		}
		const shouldRestart = restartAssessment === true || restartAssessment === '1'
		const expectedRestartRecordId = String(restartRecordId || '').trim().slice(0, 200)

		const scope = await subjectAuth.getAuthScope(event, context)
		const { child, classInfo } = await subjectAuth.assertChildAssessmentAccess(scope, childId)
		const assessment = await getAssessmentDefinition(data)
		const assessorId = scope.uid
		const existingRecord = await collection.where({
			childId: child._id,
			assessorId,
			assessmentId: assessment._id
		}).get()
		const latestCompletedRecord = (existingRecord.data || [])
			.filter(record => record.isCompleted === true || record.reportStatus === 'completed')
			.sort((a, b) => getCompletedTime(b) - getCompletedTime(a))[0]
		const lastCompletedTime = latestCompletedRecord ? getCompletedTime(latestCompletedRecord) : null
		const activeRecords = (existingRecord.data || [])
			.filter(isActiveUnfinishedRecord)
			.sort((a, b) => getCompletedTime(b) - getCompletedTime(a))
		const unfinishedRecord = activeRecords[0]

		if (shouldRestart) {
			const restartedRecord = expectedRestartRecordId
				? (existingRecord.data || [])
					.filter(record =>
						record.restartedFromRecordId === expectedRestartRecordId &&
						record.isAbandoned !== true
					)
					.sort((a, b) => getCompletedTime(b) - getCompletedTime(a))[0]
				: null
			if (restartedRecord) {
				const sourceRecord = activeRecords.find(
					record => record.recordId === expectedRestartRecordId
				)
				if (sourceRecord) {
					await abandonAssessmentRecords([sourceRecord])
				}
				return {
					code: 200,
					result: withResumePosition(restartedRecord, lastCompletedTime),
					isContinue: isActiveUnfinishedRecord(restartedRecord),
					isRestarted: true,
					message: `已为${child.name}重新开始评估。`
				}
			}

			const restartTarget = expectedRestartRecordId
				? activeRecords.find(record => record.recordId === expectedRestartRecordId)
				: unfinishedRecord
			if (!restartTarget) {
				throw new subjectAuth.AuthError(409, '当前评估进度已变化，请返回首页刷新后重试')
			}

			const newRecord = await createNewAssessmentRecord({
				child,
				classInfo,
				assessment,
				data,
				assessorId,
				restartedFromRecordId: restartTarget.recordId
			})
			await abandonAssessmentRecords(activeRecords)
			return {
				code: 200,
				result: { ...newRecord, lastCompletedTime },
				isContinue: false,
				isFirstTime: false,
				isRestarted: true,
				message: `已保留原进度，并为${child.name}重新开始评估。`
			}
		}

		if (unfinishedRecord) {
			return {
				code: 200,
				result: withResumePosition(unfinishedRecord, lastCompletedTime),
				isContinue: true,
				message: `查到${child.name}的评估记录，请继续完成。`
			}
		}

		const newRecord = await createNewAssessmentRecord({ child, classInfo, assessment, data, assessorId })
		return {
			code: 200,
			result: { ...newRecord, lastCompletedTime },
			isContinue: false,
			isFirstTime: !existingRecord.data?.length,
			message: existingRecord.data?.length
				? `所有模块已完成，已为${child.name}创建新的评估记录。`
				: `这是${child.name}的第一次评估。`
		}
	} catch (error) {
		console.error('评估记录处理失败:', error)
		return subjectAuth.toErrorResponse(error, '评估记录处理失败')
	}
}

function getCompletedTime(record = {}) {
	return record.lastCompletedTime || record.lastSaveTime || record.updateTime || record.createTime || 0
}

function isActiveUnfinishedRecord(record = {}) {
	const isCompleted = record.isCompleted === true || record.reportStatus === 'completed'
	return !isCompleted &&
		record.isAbandoned !== true &&
		(record.modulesStatus || []).some(module => Number(module.status) !== 1)
}

function withResumePosition(record = {}, lastCompletedTime = null) {
	const modulesStatus = record.modulesStatus || []
	let lastSectionId = record.lastSectionId || ''
	let lastSectionIndex = 0
	if (!lastSectionId) {
		lastSectionIndex = modulesStatus.findIndex(module => Number(module.status) !== 1)
		if (lastSectionIndex < 0) lastSectionIndex = 0
		lastSectionId = modulesStatus[lastSectionIndex]?.sectionId || ''
	} else {
		lastSectionIndex = modulesStatus.findIndex(module => module.sectionId === lastSectionId)
		if (lastSectionIndex < 0) lastSectionIndex = 0
	}
	return { ...record, lastSectionId, lastSectionIndex, lastCompletedTime }
}

async function abandonAssessmentRecords(records = []) {
	const abandonedAt = Date.now()
	await Promise.all(records.map(record =>
		collection.doc(record._id).update({
			isAbandoned: true,
			abandonedAt,
			abandonReason: 'manual_restart'
		})
	))
}

async function getAssessmentDefinition(data) {
	const assessmentId = subjectAuth.compactId(data.assessmentId || data.assessment_id)
	if (!assessmentId) throw new subjectAuth.AuthError(400, '缺少评估量表ID')
	const [assessmentRes, sectionRes] = await Promise.all([
		db.collection('wtdb-business-assessment-list').doc(assessmentId).get(),
		db.collection('wtdb-business-assess-section').where({ assessment_id: assessmentId }).get()
	])
	const assessment = assessmentRes.data?.[0]
	if (!assessment || assessment.is_active === false) {
		throw new subjectAuth.AuthError(400, '评估量表不存在或已停用')
	}
	const sections = new Map((sectionRes.data || []).map(section => [section.section_id, section]))
	if (!sections.size) throw new subjectAuth.AuthError(400, '评估量表未配置模块')
	return { ...assessment, _id: assessmentId, sections }
}

function sanitizeModulesStatus(modulesStatus, assessment) {
	if (!Array.isArray(modulesStatus) || !modulesStatus.length || modulesStatus.length > 100) {
		throw new subjectAuth.AuthError(400, '评估模块数据无效')
	}
	const recordSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
	const seenSectionIds = new Set()
	return modulesStatus.map((module, index) => {
		const sectionId = String(module?.sectionId || '').trim()
		if (!sectionId) throw new subjectAuth.AuthError(400, `第 ${index + 1} 个评估模块缺少 sectionId`)
		if (seenSectionIds.has(sectionId)) throw new subjectAuth.AuthError(400, `评估模块 ${sectionId} 重复`)
		seenSectionIds.add(sectionId)
		const section = assessment.sections.get(sectionId)
		if (!section) throw new subjectAuth.AuthError(400, `评估模块 ${sectionId} 不属于当前量表`)
		return {
			sectionId,
			sectionName: String(section.section || section.name || module.sectionName || '').slice(0, 100),
			sectionRecordId: `${sectionId}_${recordSuffix}`,
			status: 0,
			totalSubSections: Math.max(0, Number(module.totalSubSections) || 0),
			completedSubSections: 0,
			lastSubSectionIndex: 0,
			hasStarted: false
		}
	})
}

async function createNewAssessmentRecord({
	child,
	classInfo,
	assessment,
	data,
	assessorId,
	restartedFromRecordId = ''
}) {
	const now = Date.now()
	const recordIdSuffix = `${child._id}_${now}`
	const recordId = `ablls_${recordIdSuffix}`
	const modulesStatus = sanitizeModulesStatus(data.modulesStatus, assessment)
	const safeData = { ...data }
	for (const key of [
		'_id', 'recordId', 'recordIdSuffix', 'assessmentId', 'assessment_id', 'assessmentTitle',
		'assessorId', 'childId', 'child_id', 'childName',
		'classId', 'class_id', 'className', 'modulesStatus', 'createTime', 'updateTime',
		'lastSaveTime', 'lastCompletedTime', 'lastSectionId', 'lastSectionIndex',
		'isCompleted', 'reportStatus', 'restartAssessment', 'restartRecordId',
		'isAbandoned', 'abandonedAt', 'abandonReason', 'restartedFromRecordId'
	]) delete safeData[key]

	const params = {
		...safeData,
		recordId,
		recordIdSuffix,
		assessmentId: assessment._id,
		assessmentTitle: assessment.title || '',
		assessorId,
		childId: child._id,
		childName: child.name,
		classId: classInfo._id,
		className: classInfo.nickname || '',
		modulesStatus,
		createTime: now,
		lastSaveTime: now,
		lastSectionId: modulesStatus[0]?.sectionId || '',
		lastSectionIndex: 0,
		isCompleted: false,
		isAbandoned: false,
		...(restartedFromRecordId ? { restartedFromRecordId } : {})
	}
	const addRes = await collection.add(params)
	return { ...params, _id: addRes.id }
}
