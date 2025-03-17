'use strict';
const db = uniCloud.database();
const classCollection = db.collection('wtdb-business-class-list');
const uniID = require('uni-id-common')
exports.main = async (event, context) => {
	const uniIdInstance = uniID.createInstance({
		context
	})
	// 获取请求参数
	const { classId, role = 'teacher' } = event;
	const { uid } = await uniIdInstance.checkToken(event.uniIdToken)

	// 参数校验
	if (!classId) {
		return { code: 400, msg: '班级ID不能为空' };
	}

	try {
		// 查询班级信息
		const classRes = await classCollection.doc(classId).get();
		if (!classRes.data[0]) {
			return { code: 404, msg: '班级不存在' };
		}

		// 检查是否已加入
		const existingMember = classRes.data[0].members?.find(m => m.user_id === uid);
		if (existingMember) {
			return { code: 409, msg: '您已加入该班级' };
		}

		// 更新班级成员
		const updateRes = await classCollection.doc(classId).update({
			members: db.command.push({
				user_id: uid,
				member_status: role,
				join_time: Date.now()
			})
		});

		return updateRes.updated ?
			{ code: 200, msg: '加入成功' } :
			{ code: 500, msg: '加入失败' };

	} catch (e) {
		console.error('加入班级失败:', e);
		return { code: 500, msg: '服务器错误' };
	}
};
