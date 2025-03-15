'use strict';
exports.main = async (event, context) => {
	const {
		page = 1,
		pageSize = 10,
		type // 可选过滤条件
	} = event;

	const db = uniCloud.database();
	const collection = db.collection('wtdb-business-assessment-list');

	// 构建查询条件
	const query = { is_active: true };
	if (type) query.type = type;

	try {
		const { data } = await collection
			.where(query)
			.orderBy('created_time', 'desc')
			.skip((page - 1) * pageSize)
			.limit(pageSize)
			.get();

		// 获取总数用于分页
		const { total } = await collection.where(query).count();

		return {
			code: 0,
			data: {
				list: data.map(item => ({
					id: item._id,
					title: item.title,
					description: item.description,
					type: item.type,
					frequency: item.frequency,
					createdAt: item.created_time
				})),
				total,
				page,
				pageSize
			}
		};
	} catch (e) {
		console.error('获取评估列表失败:', e);
		return {
			code: 500,
			message: 'SERVER_ERROR',
			error: e.message
		};
	}
};