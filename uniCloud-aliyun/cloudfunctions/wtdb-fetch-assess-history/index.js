'use strict';
const uniID = require('uni-id-common')
const dbName = 'wtdb-business-assess-history';
const db = uniCloud.database();
const collection = db.collection(dbName);

exports.main = async (event, context) => {
	const uniIdInstance = uniID.createInstance({ context });
	const { uid } = await uniIdInstance.checkToken(event.uniIdToken);

	try {
		const { recordId, sectionId, assessorId, childId } = event;

		// 参数校验
		if (!recordId || !sectionId || !assessorId || !childId) {
			return {
				code: 400,
				message: '缺少必要参数: recordId, sectionId, assessorId, childId'
			};
		}

		// 查询历史记录
		const res = await collection.where({
			recordId,
			sectionId,
			assessorId: uid,
			childId
		}).get();

		if (res.data && res.data.length > 0) {
			return {
				code: 200,
				data: res.data, // 返回第一条匹配的记录
				message: '报告生成中'
			};
		} else {
			return {
				code: 200,
				data: [], // 无记录返回0
				message: '无历史记录'
			};
		}
	} catch (e) {
		console.error('查询失败:', e);
		return {
			code: 500,
			message: '查询失败: ' + e.message
		};
	}
};