'use strict';
const joinClass = require('../common/wtdb-business-join-class')

exports.main = async (event, context) => {
    try {
        // 测试用例1：正常加入班级
        const testRes = await joinClass({
            classId: '610264',      // 替换实际班级ID
            userId: '67cbb8e08b0da45f01e34d3c', // 用户ID
            role: 'teacher'         // 需与班级创建者匹配
        });
        
        // 测试用例2：重复加入（应触发错误）
        // await joinClass(...同样参数);
        
        return {
            code: 200,
            data: testRes,
            msg: '测试成功'
        }
    } catch(e) {
        return {
            code: 500,
            msg: `测试失败: ${e.message}`,
            stack: e.stack // 仅调试时显示
        }
    }
};