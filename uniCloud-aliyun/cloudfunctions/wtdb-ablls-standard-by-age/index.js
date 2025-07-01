'use strict';
const db = uniCloud.database();
const collection = db.collection('wtdb-business-assess-abllszimu');

exports.main = async (event, context) => {
	try {
		const res = await collection.get();

		return {
			code: 200,
			message: '获取成功',
			data: res.data
		};
	} catch (err) {
		console.error('查询失败:', err);
		return {
			code: 500,
			message: '服务器内部错误',
			error: err.message
		};
	}
};
