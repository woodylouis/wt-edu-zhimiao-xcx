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
		console.log('existingRecord:', existingRecord)
		if (existingRecord.data && existingRecord.data.length > 0) {
			// 在 existingRecord.data 中找到第一条有未完成模块的记录
			const unfinishedRecord = existingRecord.data.find(record => {
				const modulesStatus = record.modulesStatus || [];
				return modulesStatus.some(module => module.status !== 1);
			});

			if (unfinishedRecord) {
				// 找到了未完成的评估记录，返回它
				return {
					code: 200,
					result: unfinishedRecord,
					message: `查到${data.childName}的评估记录。`,
				};
			} else {
				// 所有记录的 modulesStatus 都是完成的
				console.log('所有记录都已完成，准备创建新的评估记录');
				const newRecordRes = await createNewAssessmentRecord(childId, data, uid);

				if (newRecordRes && newRecordRes.code === 200) {
					return {
						code: 200,
						result: newRecordRes.result,
						message: `所有模块已完成，已为${data.childName}创建新的评估记录。`,
					};
				} else {
					return {
						code: 500,
						message: `为${data.childName}创建新的评估记录失败。`,
					};
				}
			}
		} else {
			// 没有任何记录
			const newRecordRes = await createNewAssessmentRecord(childId, data, uid);
			if (newRecordRes && newRecordRes.code === 200) {
				return {
					code: 200,
					result: newRecordRes.result,
					message: `未找到${data.childName}的任何评估记录。，已为${data.childName}创建新的评估记录。`,
				};
			} else {
				return {
					code: 500,
					message: `为${data.childName}创建新的评估记录失败。`,
				};
			}
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