'use strict'

let subjectAuth
try {
	subjectAuth = require('business-subject-auth')
} catch (_) {
	subjectAuth = require('../common/business-subject-auth')
}

const db = uniCloud.database()
const dbCmd = db.command

exports.main = async (event = {}, context) => {
	const classId = subjectAuth.compactId(event.classId || event.class_id)
	if (!classId) return { code: 400, message: '缺少必要参数: classId' }

	try {
		const scope = await subjectAuth.getAuthScope(event, context)
		await subjectAuth.assertClassTeacherAccess(scope, classId)
		const childrenRes = await db.collection('wtdb-business-children')
			.where({ class_id: classId })
			.field({ _id: true, name: true, avatar: true, gender: true, birthdate: true, class_id: true, guardians: true })
			.limit(500)
			.get()

		if (!childrenRes.data?.length) {
			return { code: 0, data: { list: [], total: 0 }, message: '查询成功' }
		}

		const childIds = childrenRes.data.map(child => child._id)
		const [statsRes, activeRes, reportsRes] = await Promise.all([
			db.collection('wtdb-business-assess-record')
				.aggregate()
				.match(dbCmd.or([
					{ childId: dbCmd.in(childIds) },
					{ child_id: dbCmd.in(childIds) }
				]))
				.match(dbCmd.or([{ isCompleted: true }, { reportStatus: 'completed' }]))
				.project({
					childId: { $ifNull: ['$childId', '$child_id'] },
					assessorId: { $ifNull: ['$assessorId', '$assessor_id'] },
					assessorName: { $ifNull: ['$assessorName', '$teacherName'] },
					completedAt: { $ifNull: ['$lastCompletedTime', { $ifNull: ['$lastSaveTime', '$updateTime'] }] }
				})
				.sort({ completedAt: -1 })
				.group({
					_id: '$childId',
					assessmentCount: dbCmd.aggregate.sum(1),
					latestAssessmentTime: dbCmd.aggregate.first('$completedAt'),
					latestAssessorId: dbCmd.aggregate.first('$assessorId'),
					latestAssessorName: dbCmd.aggregate.first('$assessorName')
				})
				.end(),
			db.collection('wtdb-business-assess-record')
				.where(dbCmd.and([
					dbCmd.or([
						{ childId: dbCmd.in(childIds) },
						{ child_id: dbCmd.in(childIds) }
					]),
					{ assessorId: scope.uid }
				]))
				.field({
					recordId: true,
					childId: true,
					child_id: true,
					assessmentId: true,
					assessment_id: true,
					assessmentTitle: true,
					modulesStatus: true,
					isCompleted: true,
					reportStatus: true,
					isAbandoned: true,
					lastSaveTime: true,
					updateTime: true,
					createTime: true
				})
				.limit(500)
				.get(),
			db.collection('wtdb-business-assess-report')
				.aggregate()
				.match(dbCmd.or([
					{ childId: dbCmd.in(childIds) },
					{ child_id: dbCmd.in(childIds) }
				]))
				.project({
					childId: { $ifNull: ['$childId', '$child_id'] },
					documentId: '$_id',
					reportId: '$reportId',
					recordId: '$recordId',
					assessmentId: '$assessmentId',
					assessmentTitle: '$assessmentTitle',
					reportTime: { $ifNull: ['$completionTime', '$createTime'] },
					interventionPlanStatus: '$interventionPlanStatus',
					interventionPlanGeneration: '$interventionPlanGeneration',
					planWeeksCount: '$interventionPlan.weeksCount',
					planStartDate: '$interventionPlan.startDate',
					planEndDate: '$interventionPlan.endDate'
				})
				.sort({ reportTime: -1 })
				.group({
					_id: '$childId',
					documentId: dbCmd.aggregate.first('$documentId'),
					reportId: dbCmd.aggregate.first('$reportId'),
					recordId: dbCmd.aggregate.first('$recordId'),
					assessmentId: dbCmd.aggregate.first('$assessmentId'),
					assessmentTitle: dbCmd.aggregate.first('$assessmentTitle'),
					reportTime: dbCmd.aggregate.first('$reportTime'),
					interventionPlanStatus: dbCmd.aggregate.first('$interventionPlanStatus'),
					interventionPlanGeneration: dbCmd.aggregate.first('$interventionPlanGeneration'),
					planWeeksCount: dbCmd.aggregate.first('$planWeeksCount'),
					planStartDate: dbCmd.aggregate.first('$planStartDate'),
					planEndDate: dbCmd.aggregate.first('$planEndDate')
				})
				.end()
		])

		const assessorNameMap = await loadAssessorNames(statsRes.data || [], [scope.uid])
		let assessmentTitleMap = new Map()
		try {
			assessmentTitleMap = await loadAssessmentTitles(reportsRes.data || [])
		} catch (error) {
			console.warn('补全教师首页最新报告量表名称失败:', error)
		}
		const statsMap = new Map((statsRes.data || []).map(item => [
			subjectAuth.compactId(item._id),
			{
				count: Number(item.assessmentCount) || 0,
				time: toTimestamp(item.latestAssessmentTime),
				assessorName: assessorNameMap.get(subjectAuth.compactId(item.latestAssessorId)) ||
					String(item.latestAssessorName || '').trim()
			}
		]))
		const activeMap = new Map()
		for (const record of activeRes.data || []) {
			const isCompleted = record.isCompleted === true || record.reportStatus === 'completed'
			const hasUnfinishedModule = Array.isArray(record.modulesStatus) &&
				record.modulesStatus.some(module => Number(module.status) !== 1)
			if (isCompleted || record.isAbandoned === true || !hasUnfinishedModule) continue

			const childId = subjectAuth.compactId(record.childId || record.child_id)
			if (!childId) continue
			const createTime = toTimestamp(record.createTime)
			const lastSaveTime = toTimestamp(record.lastSaveTime || record.updateTime || record.createTime)
			const updatedAt = lastSaveTime
			const current = activeMap.get(childId)
			const isNewerRecord = !current ||
				updatedAt > current.updatedAt ||
				(updatedAt === current.updatedAt && createTime > current.createTime)
			if (isNewerRecord) {
				activeMap.set(childId, {
					recordId: String(record.recordId || ''),
					assessmentId: subjectAuth.compactId(record.assessmentId || record.assessment_id),
					assessmentTitle: String(record.assessmentTitle || '').trim(),
					assessorId: scope.uid,
					createTime,
					lastSaveTime,
					startDate: createTime ? formatDate(createTime) : '',
					lastSaveDate: lastSaveTime ? formatDate(lastSaveTime) : '',
					updatedAt
				})
			}
		}
		const latestReportMap = new Map()
		for (const report of reportsRes.data || []) {
			const childId = subjectAuth.compactId(report._id)
			if (!childId || latestReportMap.has(childId)) continue
			const assessmentId = subjectAuth.compactId(report.assessmentId)
			const completionTime = toTimestamp(report.reportTime)
			latestReportMap.set(childId, {
				documentId: subjectAuth.compactId(report.documentId),
				reportId: String(report.reportId || ''),
				recordId: String(report.recordId || ''),
				assessmentId,
				assessmentTitle: String(report.assessmentTitle || '').trim() ||
					assessmentTitleMap.get(assessmentId) ||
					'成长评估',
				completionTime,
				reportDate: formatDate(completionTime),
				interventionPlanStatus: String(report.interventionPlanStatus || ''),
				interventionPlanGeneration: report.interventionPlanGeneration || null,
				interventionPlan: report.planWeeksCount ? {
					weeksCount: Number(report.planWeeksCount) || 0,
					startDate: String(report.planStartDate || ''),
					endDate: String(report.planEndDate || '')
				} : null
			})
		}
		const list = childrenRes.data.map(child => {
			const childId = subjectAuth.compactId(child._id)
			const stats = statsMap.get(childId) || { count: 0, time: 0, assessorName: '' }
			const inProgressAssessment = activeMap.get(childId) || null
			const latestReport = latestReportMap.get(childId) || null
			const latestAssessorName = inProgressAssessment?.updatedAt >= stats.time
				? assessorNameMap.get(subjectAuth.compactId(inProgressAssessment.assessorId)) || stats.assessorName
				: stats.assessorName
			const age = calculateAge(child.birthdate)
			return {
				_id: child._id,
				name: child.name,
				avatar: child.avatar,
				gender: child.gender,
				birthdate: child.birthdate,
				age: age.text,
				ageInt: age.years,
				class_id: child.class_id,
				guardianCount: Array.isArray(child.guardians) ? child.guardians.length : 0,
				guardianConfigured: Array.isArray(child.guardians) && child.guardians.length > 0,
				hasAssessments: stats.count > 0,
				lastAssessmentTime: latestReport?.completionTime || 0,
				lastAssessmentDate: latestReport?.reportDate || '',
				latestReportDate: latestReport?.reportDate || '',
				latestReport,
				latestAssessorName,
				assessmentCount: stats.count,
				assessmentNumber: `共评估${stats.count}次`,
				hasInProgressAssessment: Boolean(inProgressAssessment),
				inProgressAssessment
			}
		}).sort((a, b) => {
			if (a.hasAssessments !== b.hasAssessments) return Number(b.hasAssessments) - Number(a.hasAssessments)
			return b.lastAssessmentTime - a.lastAssessmentTime
		})

		return { code: 0, data: { list, total: list.length }, message: '查询成功' }
	} catch (error) {
		console.error('查询班级评估历史失败:', error)
		return subjectAuth.toErrorResponse(error, '查询失败')
	}
}

