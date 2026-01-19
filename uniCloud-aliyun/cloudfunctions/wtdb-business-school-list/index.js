'use strict';
exports.main = async (event, context) => {
	//event为客户端上传的参数
	console.log('event : ', event)
	
	try {
		const db = uniCloud.database();
		const collection = db.collection('wtdb-business-school-list');
		
		// 构建查询条件
		let query = collection;
		
		// 如果传入了schoolIds，按school_id查询
		if (event.schoolIds && Array.isArray(event.schoolIds) && event.schoolIds.length > 0) {
			query = query.where({
				school_id: db.command.in(event.schoolIds)
			});
		}
		
		// 如果传入了schoolId，按单个school_id查询
		if (event.schoolId) {
			query = query.where({
				school_id: event.schoolId
			});
		}
		
		// 如果传入了name，按学校名称模糊查询
		if (event.name) {
			query = query.where({
				name: new RegExp(event.name, 'i')
			});
		}
		
		// 获取数据
		const result = await query.field({
			_id: true,
			school_id: true,
			name: true,
			address: true,
			cover: true,
			images: true,
			latitude: true,
			longitude: true,
			director_user_id: true,
			creator_user_id: true,
			create_time: true,
			update_time: true
		}).get();
		
		// 返回成功结果
		return {
			code: 200,
			message: '查询成功',
			data: result.data
		};
		
	} catch (error) {
		console.error('查询学校列表失败:', error);
		
		// 返回错误结果
		return {
			code: 500,
			message: '查询学校列表失败',
			error: error.message
		};
	}
};
