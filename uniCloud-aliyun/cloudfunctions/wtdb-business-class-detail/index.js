'use strict';
const db = uniCloud.database();
exports.main = async (event, context) => {
    try {
        // 1. 获取班级码参数
        const classCode = event.code;
        console.log('查询班级码:', classCode);
        
        // 2. 查询数据库（集合名需与schema匹配）
        const collection = db.collection('wtdb-business-class-list');
        const { data } = await collection.where({
            code: classCode
        }).get();

        // 3. 处理查询结果
        if (data.length > 0) {
            console.log('找到班级:', data[0]);
            return {
                code: 200,
                msg: '查询成功',
                data: data[0]
            };
        } else {
            console.warn('未找到班级');
            return {
                code: 201,
                msg: '未找到该班级，请检查班级码',
                data: null
            };
        }
    } catch (error) {
        console.error('查询失败:', error);
        return {
            code: 500,
            msg: '服务端错误',
            data: error.message
        };
    }
};
