'use strict';
const uniID = require('uni-id-common')
const dbName = 'wtdb-business-assess-history';
const dbRecordName = 'wtdb-business-assess-record';
const db = uniCloud.database();
const collection = db.collection(dbName);
const recordCollection = db.collection(dbRecordName);

exports.main = async (event, context) => {
	const uniIdInstance = uniID.createInstance({ context });
	const { uid } = await uniIdInstance.checkToken(event.uniIdToken);

	try {
		const {
			recordId,
			assessmentId,
			assessorId,
			childId,
			sectionId,
			data,
			// 新增子模块信息
			currentSubSectionId,
			currentSubSectionName,
			currentSubSectionIndex
		} = event;

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
		const now = Date.now();

		if (existingRecord.total > 0) {
			// 更新记录
			const updateRes = await collection.where(query).update({
				...data,
				updateTime: now
			});

			// 同时更新 record 表的 lastSaveTime 和 lastSectionId
			await updateRecordSaveTime(recordId, uid, sectionId, data, now, currentSubSectionId, currentSubSectionName, currentSubSectionIndex);

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
				createTime: now,
				updateTime: now
			});

			// 同时更新 record 表的 lastSaveTime 和 lastSectionId
			await updateRecordSaveTime(recordId, uid, sectionId, data, now, currentSubSectionId, currentSubSectionName, currentSubSectionIndex);

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

// 更新 record 表的保存时间和进度信息
const updateRecordSaveTime = async (recordId, assessorId, sectionId, data, now, currentSubSectionId, currentSubSectionName, currentSubSectionIndex) => {
	try {
		// 查询当前 record
		const recordRes = await recordCollection.where({ recordId, assessorId }).get();
		if (!recordRes.data || recordRes.data.length === 0) {
			console.log('Record not found:', recordId);
			return;
		}

		const record = recordRes.data[0];
		const modulesStatus = record.modulesStatus || [];

		// 计算当前 section 的完成情况
		const assessmentRecords = data.assessmentRecords || [];
		const completedSubSections = assessmentRecords.filter(r => r.allQuestionsCompleted).length;
		const totalSubSections = assessmentRecords.length || modulesStatus.find(m => m.sectionId === sectionId)?.totalSubSections || 0;
		const isModuleComplete = totalSubSections > 0 && completedSubSections >= totalSubSections;

		// 构建每个子模块的进度信息
		const subSectionsProgress = assessmentRecords.map(record => {
			const answers = record.answers || [];
			const completedQuestions = answers.filter(a => a && a.text).length;
			const totalQuestions = record.totalQuestions || answers.length;
			return {
				subSectionId: record.abllsSectionAlphabet,
				subSectionName: record.sectionName,
				completedQuestions: completedQuestions,
				totalQuestions: totalQuestions,
				isCompleted: record.allQuestionsCompleted || false
			};
		});

		// 更新 modulesStatus 中对应 section 的状态
		const updatedModulesStatus = modulesStatus.map(m => {
			if (m.sectionId === sectionId) {
				return {
					...m,
					status: isModuleComplete ? 1 : 0,
					completedSubSections: completedSubSections,
					totalSubSections: totalSubSections > 0 ? totalSubSections : m.totalSubSections,
					hasStarted: true,
					// 记录最后访问的子模块信息
					lastSubSectionId: currentSubSectionId || m.lastSubSectionId,
					lastSubSectionName: currentSubSectionName || m.lastSubSectionName,
					lastSubSectionIndex: currentSubSectionIndex !== undefined ? currentSubSectionIndex : m.lastSubSectionIndex,
					// 保存每个子模块的进度
					subSectionsProgress: subSectionsProgress
				};
			}
			return m;
		});

		// 检查是否所有模块都完成
		const allModulesCompleted = updatedModulesStatus.every(m => m.status === 1);

		// 更新数据
		const updateData = {
			lastSaveTime: now,
			lastSectionId: sectionId,
			modulesStatus: updatedModulesStatus,
			isCompleted: allModulesCompleted
		};

		// 如果所有模块都完成，记录完成时间
		if (allModulesCompleted && !record.lastCompletedTime) {
			updateData.lastCompletedTime = now;
		}

		await recordCollection.where({ recordId, assessorId }).update(updateData);
		console.log('Record updated with lastSaveTime:', now, 'sectionId:', sectionId, 'subSection:', currentSubSectionName);
	} catch (e) {
		console.error('updateRecordSaveTime failed:', e);
	}
};