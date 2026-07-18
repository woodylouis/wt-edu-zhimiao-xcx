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
			.field({ _id: true, name: true, avatar: true, gender: true, birthdate: true, class_id: true })
			.limit(500)
			.get()

		if (!childrenRes.data?.length) {
			return { code: 0, data: { list: [], total: 0 }, message: '查询成功' }
		}

		const childIds = childrenRes.data.map(child => child._id)
		const statsRes = await db.collection('wtdb-business-assess-record')
			.aggregate()
			.match(dbCmd.or([
				{ childId: dbCmd.in(childIds) },
				{ child_id: dbCmd.in(childIds) }
			]))
			.match(dbCmd.or([{ isCompleted: true }, { reportStatus: 'completed' }]))
			.project({
				childId: { $ifNull: ['$childId', '$child_id'] },
				completedAt: { $ifNull: ['$lastCompletedTime', { $ifNull: ['$lastSaveTime', '$updateTime'] }] }
			})
			.group({
				_id: '$childId',
				assessmentCount: dbCmd.aggregate.sum(1),
				latestAssessmentTime: dbCmd.aggregate.max('$completedAt')
			})
			.end()

		const statsMap = new Map((statsRes.data || []).map(item => [
			subjectAuth.compactId(item._id),
			{ count: Number(item.assessmentCount) || 0, time: toTimestamp(item.latestAssessmentTime) }
		]))
		const list = childrenRes.data.map(child => {
			const stats = statsMap.get(subjectAuth.compactId(child._id)) || { count: 0, time: 0 }
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
				hasAssessments: stats.count > 0,
				lastAssessmentTime: stats.time,
				lastAssessmentDate: formatDate(stats.time),
				assessmentCount: stats.count,
				assessmentNumber: `共评估${stats.count}次`
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
