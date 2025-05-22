'use strict';
const uniID = require('uni-id-common')
exports.main = async (event, context) => {
	const dbName = 'wtdb-business-assess-record';
	const uniIdInstance = uniID.createInstance({ context });

	// 获取用户UID
	const { uid } = await uniIdInstance.checkToken(event.uniIdToken);
	console.log('uid:', uid);
	const assessorId = uid;

	// 获取前端传递的childId
	const { childId } = event;
	if (!childId) {
		return {
			code: 400,
			message: '缺少必要参数: childId'
		};
	}

	const db = uniCloud.database();
	const collection = db.collection(dbName);

	try {
		// 查询该儿童未完成的评测记录
		const res = await collection.where({
			childId,
			assessorId,
			hasCompleted: false
		}).get();

		// 如果有未完成的记录，返回第一条
		if (res.data && res.data.length > 0) {
			return {
				code: 200,
				data: res.data[0]
			};
		}

		// 如果没有未完成的记录，返回0
		return {
			code: 200,
			data: 0
		};

	} catch (e) {
		console.error('查询失败:', e);
		return {
			code: 500,
			message: '查询失败: ' + e.message
		};
	}
};