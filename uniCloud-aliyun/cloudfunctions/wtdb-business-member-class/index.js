'use strict';
const uniID = require('uni-id-common')
const db = uniCloud.database()

exports.main = async (event, context) => {
	const uniIdInstance = uniID.createInstance({ context })
	const payload = await uniIdInstance.checkToken(event.uniIdToken)

	if (payload.code) {
		return payload // 返回token校验结果
	}

	try {
		const res = await db.collection('wtdb-business-class-member')
			.aggregate()
			.match({
				user_id: payload.uid // 根据当前用户ID筛选
			})
			.lookup({
				from: 'wtdb-business-class-list',
				localField: 'class_id',
				foreignField: '_id',
				as: 'classInfo'
			})
			.unwind('$classInfo')
			.project({
				_id: 1,
				role: 1,
				relationship: 1,
				join_time: 1,
				classInfo: {
					_id: 1,
					nickname: 1,
					code: 1,
					section: 1,
					grade: 1,
					class: 1
				}
			})
			.end()

		return {
			code: 200,
			message: '查询成功',
			data: res.data
		}
	} catch (e) {
		console.error('云函数执行失败:', e)
		return {
			code: 500,
			message: '服务器内部错误',
			data: null
		}
	}
};
