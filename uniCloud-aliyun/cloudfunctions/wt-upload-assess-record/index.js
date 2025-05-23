'use strict';
const uniID = require('uni-id-common')
const dbName = 'wtdb-business-assess-record';
const db = uniCloud.database();
const collection = db.collection(dbName);
exports.main = async (event, context) => {
	const uniIdInstance = uniID.createInstance({ context });

	// 获取用户UID
	const { uid } = await uniIdInstance.checkToken(event.uniIdToken);

	console.log('uid:', uid);
	const assessorId = uid;

	try {
		// 从前端获取评估记录数据
		const { childId, data } = event;
		console.log('childId:', childId);

		console.log('data:', data);

		if (!childId) {
			return {
				code: 400,
				message: '缺少必要参数: childId或recordData'
			};
		}
		// 有记录
		const existingRecord = await collection.where({ childId, assessorId: uid }).get();
		if (existingRecord.data.length > 0) {

			const modulesStatus = existingRecord.data[0].modulesStatus;
			if (modulesStatus && modulesStatus.length > 0) {
				const allCompleted = modulesStatus.every(module => module.status === 1);
				// existingRecord里面的modulesStatus列表的status不为1，说明有记录未完成，直接返回数据库数据
				if (!allCompleted) {
					return {
						code: 200,
						result: existingRecord.data[0],
						message: `查到${data.childName}的评估记录。`,

					};
				} else {
					// 全部都是completed，就创建一个新的
					const res = createNewAssessmentRecord(childId, data, uid)
					return res;
				}
			}
		} else {
			// 无记录，插入新记录，创建新的
			const res = createNewAssessmentRecord(childId, data, uid)
			return res;
		}
	} catch (e) {
		console.error('操作失败:', e);
		return {
			code: 500,
			message: '操作失败: ' + e.message
		};
	}
};

const createNewAssessmentRecord = async (childId, data, assessorId) => {
	const recordId = `ablls_${childId}_${Date.now()}`;
	const recordIdSuffix = `${childId}_${Date.now()}`;
	const createTime = Date.now();

	if (data && data.modulesStatus) {
		data.modulesStatus.forEach(item => {
			item.sectionRecordId = `${item.sectionId}_${recordIdSuffix}`;
		});
	}

	const params = {
		...data,
		recordId,
		recordIdSuffix,
		assessorId,
		createTime,
	};

	const addRes = await collection.add(params);

	return {
		code: 200,
		message: `查不到记录，创建${data.childName}的新的评估记录成功`,
		result: {
			...params,
			_id: addRes.id,
		}
	};
	return null;
};