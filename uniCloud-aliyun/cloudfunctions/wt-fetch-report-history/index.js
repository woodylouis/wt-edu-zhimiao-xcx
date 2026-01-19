'use strict';
const db = uniCloud.database();
const dbCmd = db.command;

exports.main = async (event, context) => {
	const { classId, page = 1, pageSize = 10 } = event;

	if (!classId) {
		return {
			code: 400,
			message: '缺少必要参数: classId'
		};
	}

	try {
		// 使用 Promise.all 并行查询，减少等待时间
		const [childrenRes, statsRes] = await Promise.all([
			// 1. 查询班级下所有儿童
			db.collection('wtdb-business-children')
				.where({ class_id: classId })
				.get(),

			// 2. 从统计缓存表查询（快速）
			db.collection('wtdb-business-children-stats')
				.where({ classId: classId })
				.get()
		]);

		if (!childrenRes.data || childrenRes.data.length === 0) {
			return {
				code: 404,
				message: '该班级下没有儿童'
			};
		}

		// 3. 构建统计数据 Map（O(1) 查找）
		const statsMap = new Map();
		statsRes.data.forEach(item => {
			statsMap.set(item.childId, {
				reportCount: item.reportCount || 0,
				latestTime: item.latestReportTime || 0
			});
		});

		// 4. 合并数据并排序
		const childrenWithStats = childrenRes.data.map(child => {
			const stats = statsMap.get(child._id);
			return {
				...child,
				hasReports: !!stats && stats.reportCount > 0,
				reportCount: stats?.reportCount || 0,
				latestTime: stats?.latestTime || 0
			};
		});

		// 排序：有报告的在前（按最新评估时间降序），无报告的在后
		childrenWithStats.sort((a, b) => {
			if (a.hasReports !== b.hasReports) return b.hasReports - a.hasReports;
			return b.latestTime - a.latestTime;
		});

		// 5. 分页处理
		const total = childrenWithStats.length;
		const startIndex = (page - 1) * pageSize;
		const paginatedData = childrenWithStats.slice(startIndex, startIndex + pageSize);

		// 6. 构建最终结果（无需再次查询数据库）
		const result = paginatedData.map(child => ({
			_id: child._id,
			name: child.name,
			avatar: child.avatar,
			gender: child.gender,
			birthday: child.birthday,
			class_id: child.class_id,
			lastAssessmentDate: child.latestTime ? formatDate(child.latestTime) : '暂无评估记录',
			assessmentNumber: `共评估${child.reportCount}次`
		}));

		return {
			code: 0,
			data: {
				list: result,
				total,
				page,
				pageSize
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

// 辅助函数：格式化时间戳为日期字符串
function formatDate(timestamp) {
	if (!timestamp) return '暂无评估记录';
	const date = new Date(timestamp);
	return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}