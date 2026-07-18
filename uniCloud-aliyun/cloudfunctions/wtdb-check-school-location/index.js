'use strict'

const subjectAuth = require('business-subject-auth')
const MAX_RADIUS_METERS = 6500

exports.main = async (event = {}, context) => {
	try {
		const latitude = Number(event.latitude)
		const longitude = Number(event.longitude)
		const schoolId = subjectAuth.compactId(event.schoolId)
		if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
			!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
			return { code: 400, message: '位置参数无效', data: { inRange: false } }
		}
		if (!schoolId) return { code: 400, message: '缺少学校ID参数', data: { inRange: false } }

		const scope = await subjectAuth.getAuthScope(event, context)
		const school = await subjectAuth.assertSchoolStaffAccess(scope, schoolId)
		const schoolLatitude = Number(school.latitude)
		const schoolLongitude = Number(school.longitude)
		if (!Number.isFinite(schoolLatitude) || !Number.isFinite(schoolLongitude)) {
			return {
				code: 409,
				message: '学校尚未设置位置，请联系管理员',
				data: { inRange: false, schoolName: school.name || '', reason: 'no_location_set' }
			}
		}

		const requestedRadius = Number(event.radius)
		const radius = Number.isFinite(requestedRadius)
			? Math.min(MAX_RADIUS_METERS, Math.max(100, requestedRadius))
			: 1500
		const distance = calculateDistance(latitude, longitude, schoolLatitude, schoolLongitude)
		const inRange = distance <= radius
		return {
			code: 200,
			message: inRange ? '您在学校范围内，可以进行评估' : '您不在学校范围内，请到学校后再进行评估',
			data: {
				inRange,
				distance: Math.round(distance),
				radius,
				schoolName: school.name || ''
			}
		}
	} catch (error) {
		console.error('位置检查失败:', error)
		return {
			...subjectAuth.toErrorResponse(error, '位置检查失败'),
			data: { inRange: false }
		}
	}
}

function calculateDistance(lat1, lon1, lat2, lon2) {
	const earthRadius = 6371000
	const dLat = toRadians(lat2 - lat1)
	const dLon = toRadians(lon2 - lon1)
	const value = Math.sin(dLat / 2) ** 2 +
		Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2
	return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

function toRadians(degrees) {
	return degrees * Math.PI / 180
}
