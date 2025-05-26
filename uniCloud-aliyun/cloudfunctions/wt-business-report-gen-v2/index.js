'use strict';
const uniID = require('uni-id-common')
const dbName = 'wtdb-business-assess-history';
const dbName2 = 'wtdb-business-assess-record';
const db = uniCloud.database();
const collection = db.collection(dbName);
exports.main = async (event, context) => {
	try {
		const uniIdInstance = uniID.createInstance({ context });
		const { uid } = await uniIdInstance.checkToken(event.uniIdToken);
		const { recordId, assessmentId, assessorId, childId } = event;

		// 参数校验
		if (!recordId || !assessmentId || !assessorId || !childId) {
			return {
				code: 400,
				message: '缺少必要参数: recordId, assessmentId, assessorId, childId'
			};
		}

		// 查询条件
		const query = {
			recordId,
			assessmentId,
			assessorId: uid,
			childId,
		};

		// 执行查询
		const resHistory = await collection.where(query).get();
		const resRecord = await db.collection(dbName2).where(query).get();

		if (resRecord.data && resRecord.data.length > 0) {
			const modulesStatus = resRecord.data[0].modulesStatus || [];
			const historyRecords = resHistory.data || [];

			const result = {
				completed: [],  // 已完成 1
				inProgress: [], // 进行中 2
				notStarted: []  // 未开始 0
			};

			modulesStatus.forEach(module => {
				const historyRecord = historyRecords.find(
					h => h.sectionId === module.sectionId
				);

				if (historyRecord) {
					if (historyRecord.hasCompleted) {
						result.completed.push(module);
					} else {
						result.inProgress.push(module);
					}
				} else {
					result.notStarted.push(module);
				}
			});

			return {
				code: 200,
				data: result,
				message: '查询成功'
			};
		} else {
			return {
				code: 404,
				data: null,
				message: '未找到评估记录'
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
