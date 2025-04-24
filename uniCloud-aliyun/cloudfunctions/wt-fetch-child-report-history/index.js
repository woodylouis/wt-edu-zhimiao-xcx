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
		// 1. 先查询有评估报告的儿童ID（按最新评估时间排序）
		const reportRes = await db.collection('wtdb-business-assess-report')
			.where({
				classId: classId
			})
			.orderBy('completionTime', 'desc')
			.field({
				childId: true,
				completionTime: true
			})
			.get();

		// 2. 获取去重后的儿童ID列表（已按最新评估时间排序）
		const childIdMap = new Map();
		reportRes.data.forEach(report => {
			if (!childIdMap.has(report.childId)) {
				childIdMap.set(report.childId, report.completionTime);
			}
		});
		const sortedChildIds = Array.from(childIdMap.keys());

		// 3. 查询所有儿童信息（包括无报告的）
		const allChildrenRes = await db.collection('wtdb-business-children')
			.where({
				class_id: classId
			})
			.get();

		if (!allChildrenRes.data || allChildrenRes.data.length === 0) {
			return {
				code: 404,
				message: '该班级下没有儿童'
			};
		}

		// 4. 合并数据并排序
		const childrenWithReports = allChildrenRes.data.map(child => {
			const hasReports = sortedChildIds.includes(child._id);
			const latestReportTime = hasReports ? childIdMap.get(child._id) : 0;

			return {
				...child,
				hasReports,
				latestReportTime
			};
		});

		// 排序：有报告的在前，按最新评估时间降序；无报告的在后
		childrenWithReports.sort((a, b) => {
			if (a.hasReports && !b.hasReports) return -1;
			if (!a.hasReports && b.hasReports) return 1;
			if (!a.hasReports && !b.hasReports) return 0;
			return b.latestReportTime - a.latestReportTime;
		});

		// 5. 分页处理
		const startIndex = (page - 1) * pageSize;
		const paginatedData = childrenWithReports.slice(startIndex, startIndex + pageSize);

		// 6. 获取分页儿童的详细报告数据
		const pageChildIds = paginatedData.map(child => child._id);
		const pageReportsRes = await db.collection('wtdb-business-assess-report')
			.where({
				childId: dbCmd.in(pageChildIds)
			})
			.orderBy('completionTime', 'desc')
			.get();

		// 7. 构建最终结果
		const result = paginatedData.map(child => {
			const reports = pageReportsRes.data.filter(report => report.childId === child._id);

			return {
				...child,

				lastAssessmentDate: reports.length > 0
					? formatDate(reports[0].completionTime)
					: '暂无评估记录',
				assessmentNumber: `共评估${reports.length}次`,
				hasReports: undefined,
				latestReportTime: undefined
			};
		});

		return {
			code: 0,
			data: {
				list: result,
				total: allChildrenRes.data.length,
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

// ... formatDate函数保持不变 ...

// 辅助函数：格式化时间戳为日期字符串
function formatDate(timestamp) {
	if (!timestamp) return '暂无评估记录';
	const date = new Date(timestamp);
	return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}