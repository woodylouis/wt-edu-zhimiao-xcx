

'use strict';
const db = uniCloud.database();

module.exports = {
	main: async (event) => {
		const {
			uuid,
			assessmentData // 包含完整评估数据的对象
		} = event;

		try {
			// 检查是否已存在记录
			const collection = db.collection('wtdb-business-assess-report');
			const existing = await collection.where({ uuid }).count();

			// 存在则更新，不存在则新增
			if (existing.total > 0) {
				return await collection.where({ uuid }).update(assessmentData);
			} else {
				return await collection.add(assessmentData);
			}
		} catch (e) {
			return {
				code: 500,
				message: '报告保存失败: ' + e.message
			};
		}
	}
};