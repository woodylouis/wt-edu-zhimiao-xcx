'use strict'

const subjectAuth = require('business-subject-auth')
const { buildPrefillHistories, countCompatibleAnswers } = require('./lib/prefill')
const db = uniCloud.database()
const dbCmd = db.command
const collection = db.collection('wtdb-business-assess-record')
const getHistoryCollection = () => db.collection('wtdb-business-assess-history')
const getGrantCollection = () => db.collection('wtdb-wechat-sub-grants')
const DAY_MS = 24 * 60 * 60 * 1000

exports.main = async (event = {}, context) => {
	try {
		const {
			action = 'start',
			childId,
			data = {},
			restartAssessment = false,
			restartRecordId = '',
			startMode = 'blank',
			prefillFromRecordId = ''
		} = event
		if (!childId || !data || typeof data !== 'object' || Array.isArray(data)) {
			return { code: 400, message: '缺少必要参数: childId 或 data' }
		}
		const shouldRestart = restartAssessment === true || restartAssessment === '1'
		const expectedRestartRecordId = String(restartRecordId || '').trim().slice(0, 200)

		const scope = await subjectAuth.getAuthScope(event, context)
		const { child, classInfo } = await subjectAuth.assertChildAssessmentAccess(scope, childId)
		const assessment = await getAssessmentDefinition(data)
		const assessorId = scope.uid
		if (action === 'prefillSources') {
			return {
				code: 200,
				data: await listPrefillSources({
					child,
					assessment,
					age: data.ageInt,
					currentAssessorId: assessorId
				}),
				message: '查询成功'
			}
		}
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

		let prefillSource = null
		if (startMode === 'prefill') {
			prefillSource = await getValidPrefillSource({
				sourceRecordId: String(prefillFromRecordId || '').trim(),
				childId: child._id,
				assessmentId: assessment._id
			})
		}
		const newRecord = await createNewAssessmentRecord({
			child,
			classInfo,
			assessment,
			data,
			assessorId,
			prefillSource
		})
		if (prefillSource) {
			try {
				const copied = await copyPrefillHistory({
					sourceRecord: prefillSource,
					targetRecord: newRecord,
					assessment,
					age: data.ageInt,
					assessorId
				})
				newRecord.prefilledQuestionCount = copied.matchedCount
				newRecord.prefillTotalQuestionCount = copied.totalQuestions
				newRecord.prefillReviewedQuestionCount = 0
				newRecord.prefillPendingQuestionCount = copied.matchedCount
				newRecord.modulesStatus = copied.modulesStatus
			} catch (error) {
				await Promise.all([
					collection.doc(newRecord._id).update({
						isAbandoned: true,
						abandonedAt: Date.now(),
						abandonReason: 'prefill_failed'
					}),
					getHistoryCollection().where({ recordId: newRecord.recordId }).remove()
				])
				throw error
			}
		}
		return {
			code: 200,
			result: { ...newRecord, lastCompletedTime },
			isContinue: false,
			isFirstTime: !existingRecord.data?.length,
			message: prefillSource
				? `已参考历史记录，为${child.name}创建新的待复核评估。`
				: existingRecord.data?.length
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
			assessmentStatus: 'abandoned',
			abandonedAt,
			abandonReason: 'manual_restart'
		})
	))
	const recordIds = records.map(record => record.recordId).filter(Boolean)
	if (!recordIds.length) return
	try {
		await getGrantCollection().where({
			record_id: dbCmd.in(recordIds),
			template_key: 'assessment_reminder',
			status: 'accepted'
		}).update({
			status: 'cancelled',
			cancelled_time: abandonedAt,
			last_error: '评估已重新开始',
			update_time: abandonedAt
		})
	} catch (error) {
		// 取消提醒失败不应阻断重新开始；零点任务还会根据 isAbandoned 拦截。
		console.warn('取消旧评估提醒失败:', error)
	}
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
	restartedFromRecordId = '',
	prefillSource = null
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
		'isCompleted', 'assessmentStatus', 'reportStatus', 'plannedEndTime',
		'nextReminderAt', 'reminderSentAt', 'restartAssessment', 'restartRecordId',
		'isAbandoned', 'abandonedAt', 'abandonReason', 'restartedFromRecordId',
		'startMode', 'prefillFromRecordId', 'prefillMode', 'prefilledFromRecordId',
		'prefilledAt', 'prefilledBy', 'prefillSourceCompletedAt',
		'prefilledQuestionCount', 'prefillTotalQuestionCount',
		'prefillReviewedQuestionCount', 'prefillPendingQuestionCount'
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
		assessmentStatus: 'started',
		reportStatus: 'not_requested',
		plannedEndTime: now + (3 * DAY_MS),
		nextReminderAt: now + DAY_MS,
		lastSectionId: modulesStatus[0]?.sectionId || '',
		lastSectionIndex: 0,
		isCompleted: false,
		isAbandoned: false,
		...(restartedFromRecordId ? { restartedFromRecordId } : {}),
		...(prefillSource ? {
			prefillMode: 'history',
			prefilledFromRecordId: prefillSource.recordId,
			prefilledAt: now,
			prefilledBy: assessorId,
			prefillSourceCompletedAt: getCompletedTime(prefillSource),
			prefilledQuestionCount: 0,
			prefillTotalQuestionCount: 0,
			prefillReviewedQuestionCount: 0,
			prefillPendingQuestionCount: 0
		} : {})
	}
	const addRes = await collection.add(params)
	return { ...params, _id: addRes.id }
}

