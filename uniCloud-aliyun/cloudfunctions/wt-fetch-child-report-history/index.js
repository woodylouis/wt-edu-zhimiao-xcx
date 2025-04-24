'use strict';
const db = uniCloud.database();

exports.main = async (event, context) => {
    try {
        const { childId } = event;
        
        if (!childId) {
            return {
                code: 400,
                msg: '缺少必要参数: childId'
            };
        }

        // 查询该学生的所有评估报告
        const res = await db.collection('wtdb-business-assess-report')
            .where({
                childId: childId
            })
            .orderBy('completionTime', 'desc') // 按完成时间降序排列
            .get();

        return {
            code: 200,
            data: res.data,
            msg: '查询成功'
        };
    } catch (e) {
        console.error('查询失败:', e);
        return {
            code: 500,
            msg: `查询失败: ${e.message}`
        };
    }
};
