'use strict'

const db = uniCloud.database()
const dbCmd = db.command
const logCollection = db.collection('wtdb-debug-logs')

exports.main = async (event, context) => {
	try {
		const res = await logCollection.where({}).remove()
		return {
			code: 0,
			message: `日志已清空，共删除 ${res.deleted} 条记录`
		}
	} catch (err) {
		return {
			code: 500,
			message: `日志清空失败: ${err.message}`
		}
	}
}
