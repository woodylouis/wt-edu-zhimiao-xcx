'use strict';
const db = uniCloud.database();
const cmd = db.command

exports.main = async (event) => {
	try {
		const { classId, keyword } = event

		const whereOptions = {
			class_id: classId
		}

		if (keyword) {
			whereOptions.name = new db.RegExp({
				regexp: keyword,
				options: 'i'
			})
		}

		const res = await db.collection('wtdb-business-children')
			.where(whereOptions)
			.get()

		return {
			code: 200,
			data: res.data
		}
	} catch (e) {
		return {
			code: 500,
			message: '查询失败: ' + e.message
		}
	}
};