'use strict';

const uniID = require('uni-id-common');
const db = uniCloud.database();

const STATUS_TEXT = {
  pending: '等待分析',
  processing: 'DeepSeek分析中',
  waiting_merge: '正在生成报告总结',
  pending_save: '正在保存报告',
  completed: '报告已生成',
  failed: '生成失败'
};

function compactId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value.$oid) return value.$oid;
  if (value._id) return compactId(value._id);
  return String(value);
}

function getTaskAssessorId(task) {
  return compactId(
    task.assessorId ||
    (task.originalParams && task.originalParams.query && task.originalParams.query.assessorId)
  );
}

function getTaskRecordId(task) {
  return task.recordId ||
    (task.originalParams && task.originalParams.query && task.originalParams.query.recordId) ||
    '';
}

async function getTask({ taskId, recordId, childId }) {
  if (taskId) {
    const res = await db.collection('wtdb-report-tasks')
      .where({ taskId })
      .limit(1)
      .get();
    if (res.data && res.data[0]) return res.data[0];
  }

  if (recordId) {
    let res = await db.collection('wtdb-report-tasks')
      .where({ recordId })
      .orderBy('updateTime', 'desc')
      .limit(1)
      .get();
    if (res.data && res.data[0]) return res.data[0];

    res = await db.collection('wtdb-report-tasks')
      .where({ 'originalParams.query.recordId': recordId })
      .orderBy('updateTime', 'desc')
      .limit(1)
      .get();
    if (res.data && res.data[0]) return res.data[0];
  }

  if (childId) {
    const res = await db.collection('wtdb-report-tasks')
      .where({ childId })
      .orderBy('updateTime', 'desc')
      .limit(1)
      .get();
    if (res.data && res.data[0]) return res.data[0];
  }

  return null;
}

async function getReportByRecordId(recordId) {
  if (!recordId) return null;

  const res = await db.collection('wtdb-business-assess-report')
    .where({ recordId })
    .orderBy('completionTime', 'desc')
    .limit(1)
    .get();

  return res.data && res.data[0];
}

async function getAnalysisProgress(taskId) {
  if (!taskId) return null;

  const res = await db.collection('wtdb-section-analysis-tasks')
    .where({ taskId })
    .field({ sectionId: true, sectionName: true, status: true, updateTime: true })
    .get();
  const sections = (res.data || []).map(item => ({
    sectionId: item.sectionId || '',
    sectionName: item.sectionName || '',
    status: item.status || 'pending'
  }));
  const completedSections = sections.filter(item => item.status === 'done').length;
  const currentSection = sections.find(item => item.status === 'processing') ||
    sections.find(item => item.status === 'pending') ||
    null;

  return {
    sections,
    totalSections: sections.length,
    completedSections,
    currentSectionName: currentSection && currentSection.sectionName || ''
  };
}

function normalizeTask(task, report, analysisProgress) {
  const status = task ? task.status : 'completed';
  const taskReport = task && task.report;
  const analysisTotal = Number(analysisProgress && analysisProgress.totalSections) || 0;
  const taskTotal = Number(task && task.totalSections) || 0;
  const totalSections = analysisTotal || taskTotal;
  const analysisCompleted = Number(analysisProgress && analysisProgress.completedSections) || 0;
  const taskCompleted = Number(task && task.completedSections) || 0;
  const completedSections = analysisTotal ? analysisCompleted : taskCompleted;
  const derivedProgress = totalSections
    ? Math.min(90, Math.round((completedSections / totalSections) * 90))
    : 0;
  let progress = task ? Math.max(Number(task.progress) || 0, derivedProgress) : 100;
  if (status === 'pending_save') progress = Math.max(progress, 99);
  if (status === 'completed') progress = 100;

  return {
    taskId: task && task.taskId || '',
    recordId: task ? getTaskRecordId(task) : (report && report.recordId) || '',
    childId: compactId(task && task.childId || report && report.childId),
    status,
    statusText: STATUS_TEXT[status] || status,
    progress,
    totalSections,
    completedSections,
    currentSectionName: analysisProgress && analysisProgress.currentSectionName || '',
    sectionProgress: analysisProgress && analysisProgress.sections || [],
    reportId: (report && (report.reportId || compactId(report._id))) ||
      (taskReport && taskReport.reportId) ||
      '',
    failReason: task && (task.failReason || task.errorMessage) || '',
    provider: task && task.metadata && task.metadata.provider || 'deepseek-official',
    updateTime: task && task.updateTime || report && report.updateTime || null
  };
}

exports.main = async (event = {}, context) => {
  const { taskId = '', recordId = '', childId = '' } = event;

  if (!taskId && !recordId && !childId) {
    return {
      code: 400,
      msg: '缺少参数: taskId、recordId 或 childId'
    };
  }

  try {
    const tokenRes = await uniID.createInstance({ context }).checkToken(event.uniIdToken);
    if (!tokenRes || tokenRes.errCode || !tokenRes.uid) {
      return {
        code: 401,
        msg: '登录状态已失效，请重新登录'
      };
    }

    const uid = compactId(tokenRes.uid);
    const task = await getTask({ taskId, recordId, childId });
    const resolvedRecordId = getTaskRecordId(task) || recordId;
    const report = await getReportByRecordId(resolvedRecordId);

    if (!task && !report) {
      return {
        code: 404,
        msg: '报告任务不存在'
      };
    }

    if (task && getTaskAssessorId(task) && getTaskAssessorId(task) !== uid) {
      return {
        code: 403,
        msg: '无权查看该报告任务'
      };
    }

    const analysisProgress = task
      ? await getAnalysisProgress(task.taskId)
      : null;

    return {
      code: 200,
      msg: 'success',
      data: normalizeTask(task, report, analysisProgress)
    };
  } catch (error) {
    console.error('获取报告任务状态失败:', error);
    return {
      code: 500,
      msg: `获取报告任务状态失败: ${error.message}`
    };
  }
};
