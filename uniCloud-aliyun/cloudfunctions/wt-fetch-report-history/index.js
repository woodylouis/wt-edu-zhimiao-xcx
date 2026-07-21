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
		const [statsRes, activeRes] = await Promise.all([
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
					childId: true,
					child_id: true,
					assessmentId: true,
					assessment_id: true,
					assessmentTitle: true,
					modulesStatus: true,
					isCompleted: true,
					reportStatus: true,
					lastSaveTime: true,
					updateTime: true,
					createTime: true
				})
				.limit(500)
				.get()
		])

		const assessorNameMap = await loadAssessorNames(statsRes.data || [], [scope.uid])
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
			if (isCompleted || !hasUnfinishedModule) continue

			const childId = subjectAuth.compactId(record.childId || record.child_id)
			if (!childId) continue
			const updatedAt = toTimestamp(record.lastSaveTime || record.updateTime || record.createTime)
			const current = activeMap.get(childId)
			if (!current || updatedAt > current.updatedAt) {
				activeMap.set(childId, {
					assessmentId: subjectAuth.compactId(record.assessmentId || record.assessment_id),
					assessmentTitle: String(record.assessmentTitle || '').trim(),
					assessorId: scope.uid,
					updatedAt
				})
			}
		}
		const list = childrenRes.data.map(child => {
			const childId = subjectAuth.compactId(child._id)
			const stats = statsMap.get(childId) || { count: 0, time: 0, assessorName: '' }
			const inProgressAssessment = activeMap.get(childId) || null
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
				lastAssessmentTime: stats.time,
				lastAssessmentDate: formatDate(stats.time),
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
