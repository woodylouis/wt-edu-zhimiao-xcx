'use strict';

const db = uniCloud.database();

exports.main = async (event) => {
  try {
    const { childId = '', reportId = '', recordId = '' } = event;

    if (!childId && !reportId && !recordId) {
      return {
        code: 400,
        msg: '缺少必要参数: childId、reportId 或 recordId'
      };
    }

    const query = reportId
      ? { reportId }
      : recordId
        ? { recordId }
        : { childId };
    if (childId && (reportId || recordId)) {
      query.childId = childId;
    }

    const res = await db.collection('wtdb-business-assess-report')
      .where(query)
      .orderBy('completionTime', 'desc')
      .get();

    return {
      code: 200,
      data: res.data,
      msg: '查询成功'
    };
  } catch (error) {
    console.error('查询失败:', error);
    return {
      code: 500,
      msg: `查询失败: ${error.message}`
    };
  }
};
