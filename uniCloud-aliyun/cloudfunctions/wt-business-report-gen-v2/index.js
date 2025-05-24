'use strict';
const uniID = require('uni-id-common')
const dbName = 'wtdb-business-assess-history';
const db = uniCloud.database();
const collection = db.collection(dbName);
exports.main = async (event, context) => {
	try {
		const uniIdInstance = uniID.createInstance({ context });
		const { uid } = await uniIdInstance.checkToken(event.uniIdToken);
		const { recordId, assessmentId, assessorId, childId, sectionId } = event;

		// 参数校验
		if (!recordId || !assessmentId || !assessorId || !childId || !sectionId) {
			return {
				code: 400,
				message: '缺少必要参数: recordId, assessmentId, assessorId, childId, sectionId'
			};
		}

		// 查询条件
		const query = {
			recordId,
			assessmentId,
			assessorId: uid,
			childId,
			sectionId
		};

		// 执行查询
		const res = await collection.where(query).get();

		if (res.data && res.data.length > 0) {
			console.log('查询到的历史记录:', res);
			return {
				code: 200,
				data: res.data[0], // 返回第一条匹配记录
				message: '查询成功'
			};
		} else {
			return {
				code: 404,
				data: null,
				message: '未找到匹配记录'
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