async function loadCurrentQuestions(assessmentId) {
	const questions = []
	const pageSize = 500
	for (let offset = 0; offset < 10000; offset += pageSize) {
		const result = await db.collection('wtdb-business-assessment-q')
			.where({ assessment_id: assessmentId })
			.skip(offset)
			.limit(pageSize)
			.get()
		const page = result.data || []
		questions.push(...page)
		if (page.length < pageSize) break
	}
	return questions
}

async function loadHistoryRows(recordIds, childId) {
	if (!recordIds.length) return []
	const histories = []
	const pageSize = 500
	for (let offset = 0; offset < 5000; offset += pageSize) {
		const result = await getHistoryCollection().where({
			recordId: dbCmd.in(recordIds),
			childId
		}).skip(offset).limit(pageSize).get()
		const page = result.data || []
		histories.push(...page)
		if (page.length < pageSize) break
	}
	return histories
}

async function listPrefillSources({ child, assessment, age, currentAssessorId }) {
	const recordResult = await collection.where({
		childId: child._id,
		assessmentId: assessment._id
	}).limit(100).get()
	const completedRecords = (recordResult.data || [])
		.filter(record =>
			record.isAbandoned !== true &&
			(record.isCompleted === true || record.reportStatus === 'completed')
		)
		.sort((left, right) => getCompletedTime(right) - getCompletedTime(left))
		.slice(0, 10)
	if (!completedRecords.length) return []

	const currentQuestions = await loadCurrentQuestions(assessment._id)
	const recordIds = completedRecords.map(record => record.recordId)
	const historyRows = await loadHistoryRows(recordIds, child._id)
	const assessorIds = [...new Set(completedRecords
		.map(record => subjectAuth.compactId(record.assessorId))
		.filter(Boolean))]
	const userResult = assessorIds.length
		? await db.collection('uni-id-users')
			.where({ _id: dbCmd.in(assessorIds) })
			.field({ nickname: true, username: true })
			.get()
		: { data: [] }
	const userNames = new Map((userResult.data || []).map(user => [
		subjectAuth.compactId(user._id),
		String(user.nickname || user.username || '').trim()
	]))

	return completedRecords.map(record => {
		const sourceRows = historyRows.filter(row => row.recordId === record.recordId)
		const compatibility = countCompatibleAnswers({
			currentQuestions,
			sourceHistoryRows: sourceRows,
			age
		})
		return {
			recordId: record.recordId,
			completionTime: getCompletedTime(record),
			assessorName: String(record.assessorName || '').trim() ||
				userNames.get(subjectAuth.compactId(record.assessorId)) ||
				(subjectAuth.compactId(record.assessorId) === currentAssessorId ? '当前老师' : '历史评估老师'),
			matchedCount: compatibility.matchedCount,
			totalQuestions: compatibility.totalQuestions,
			unmatchedCount: Math.max(0, compatibility.totalQuestions - compatibility.matchedCount)
		}
	}).filter(source => source.matchedCount > 0)
}

async function getValidPrefillSource({ sourceRecordId, childId, assessmentId }) {
	if (!sourceRecordId) {
		throw new subjectAuth.AuthError(400, '请选择需要参考的历史评估记录')
	}
	const result = await collection.where({
		recordId: sourceRecordId,
		childId,
		assessmentId
	}).limit(1).get()
	const source = result.data?.[0]
	if (!source || source.isAbandoned === true ||
		!(source.isCompleted === true || source.reportStatus === 'completed')) {
		throw new subjectAuth.AuthError(400, '历史评估不存在、未完成或已不可使用')
	}
	return source
}

async function copyPrefillHistory({ sourceRecord, targetRecord, assessment, age, assessorId }) {
	const [currentQuestions, sourceRows] = await Promise.all([
		loadCurrentQuestions(assessment._id),
		loadHistoryRows([sourceRecord.recordId], targetRecord.childId)
	])
	const built = buildPrefillHistories({
		currentQuestions,
		sourceHistoryRows: sourceRows,
		age,
		sourceRecordId: sourceRecord.recordId,
		sourceCompletedAt: getCompletedTime(sourceRecord)
	})
	if (!built.matchedCount) {
		throw new subjectAuth.AuthError(400, '所选历史评估没有可安全匹配的答案')
	}
	const now = Date.now()
	for (const history of built.histories) {
		const prefilledQuestions = history.assessmentRecords.reduce(
			(total, group) => total + group.questions.filter(question => question.prefilled).length,
			0
		)
		if (!prefilledQuestions) continue
		await getHistoryCollection().add({
			recordId: targetRecord.recordId,
			assessmentId: assessment._id,
			assessorId,
			childId: targetRecord.childId,
			sectionId: history.sectionId,
			assessmentRecords: history.assessmentRecords,
			hasCompleted: false,
			prefilled: true,
			prefilledFromRecordId: sourceRecord.recordId,
			createTime: now,
			updateTime: now
		})
	}
	const sectionCounts = new Map(built.histories.map(history => [
		history.sectionId,
		history.assessmentRecords.reduce(
			(total, group) => total + group.questions.filter(question => question.prefilled).length,
			0
		)
	]))
	const modulesStatus = (targetRecord.modulesStatus || []).map(module => {
		const prefilledQuestions = sectionCounts.get(module.sectionId) || 0
		return {
			...module,
			prefilledQuestions,
			reviewedPrefilledQuestions: 0,
			pendingPrefilledQuestions: prefilledQuestions
		}
	})
	await collection.doc(targetRecord._id).update({
		modulesStatus,
		prefilledQuestionCount: built.matchedCount,
		prefillTotalQuestionCount: built.totalQuestions,
		prefillReviewedQuestionCount: 0,
		prefillPendingQuestionCount: built.matchedCount,
		updateTime: now
	})
	return { ...built, modulesStatus }
}
