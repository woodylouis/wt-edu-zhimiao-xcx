'use strict';
// 初始化班级数据的云函数（initClassData）
exports.main = async (event, context) => {
  const db = uniCloud.database()
  // 生成唯一班级码
  const generateCode = async () => {
    let code;
    do {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    } while ((await db.collection('wtdb-business-class-list').where({ code }).count()).total > 0);
    return code;
  };

  const initData = [
    {
      code: await generateCode(),
      name: "小小班3班",
      description: "2025届小小班3班",
      created_by: "67cbb8e08b0da45f01e34d3c" // 动态绑定真实用户ID
    },
    {
      code: await generateCode(),
      name: "小小班3班",
      description: "2024届小小班3班",
      created_by: "67cbb8e08b0da45f01e34d3c"
    }
  ];

  const result = await db.collection('wtdb-business-class-list').add(initData);
  return result;
};