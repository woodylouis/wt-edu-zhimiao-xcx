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
	const params = {
		recordId: `ablls_${childId}_${Date.now()}`, suffix: `${childId}_${Date.now()}`
	}
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
		}).get();

		// 如果有未完成的记录，返回第一条
		if (res.data && res.data.length > 0) {
			console.log('查询到未完成的记录:', res.data);
			//  res.data里的modulesStatus，循环遍历status，如果全部都是completed，就返回params，否则返回数据库里的第一条记录
			const modulesStatus = res.data[0].modulesStatus;
			if (modulesStatus && modulesStatus.length > 0) {
				const allCompleted = modulesStatus.every(module => module.status === 1);
				// 全部都是completed，就创建一个新的
				if (allCompleted) {
					return {
						code: 200,
						data: params
					};
				} else {
					// 否则返回数据库里的第一条记录
					return {
						code: 200,
						data: { recordId: res.data[0].recordId }
					};
				}
			}
		}

		// 默认返回新的记录
		return {
			code: 200,
			data: params
		};

	} catch (e) {
		console.error('查询失败:', e);
		return {
			code: 500,
			message: '查询失败: ' + e.message
		};
	}
};