import pagesJson from '@/pages.json'

const CHANNEL = 'miniapp'
const APP_ID = '__UNI__0FAB82A'
const DEDUPE_INTERVAL = 800
const ACTIVITY_FUNCTION_NAME = 'wtdb-user-activity'
const sessionId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
let lastEventKey = ''
let lastEventTime = 0
let cloudAuditInstalled = false

const CLOUD_FUNCTION_LABELS = {
  'wtdb-ablls-standard-by-age': '加载评估标准',
  'wtdb-business-member-class': '查看已加入班级',
  'wtdb-business-class-list': '查看班级列表',
  'wtdb-business-class-detail': '查找或进入班级',
  'wtdb-business-class-create': '创建班级',
  'wtdb-business-children-list': '查看班级学生',
  'wtdb-business-children-edit': '管理学生资料',
  'wtdb-class-approval': '管理入班申请',
  'wtdb-teacher-management': '管理班级老师',
  'wt-fetch-admin-user': '查看管理权限',
  'wt-fetch-assessment-list': '查看评估量表',
  'wt-fetch-assessment-section': '查看评估模块',
  'wt-fetch-assessment-v2': '加载评估题目',
  'wt-fetch-assess-id': '开始或继续评估',
  'wtdb-fetch-assess-history': '查看评估进度',
  'wtdb-upload-assess-history': '保存评估答题进度',
  'wt-upload-assess-record': '创建评估记录',
  'wt-business-report-gen-v2': '提交评估并生成报告',
  'wt-run-report-tasks': '执行报告生成任务',
  'wt-get-report-task-status': '查看报告生成进度',
  'wt-fetch-child-report-history': '查看学生评估报告',
  'wt-fetch-report-history': '查看班级最近评估',
  'wtdb-generate-report-pdf': '生成或下载评估报告',
  'wtdb-check-school-location': '验证评估位置'
}

const CLOUD_ACTION_LABELS = {
  'wtdb-business-children-edit:detail': '查看学生资料',
  'wtdb-business-children-edit:update': '修改学生资料',
  'wtdb-class-approval:summary': '查看入班待办',
  'wtdb-class-approval:list': '查看入班申请',
  'wtdb-class-approval:submit': '提交老师入班申请',
  'wtdb-class-approval:review:approve': '通过老师入班申请',
  'wtdb-class-approval:review:reject': '拒绝老师入班申请',
  'wtdb-teacher-management:summary': '查看老师管理概况',
  'wtdb-teacher-management:list': '查看班级老师',
  'wtdb-teacher-management:class-list': '查看本班老师',
  'wtdb-teacher-management:remove': '将老师移出班级'
}

const TARGET_FIELDS = [
  ['student', 'childId'],
  ['student', 'child_id'],
  ['class', 'classId'],
  ['class', 'class_id'],
  ['assessment_record', 'recordId'],
  ['assessment', 'assessmentId'],
  ['report', 'reportId'],
  ['teacher_membership', 'memberId'],
  ['approval', 'approvalId'],
  ['task', 'taskId']
]

function buildPageTitleMap() {
  const result = {}
  ;(pagesJson.pages || []).forEach(page => {
    result[page.path] = page.style && page.style.navigationBarTitleText || ''
  })
  ;(pagesJson.subPackages || []).forEach(group => {
    ;(group.pages || []).forEach(page => {
      const route = `${group.root}/${page.path}`.replace(/\/+/g, '/')
      result[route] = page.style && page.style.navigationBarTitleText || ''
    })
  })
  return result
}

const pageTitleMap = buildPageTitleMap()

function getCurrentRoute() {
  if (typeof getCurrentPages !== 'function') return ''
  const pages = getCurrentPages()
  const currentPage = pages && pages[pages.length - 1]
  return currentPage && currentPage.route ? String(currentPage.route) : ''
}

function getClientInfo() {
  let systemInfo = {}
  try {
    systemInfo = uni.getSystemInfoSync() || {}
  } catch (error) {}
  return {
    appid: APP_ID,
    platform: systemInfo.uniPlatform || systemInfo.platform || 'mp-weixin',
    model: systemInfo.model || '',
    deviceId: systemInfo.deviceId || '',
    userAgent: systemInfo.ua || ''
  }
}

function hasValidSession() {
  const token = uni.getStorageSync('uni_id_token')
  const expired = Number(uni.getStorageSync('uni_id_token_expired')) || 0
  return Boolean(token && (!expired || expired > Date.now()))
}

