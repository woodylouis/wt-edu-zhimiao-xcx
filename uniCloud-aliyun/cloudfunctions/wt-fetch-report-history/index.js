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
		// 1. 查询该班级下所有儿童(带分页)
		const childrenRes = await db.collection('wtdb-business-children')
			.where({
				class_id: classId
			})
			.skip((page - 1) * pageSize)
			.limit(pageSize)
			.get();

		if (!childrenRes.data || childrenRes.data.length === 0) {
			return {
				code: 404,
				message: '该班级下没有儿童'
			};
		}

		const childIds = childrenRes.data.map(child => child._id);

		// 2. 查询这些儿童的评估报告
		const reportRes = await db.collection('wtdb-business-assess-report')
			.where({
				childId: dbCmd.in(childIds)
			})
			.orderBy('completionTime', 'desc')
			.get();

		// 3. 获取总数用于分页
		const totalRes = await db.collection('wtdb-business-children')
			.where({
				class_id: classId
			})
			.count();

		// 4. 合并数据并添加新字段
		const result = childrenRes.data.map(child => {
			const reports = reportRes.data.filter(report => report.childId === child._id);

			// 更严谨地获取最近评估日期
			const lastAssessmentDate = reports.reduce((latest, report) => {
				return (!latest || report.completionTime > latest)
					? report.completionTime
					: latest;
			}, null);

			// 计算评估次数
			const assessmentNumber = reports.length;

			return {
				...child,
				reports: reports || [],
				lastAssessmentDate: lastAssessmentDate
					? formatDate(lastAssessmentDate)
					: '暂无评估记录',
				assessmentNumber: `共评估${assessmentNumber}次`
			};
		});

		return {
			code: 0,
			data: {
				list: result,
				total: totalRes.total,
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