const db = uniCloud.database()
const memberCollection = db.collection('wtdb-business-class-member')

module.exports = async function joinClass(params) {
	// 必需参数校验
	const requiredParams = ['classId', 'userId', 'role']
	for (const key of requiredParams) {
		if (!params[key]) {
			throw new Error(`缺少必要参数：${key}`)
		}
	}

	// 检查是否已存在成员记录
	const existRes = await memberCollection.where({
		class_id: params.classId,
		user_id: params.userId
	}).count()

	if (existRes.total > 0) {
		throw new Error('用户已加入该班级')
	}

	// 角色相关校验
	const memberData = {
		class_id: params.classId,
		user_id: params.userId,
		role: params.role
	}
	if (params.nickname) memberData.nickname = String(params.nickname).trim().slice(0, 30)

	// 家长角色需要关联孩子
	// 修改家长角色校验逻辑
	if (params.role === 'parent') {
		if (!params.childId) {
			throw new Error('家长角色必须关联儿童ID')
		}
		if (!params.relationship) {
			throw new Error('必须指定与儿童的关系（father/mother/...）')
		}
		memberData.child_id = params.childId
		memberData.relationship = params.relationship // 新增关系字段
	}

	// 写入成员记录
	const addRes = await memberCollection.add(memberData)

	return {
		code: 200,
		data: addRes,
		message: '加入班级成功'
	}
}
