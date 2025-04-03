'use strict';
const db = uniCloud.database();
exports.main = async (event, context) => {
	try {
		// 插入儿童数据到集合
		const collection = db.collection('wtdb-business-children');
		const result = await collection.add(event.submitChildrenData);

		// 返回包含新儿童_id的响应
		return {
			code: 200,
			message: '儿童数据创建成功',
			data: {
				child_id: result.id // 返回新创建的儿童记录ID
			}
		};
	} catch (e) {
		// 错误处理
		console.error('云函数执行失败:', e);
		return {
			code: 500,
			message: '服务器内部错误',
			data: null
		};
	}
};