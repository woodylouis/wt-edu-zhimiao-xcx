'use strict';
'use strict';
const db = uniCloud.database();
// 使用正确的模块路径
const uniID = require('uni-id-common')

exports.main = async (event, context) => { // 移除context参数
	const uniIdInstance = uniID.createInstance({
		context
	})

	// 从event参数获取token
	const { uid } = await uniIdInstance.checkToken(event.uniIdToken)
	if (!uid) {
		return { code: 401, msg: '无效的登录状态' }
	}
	try {
		const res = await db.collection('wtdb-business-class-member')
			.where({
				user_id: uid // 改为查询成员关系表
			})
			.get();

		// 联表查询班级详情
		const classIds = res.data.map(item => item.class_id);
		const classRes = await db.collection('wtdb-business-class-list')
			.where({
				_id: db.command.in(classIds)
			})
			.get();

		// 合并数据
		const result = classRes.data.map(classInfo => {
			const memberInfo = res.data.find(item => item.class_id === classInfo._id);
			return {
				...classInfo,
				memberStatus: memberInfo.role
			};
		});

		return {
			code: 200,
			data: result,
			msg: '查询成功'
		};
	} catch (e) {
		return { code: 500, msg: `查询失败: ${e.message}` };
	}
};

