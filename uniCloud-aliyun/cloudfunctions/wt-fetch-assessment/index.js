'use strict';
const db = uniCloud.database();

exports.main = async (event) => {
	try {
		const { assessmentId } = event;

		// 查询关联题目
		const questionsRes = await db.collection('wtdb-business-assessment-q')
			.where({
				assessment_id: assessmentId
			})
			.orderBy('order', 'asc')
			.get();

		return {
			code: 200,
			data: questionsRes.data
		}
	} catch (e) {
		return {
			code: 500,
			message: '题目加载失败: ' + e.message
		}
	}
};