'use strict';
const db = uniCloud.database();
// 修改为两个集合引用
const classCollection = db.collection('wtdb-business-class-list');
const memberCollection = db.collection('wtdb-business-class-member'); // 新增成员表
const uniID = require('uni-id-common')

exports.main = async (event, context) => {
	const uniIdInstance = uniID.createInstance({ context });
	// 参数改为接收code
	const { code } = event;
	const { uid } = await uniIdInstance.checkToken(event.uniIdToken);
	console.log('uid:', uid); // 打印uid以确认是否正确获取到uid
	// 参数校验code
	if (!code) {
		return { code: 400, msg: '班级邀请码不能为空' };
	}

	try {
		// 通过code查询班级
		const classRes = await classCollection.where({ code }).get();
		if (!classRes.data[0]) {
			return { code: 404, msg: '班级不存在或邀请码错误' };
		}
		const classId = classRes.data[0]._id;

		// 检查成员表是否已存在
		const memberRes = await memberCollection.where({
			class_id: classId,
			user_id: uid
		}).get();

		if (memberRes.data.length > 0) {
			return { code: 409, msg: '您已加入该班级', data: classRes.data[0] };
		}

		// 插入成员表
		const insertRes = await memberCollection.add(
			{ ...event, user_id: uid, join_time: Date.now() }
		);

		return insertRes.id ?
			{ code: 200, msg: '加入成功', data: classRes.data[0] } :
			{ code: 500, msg: '加入失败' };

	} catch (e) {
		console.error('加入班级失败:', e);
		return { code: 500, msg: '服务器错误' };
	}
};
