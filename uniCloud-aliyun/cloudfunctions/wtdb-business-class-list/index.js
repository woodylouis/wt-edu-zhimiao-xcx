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
		const classRes = await db.collection('wtdb-business-class-list')
			.where({ created_by: uid }) // 使用token解析的uid
			.get();

		return {
			code: 200,
			data: classRes.data,
			msg: '查询成功'
		};
	} catch (e) {
		return { code: 500, msg: `查询失败: ${e.message}` };
	}
};

