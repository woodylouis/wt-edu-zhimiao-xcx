'use strict';
const db = uniCloud.database();
const classCollection = db.collection('wtdb-business-class-list');

exports.main = async (event, context) => {
	console.log('event : ', event)
	// 从请求参数获取用户ID
	const userId = event.userId;
	// 检查用户ID是否存在
	if (!userId) {
		return { code: 401, msg: '用户未登录' }
	}

	// 生成6位随机班级码
	const generateClassCode = () => Math.floor(100000 + Math.random() * 900000).toString()

	try {
		// 构造班级数据
		const classData = {
			...event,
			created_by: userId,  // 使用前端传递的用户ID
			create_time: Date.now(),
			code: generateClassCode()
		};

		// TO-DO 检查是否有权限创建班级 - 只是classAdmin和superAdmin才可以，其他角色不可以创建班级
		// 检查用户是否为classAdmin或superAdmin
		// db name - wtdb-admin-users

		// 写入数据库（会自动触发schema校验）
		const res = await classCollection.add(classData)

		// 新增：创建者自动加入班级
		const joinClass = require('wtdb-business-join-class')

		try {
			await joinClass({
				classId: res.id, // 使用刚创建的班级ID
				userId: userId,  // 当前创建者ID
				role: 'teacher'  // 默认赋予教师身份
			})
		} catch (joinError) {
			console.error('创建者加入失败:', joinError)
			// 回滚班级创建
			await classCollection.doc(res.id).remove()
			return {
				code: 500,
				msg: `班级创建失败：${joinError.message}`,
				data: null
			}
		}

		return {
			code: 200,
			data: {
				classId: res.id,
				classCode: classData.code,
				joinStatus: 'success' // 新增加入状态标识
			},
			msg: '班级创建成功'
		}
	} catch (e) {
		console.error('创建班级失败:', e)
		return {
			code: 500,
			msg: `创建失败: ${e.message}`,
			errCode: e.errCode || 'DATABASE_ERROR'
		}
	}
};
