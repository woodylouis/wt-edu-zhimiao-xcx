'use strict';
const db = uniCloud.database();
const dbCmd = db.command;

exports.main = async (event, context) => {
	const { classId } = event;

	if (!classId) {
		return {
			code: 400,
			message: '缺少必要参数: classId'
		};
	}

	try {
		// 1. 查询班级下所有儿童
		const childrenRes = await db.collection('wtdb-business-children')
			.where({ class_id: classId })
			.limit(500)
			.get();

		if (!childrenRes.data || childrenRes.data.length === 0) {
			return {
				code: 404,
				message: '该班级下没有儿童'
			};
		}

		// 2. 以完成的评估记录为统计口径。报告是异步生成的，生成失败或延迟
		// 不应该改变“完成过几次评估”的结果；同时兼容 childId/child_id 旧字段。
		const childIds = childrenRes.data.map(child => child._id);
		const assessmentStatsRes = await db.collection('wtdb-business-assess-record')
			.aggregate()
			.match(dbCmd.or([
				{ childId: dbCmd.in(childIds) },
				{ child_id: dbCmd.in(childIds) }
			]))
			.match(dbCmd.or([
				{ isCompleted: true },
				{ reportStatus: 'completed' }
			]))
			.project({
				childId: { $ifNull: ['$childId', '$child_id'] },
				completedAt: {
					$ifNull: [
						'$lastCompletedTime',
						{ $ifNull: ['$lastSaveTime', '$updateTime'] }
					]
				}
			})
			.group({
				_id: '$childId',
				assessmentCount: dbCmd.aggregate.sum(1),
				latestAssessmentTime: dbCmd.aggregate.max('$completedAt')
			})
			.end();

		const assessmentStatsMap = new Map();
		assessmentStatsRes.data.forEach(item => {
			const childId = normalizeId(item._id);
			if (!childId) return;
			assessmentStatsMap.set(childId, {
				assessmentCount: Number(item.assessmentCount) || 0,
				latestTime: toTimestamp(item.latestAssessmentTime)
			});
		});

		// 3. 合并数据并排序
		const childrenWithStats = childrenRes.data.map(child => {
			const stats = assessmentStatsMap.get(normalizeId(child._id));
			return {
				...child,
				hasAssessments: !!stats && stats.assessmentCount > 0,
				assessmentCount: stats?.assessmentCount || 0,
				latestTime: stats?.latestTime || 0
			};
		});

		// 排序：有评估的在前（按最新评估时间降序），无评估的在后
		childrenWithStats.sort((a, b) => {
			if (a.hasAssessments !== b.hasAssessments) return b.hasAssessments - a.hasAssessments;
			return b.latestTime - a.latestTime;
		});

		// 4. 返回全部数据
		const total = childrenWithStats.length;
		const result = childrenWithStats.map(child => {
			// 计算年龄
			const birthDate = new Date(child.birthdate);
			const today = new Date();
			let years = today.getFullYear() - birthDate.getFullYear();
			let months = today.getMonth() - birthDate.getMonth();
			if (today.getDate() < birthDate.getDate()) months--;
			if (months < 0) {
				years--;
				months += 12;
			}

			return {
				_id: child._id,
				name: child.name,
				avatar: child.avatar,
				gender: child.gender,
				birthdate: child.birthdate,
				age: `${years}岁${months}个月`,
				ageInt: years,
				class_id: child.class_id,
				hasAssessments: child.assessmentCount > 0,
				lastAssessmentTime: child.latestTime,
				lastAssessmentDate: formatDate(child.latestTime),
				assessmentCount: child.assessmentCount,
				// 保留原字段，兼容仍在使用旧数据结构的页面。
				assessmentNumber: `共评估${child.assessmentCount}次`
			};
		});

		return {
			code: 0,
			data: {
				list: result,
				total
			},
			message: '查询成功'
		};

	} catch (e) {
		console.error('查询失败:', e);
		return {
			code: 500,
			message: '服务器内部错误'
		};
	}
};

function normalizeId(value) {
	if (!value) return '';
	if (typeof value === 'string') return value;
	if (value.$oid) return String(value.$oid);
	if (value._id) return normalizeId(value._id);
	const valueString = String(value);
	const objectIdMatch = valueString.match(/ObjectId\(["'](.+)["']\)/);
	return objectIdMatch ? objectIdMatch[1] : valueString;
}

function toTimestamp(value) {
	if (!value) return 0;
	if (value instanceof Date) return value.getTime();
	if (typeof value === 'number') return value < 1e12 ? value * 1000 : value;
	if (typeof value === 'string') {
		const numericValue = Number(value);
		if (Number.isFinite(numericValue)) {
			return numericValue < 1e12 ? numericValue * 1000 : numericValue;
		}
		const parsedValue = Date.parse(value);
		return Number.isNaN(parsedValue) ? 0 : parsedValue;
	}
	if (value.$date) return toTimestamp(value.$date);
	if (value.$numberLong) return toTimestamp(value.$numberLong);
	return 0;
}

// 云函数运行时区并不固定，按北京时间格式化，避免凌晨评估日期偏移一天。
function formatDate(timestamp) {
	const time = toTimestamp(timestamp);
	if (!time) return '尚未评估';
	const beijingDate = new Date(time + 8 * 60 * 60 * 1000);
	const year = beijingDate.getUTCFullYear();
	const month = String(beijingDate.getUTCMonth() + 1).padStart(2, '0');
	const day = String(beijingDate.getUTCDate()).padStart(2, '0');
	return `${year}.${month}.${day}`;
}