async function loadAssessmentTitles(reports) {
	const assessmentIds = [...new Set((reports || [])
		.map(report => subjectAuth.compactId(report.assessmentId))
		.filter(Boolean))]
	const titleMap = new Map()
	if (!assessmentIds.length) return titleMap

	for (let index = 0; index < assessmentIds.length; index += 50) {
		const assessmentRes = await db.collection('wtdb-business-assessment-list')
			.where({ _id: dbCmd.in(assessmentIds.slice(index, index + 50)) })
			.field({ _id: true, title: true })
			.get()
		for (const assessment of assessmentRes.data || []) {
			const id = subjectAuth.compactId(assessment._id)
			const title = String(assessment.title || '').trim()
			if (id && title) titleMap.set(id, title)
		}
	}
	return titleMap
}

async function loadAssessorNames(statsRows, extraUserIds = []) {
	const assessorIds = [...new Set([
		...(statsRows || []).map(item => subjectAuth.compactId(item.latestAssessorId)),
		...extraUserIds.map(subjectAuth.compactId)
	].filter(Boolean))]
	const nameMap = new Map()
	if (!assessorIds.length) return nameMap

	const userRes = await db.collection('uni-id-users')
		.where({ _id: dbCmd.in(assessorIds) })
		.field({ _id: true, nickname: true, username: true, mobile: true })
		.get()
	const users = userRes.data || []
	const mobiles = [...new Set(users.map(user => String(user.mobile || '').trim()).filter(Boolean))]
	let linkedUsers = []
	if (mobiles.length) {
		const linkedRes = await db.collection('uni-id-users')
			.where({ mobile: dbCmd.in(mobiles) })
			.field({ nickname: true, mobile: true })
			.get()
		linkedUsers = linkedRes.data || []
	}
	const linkedNicknameByMobile = new Map()
	for (const user of linkedUsers) {
		const mobile = String(user.mobile || '').trim()
		const nickname = String(user.nickname || '').trim()
		if (mobile && nickname && !linkedNicknameByMobile.has(mobile)) {
			linkedNicknameByMobile.set(mobile, nickname)
		}
	}

	for (const user of users) {
		const userId = subjectAuth.compactId(user._id)
		const mobile = String(user.mobile || '').trim()
		const nickname = String(user.nickname || '').trim() ||
			linkedNicknameByMobile.get(mobile) ||
			String(user.username || '').trim()
		if (userId && nickname) nameMap.set(userId, nickname)
	}
	return nameMap
}

function calculateAge(value) {
	const birth = new Date(value)
	if (Number.isNaN(birth.getTime())) return { years: 0, text: '未知' }
	const today = new Date()
	let years = today.getFullYear() - birth.getFullYear()
	let months = today.getMonth() - birth.getMonth()
	if (today.getDate() < birth.getDate()) months--
	if (months < 0) { years--; months += 12 }
	return { years, text: `${years}岁${months}个月` }
}

function toTimestamp(value) {
	if (!value) return 0
	if (value instanceof Date) return value.getTime()
	if (typeof value === 'number') return value < 1e12 ? value * 1000 : value
	if (value.$date) return toTimestamp(value.$date)
	if (value.$numberLong) return toTimestamp(value.$numberLong)
	const parsed = Date.parse(value)
	return Number.isNaN(parsed) ? 0 : parsed
}

function formatDate(timestamp) {
	if (!timestamp) return '尚未评估'
	const date = new Date(timestamp + 8 * 60 * 60 * 1000)
	return `${date.getUTCFullYear()}.${String(date.getUTCMonth() + 1).padStart(2, '0')}.${String(date.getUTCDate()).padStart(2, '0')}`
}
