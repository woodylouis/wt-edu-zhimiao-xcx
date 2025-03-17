'use strict';
const uniID = require('uni-id-common');
const db = uniCloud.database();
exports.main = async (event, context) => {
	const uniIdInstance = uniID.createInstance({ context });
	const { uid } = await uniIdInstance.checkToken(event.uniIdToken);

	const adminUsers = db.collection('wtdb-admin-users');

	// 查询当前用户权限
	const res = await adminUsers.where({
		user_id: uid,
		role: 'classAdmin'
	}).count();
	console.log(res)
	return {
		code: res.total > 0 ? 200 : 403,
		msg: res.total > 0 ? '权限验证通过' : '无管理员权限'
	};
};
