'use strict';

const db = uniCloud.database();
const dbCmd = db.command;
let subjectAuth;
try {
  subjectAuth = require('business-subject-auth');
} catch (_) {
  subjectAuth = require('../common/business-subject-auth');
}

function normalizeId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value.$oid) return String(value.$oid);
  if (value._id) return normalizeId(value._id);

  const valueString = String(value);
  const objectIdMatch = valueString.match(/ObjectId\(["'](.+)["']\)/);
  return objectIdMatch ? objectIdMatch[1] : valueString;
}

async function getAssessmentTitleMap(reports) {
  const assessmentIds = [
    ...new Set(reports.map((report) => normalizeId(report.assessmentId)).filter(Boolean))
  ];

  if (!assessmentIds.length) return new Map();

  const titleMap = new Map();
  const batchSize = 50;

  for (let index = 0; index < assessmentIds.length; index += batchSize) {
    const idBatch = assessmentIds.slice(index, index + batchSize);
    const assessmentRes = await db.collection('wtdb-business-assessment-list')
      .where({ _id: dbCmd.in(idBatch) })
      .field({ title: true })
      .get();

    assessmentRes.data.forEach((assessment) => {
      const title = typeof assessment.title === 'string' ? assessment.title.trim() : '';
      if (title) titleMap.set(normalizeId(assessment._id), title);
    });
  }

  return titleMap;
}

exports.main = async (event = {}, context) => {
  try {
    const {
      childId = '',
      reportId = '',
      recordId = '',
      documentId = ''
    } = event;

    if (!childId && !reportId && !recordId && !documentId) {
      return {
        code: 400,
        msg: '缺少必要参数: childId、reportId、recordId 或 documentId'
      };
    }

    const scope = await subjectAuth.getAuthScope(event, context);
    if (childId) {
      await subjectAuth.assertChildReadAccess(scope, childId);
    }

    let res;
    if (documentId) {
      res = await db.collection('wtdb-business-assess-report')
        .doc(documentId)
        .get();
    } else {
      const query = reportId
        ? { reportId }
        : recordId
          ? { recordId }
          : { childId };
      if (childId && (reportId || recordId)) {
        query.childId = childId;
      }

      res = await db.collection('wtdb-business-assess-report')
        .where(query)
        .orderBy('completionTime', 'desc')
        .limit(100)
        .get();
    }

    // reportId/recordId/documentId 都是客户端可控参数，查到文档后必须再按儿童做资源级授权。
    const authorizedChildIds = new Set();
    for (const report of res.data || []) {
      const reportChildId = subjectAuth.compactId(report.childId || report.child_id);
      if (!reportChildId) {
        throw new subjectAuth.AuthError(403, '报告缺少儿童归属，无法授权访问');
      }
      if (childId && reportChildId !== subjectAuth.compactId(childId)) {
        throw new subjectAuth.AuthError(400, '报告与儿童信息不匹配');
      }
      if (!authorizedChildIds.has(reportChildId)) {
        await subjectAuth.assertChildReadAccess(scope, reportChildId);
        authorizedChildIds.add(reportChildId);
      }
    }

    let assessmentTitleMap = new Map();
    try {
      assessmentTitleMap = await getAssessmentTitleMap(res.data);
    } catch (error) {
      // 量表信息查询失败不应阻断历史报告本身的返回。
      console.warn('补全历史报告量表名称失败:', error);
    }

    const reports = res.data.map((report) => {
      const storedTitle = typeof report.assessmentTitle === 'string'
        ? report.assessmentTitle.trim()
        : '';

      return {
        ...report,
        assessmentTitle:
          storedTitle ||
          assessmentTitleMap.get(normalizeId(report.assessmentId)) ||
          '评估报告'
      };
    });

    return {
      code: 200,
      data: reports,
      msg: '查询成功'
    };
  } catch (error) {
    console.error('查询失败:', error);
    return subjectAuth.toErrorResponse(error, '查询报告失败');
  }
};
