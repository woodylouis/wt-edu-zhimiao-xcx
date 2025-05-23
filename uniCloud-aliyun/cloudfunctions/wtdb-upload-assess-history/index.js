'use strict';
const uniID = require('uni-id-common')
const dbName = 'wtdb-business-assess-history';
const db = uniCloud.database();
const collection = db.collection(dbName);

exports.main = async (event, context) => {
	const uniIdInstance = uniID.createInstance({ context });
	const { uid } = await uniIdInstance.checkToken(event.uniIdToken);

	try {
		const { recordId, assessmentId, assessorId, childId, sectionId, data } = event;

		// 检查必填字段
		if (!recordId || !assessmentId || !childId || !sectionId) {
			return { code: 400, message: '缺少必要参数' };
		}

		// 查询是否存在记录
		const query = {
			recordId,
			assessmentId,
			assessorId: uid,
			childId,
			sectionId
		};

		const existingRecord = await collection.where(query).count();

		if (existingRecord.total > 0) {
			// 更新记录
			const updateRes = await collection.where(query).update(data);
			return {
				code: 200,
				message: '记录更新成功',
				data: updateRes
			};
		} else {
			// 新增记录
			const addRes = await collection.add({
				...data,
				...query,
				createTime: Date.now()
			});
			return {
				code: 200,
				message: '记录创建成功',
				data: addRes
			};
		}
	} catch (e) {
		console.error('操作失败:', e);
		return {
			code: 500,
			message: '操作失败: ' + e.message
		};
	}
};