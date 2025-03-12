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

		// 写入数据库（会自动触发schema校验）
		const res = await classCollection.add(classData)

		return {
			code: 200,
			data: {
				classId: res.id,
				classCode: classData.code
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
