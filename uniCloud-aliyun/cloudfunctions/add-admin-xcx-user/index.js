'use strict';
'use strict';
const db = uniCloud.database();

exports.main = async () => {
    try {
        const res = await db.collection('wtdb-admin-users').add({
            user_id: '67cbb8e08b0da45f01e34d3c',
            role: 'classAdmin',// 或 'superAdmin' 根据实际需求
            create_time: new Date(Number(new Date())).toLocaleString()
        });

        return {
            code: 200,
            data: res,
            msg: '管理员添加成功'
        }
    } catch (e) {
        console.error('添加失败:', e);
        return {
            code: 500,
            msg: `添加失败: ${e.message}`
        }
    }
};
