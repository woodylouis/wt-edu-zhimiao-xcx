'use strict';
const db = uniCloud.database();

// 中文姓名生成器
function generateChineseName() {
  const surnames = ['王', '李', '张', '陈', '刘', '杨', '赵', '黄', '周', '吴'];
  const givenNames = ['子轩', '梓涵', '浩宇', '欣怡', '诗雨', '俊杰', '雨泽', '思源', '梦琪', '晨曦'];
  return surnames[Math.floor(Math.random() * surnames.length)] + 
         givenNames[Math.floor(Math.random() * givenNames.length)];
}

// 生成随机出生日期（过去1-6年）
function randomBirthdate() {
  const currentYear = new Date().getFullYear();
  const year = currentYear - Math.floor(Math.random() * 6) - 1;
  const month = Math.floor(Math.random() * 12);
  const day = Math.floor(Math.random() * 28) + 1; // 避免日期越界
  return new Date(year, month, day).getTime();
}

exports.main = async (event, context) => {
  try {
    const count = event.count || 5; // 默认生成5条测试数据
    const classId = '67d2841d8a5c78c37ff0b54b'; // 固定班级ID
    
    const testData = Array.from({length: count}).map(() => {
      const baseData = {
        name: generateChineseName(),
        class_id: classId,
        gender: ['male', 'female', 'unknown'][Math.floor(Math.random() * 3)]
      };
      
      // 50%概率添加出生日期
      if (Math.random() > 0.5) {
        baseData.birthdate = randomBirthdate();
      }
      
      // 30%概率添加头像
      if (Math.random() > 0.7) {
        baseData.avatar = `https://dummyimage.com/100x100/${Math.floor(Math.random()*16777215).toString(16)}/fff`;
      }
      
      return baseData;
    });

    const res = await db.collection('wtdb-business-children').add(testData);
    return {
      code: 200,
      message: `成功生成${testData.length}条测试数据`,
      insertedIds: res.ids
    };
  } catch (e) {
    return {
      code: 500,
      message: `数据生成失败: ${e.message}`
    };
  }
};