function resolveCloudOperation(options = {}) {
  const name = String(options.name || '')
  const data = options.data && typeof options.data === 'object' ? options.data : {}
  const nestedData = data.params && typeof data.params === 'object' ? data.params : {}
  const action = String(data.action || '')
  const decision = String(data.decision || '')
  const actionKey = [name, action, decision].filter(Boolean).join(':')
  const fallbackKey = [name, action].filter(Boolean).join(':')
  const target = TARGET_FIELDS.find(([, field]) => data[field] || nestedData[field])
  return {
    actionName: `cloud:${fallbackKey || name}`,
    actionDetail: CLOUD_ACTION_LABELS[actionKey] || CLOUD_ACTION_LABELS[fallbackKey] ||
      CLOUD_FUNCTION_LABELS[name] || `调用业务能力 ${name}`,
    targetType: target ? target[0] : '',
    targetId: target ? String(data[target[1]] || nestedData[target[1]] || '') : ''
  }
}

function cloudResultStatus(response) {
  const result = response && response.result
  if (!result || typeof result !== 'object') return 'success'
  if (Object.prototype.hasOwnProperty.call(result, 'code')) {
    const code = Number(result.code)
    return code === 0 || code === 200 ? 'success' : 'failure'
  }
  if (Object.prototype.hasOwnProperty.call(result, 'errCode')) {
    return Number(result.errCode) === 0 ? 'success' : 'failure'
  }
  return 'success'
}

function recordCloudOperation(operation, resultStatus, startedAt) {
  try {
    trackUserAction(operation.actionName, {
      actionDetail: operation.actionDetail,
      resultStatus,
      durationMs: Date.now() - startedAt,
      targetType: operation.targetType,
      targetId: operation.targetId
    })
  } catch (error) {}
}

function installCloudFunctionAudit() {
  if (cloudAuditInstalled || !uniCloud || typeof uniCloud.callFunction !== 'function') return
  const originalCallFunction = uniCloud.callFunction.bind(uniCloud)
  uniCloud.callFunction = options => {
    const functionName = String(options && options.name || '')
    if (!functionName || functionName === ACTIVITY_FUNCTION_NAME || !hasValidSession()) {
      return originalCallFunction(options)
    }
    const operation = resolveCloudOperation(options)
    const startedAt = Date.now()
    let request
    try {
      request = originalCallFunction(options)
    } catch (error) {
      recordCloudOperation(operation, 'failure', startedAt)
      throw error
    }
    return Promise.resolve(request).then(response => {
      recordCloudOperation(operation, cloudResultStatus(response), startedAt)
      return response
    }).catch(error => {
      recordCloudOperation(operation, 'failure', startedAt)
      throw error
    })
  }
  cloudAuditInstalled = true
}

export function trackUserActivity(eventType, options = {}) {
  if (!hasValidSession()) return Promise.resolve(false)
  const page = String(options.page || getCurrentRoute()).split('?')[0].split('#')[0]
  const eventKey = `${eventType}:${page}:${options.actionName || ''}`
  const now = Date.now()
  if (eventKey === lastEventKey && now - lastEventTime < DEDUPE_INTERVAL) {
    return Promise.resolve(false)
  }
  lastEventKey = eventKey
  lastEventTime = now
  return uniCloud.callFunction({
    name: 'wtdb-user-activity',
    data: {
      action: 'track',
      channel: CHANNEL,
      eventType,
      actionName: options.actionName || eventType,
      actionDetail: options.actionDetail || '',
      resultStatus: options.resultStatus || '',
      durationMs: Number(options.durationMs) || 0,
      targetType: options.targetType || '',
      targetId: options.targetId || '',
      page,
      pageTitle: options.pageTitle || pageTitleMap[page] || '',
      sessionId,
      client: getClientInfo(),
      uniIdToken: uni.getStorageSync('uni_id_token')
    }
  }).then(response => response.result).catch(() => false)
}

export function trackAppShow() {
  return trackUserActivity('app_show', {
    actionName: 'miniapp_show',
    pageTitle: '小程序进入前台'
  })
}

export function trackPageView() {
  const page = getCurrentRoute()
  if (!page) return Promise.resolve(false)
  return trackUserActivity('page_view', { page })
}

export function trackUserAction(actionName, options = {}) {
  return trackUserActivity('user_action', { ...options, actionName })
}

export const userActivityPageMixin = {
  onShow() {
    setTimeout(() => trackPageView(), 0)
  }
}

export function installUserActivityTracking(app) {
  if (app && typeof app.mixin === 'function') app.mixin(userActivityPageMixin)
  installCloudFunctionAudit()
}
