<template>
  <view class="intervention-page">
    <custom-nav
      :xcxName="'干预训练计划'"
      :navCustomStyle="navCustomStyle"
      :needBar="false"
      :needBack="true"
      :backHandler="goBack"
    />

    <view v-if="loading" class="page-state">
      <view class="state-spinner"></view>
      <text class="state-title">正在打开训练计划</text>
      <text class="state-hint">正在读取最新评估结果与计划状态</text>
    </view>

    <view v-else-if="reportData" class="page-content">
      <view class="context-card">
        <view class="context-avatar-wrap">
          <image class="context-avatar" :src="reportData.avatar || defaultAvatar" mode="aspectFill" />
        </view>
        <view class="context-copy">
          <text class="context-kicker">INTERVENTION PLAN</text>
          <text class="context-title">{{ reportData.childName || '孩子' }}的干预训练</text>
          <text class="context-meta">{{ reportData.assessmentTitle || '评估报告' }} · {{ formatDate(reportData.completionTime) }}</text>
        </view>
        <view v-if="isSharedView" class="readonly-badge">只读</view>
      </view>

      <view class="source-note">
        <text class="source-note-icon">i</text>
        <text>计划始终关联当前评估报告；报告重新分析后，这里会提示重新生成。</text>
      </view>

      <intervention-plan
        :key="reportData.reportId || reportData._id"
        :report="reportData"
        :read-only="isSharedView"
        @generated="handleGenerated"
        @status-change="handleStatusChange"
      />
    </view>

    <view v-else class="page-state">
      <view class="empty-mark">!</view>
      <text class="state-title">训练计划暂时无法打开</text>
      <text class="state-hint">{{ errorMessage || '请返回报告后重试' }}</text>
      <button class="retry-button" @click="loadReport">重新加载</button>
    </view>
  </view>
</template>

<script>
import customNav from '@/components/customNav'
import InterventionPlan from '@/components/intervention-plan/index.vue'

export default {
  components: { customNav, InterventionPlan },
  data() {
    return {
      loading: true,
      reportData: null,
      errorMessage: '',
      query: {},
      isSharedView: false,
      defaultAvatar: 'https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/girl.png',
      navCustomStyle: 'background: linear-gradient(135deg, #FFF4D8 0%, #FFE2A5 50%, #EDE6FF 100%);height: calc(100vh / 8)'
    }
  },
  onLoad(options = {}) {
    this.query = options
    this.isSharedView = options.isShare === 'true'
    this.loadReport()
  },
  methods: {
    async loadReport() {
      this.loading = true
      this.errorMessage = ''
      try {
        const response = await uniCloud.callFunction({
          name: 'wt-fetch-child-report-history',
          data: {
            childId: this.query.childId || '',
            reportId: this.query.reportId || '',
            recordId: this.query.recordId || '',
            documentId: this.query.documentId || '',
            uniIdToken: uni.getStorageSync('uni_id_token')
          }
        })
        const result = response?.result || {}
        if (result.code !== 200 || !result.data?.length) throw new Error(result.msg || '报告不存在')
        this.reportData = result.data[0]
      } catch (error) {
        console.error('加载干预训练计划失败:', error)
        this.reportData = null
        this.errorMessage = error.message || '加载失败'
      } finally {
        this.loading = false
      }
    },
    handleGenerated(plan) {
      if (!plan || !this.reportData) return
      this.reportData = {
        ...this.reportData,
        interventionPlan: plan,
        interventionPlanStatus: 'completed',
        interventionPlanStaleReason: '',
        interventionPlanUpdatedAt: plan.generatedAt || Date.now(),
        analysisRevision: plan.sourceAnalysisRevision || this.reportData.analysisRevision || 1
      }
      uni.setStorageSync('intervention_plan_result', {
        reportId: this.reportData.reportId || '',
        documentId: this.reportData._id || '',
        plan
      })
    },
    handleStatusChange(task) {
      if (!task || !this.reportData) return
      this.reportData = {
        ...this.reportData,
        interventionPlanGeneration: task,
        interventionPlanStatus: task.status === 'completed'
          ? 'completed'
          : ['failed', 'timed_out'].includes(task.status)
            ? 'failed'
            : 'generating',
        interventionPlanUpdatedAt: task.updatedAt || Date.now()
      }
      uni.setStorageSync('intervention_plan_task_result', {
        reportId: this.reportData.reportId || '',
        documentId: this.reportData._id || '',
        task
      })
    },
    formatDate(value) {
      if (!value) return '评估日期未知'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return '评估日期未知'
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
    },
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) uni.navigateBack()
      else uni.redirectTo({ url: '/pages/dashboard/teacher/teacher' })
    }
  }
}
</script>

<style scoped>
.intervention-page { min-height: 100vh; overflow-x: hidden; background: linear-gradient(180deg, #fffaf0 0%, #f7f5fb 26%, #f4f3f7 100%); }
.page-content { padding: 22rpx 28rpx 48rpx; }
.context-card { display: flex; align-items: center; gap: 22rpx; padding: 26rpx; border: 1rpx solid rgba(112, 88, 58, .12); border-radius: 28rpx; background: rgba(255,255,255,.88); box-shadow: 0 14rpx 36rpx rgba(68,54,92,.07); }
.context-avatar-wrap { padding: 5rpx; border: 2rpx solid #f0cb7e; border-radius: 24rpx; background: #fff7df; }.context-avatar { display: block; width: 92rpx; height: 92rpx; border-radius: 20rpx; }.context-copy { min-width: 0; flex: 1; }.context-kicker { display: block; color: #9a762e; font-size: 17rpx; font-weight: 900; letter-spacing: 2rpx; }.context-title { display: block; margin-top: 8rpx; color: #352e49; font-size: 31rpx; font-weight: 900; }.context-meta { display: block; overflow: hidden; margin-top: 8rpx; color: #81798b; font-size: 20rpx; text-overflow: ellipsis; white-space: nowrap; }.readonly-badge { flex-shrink: 0; padding: 9rpx 14rpx; border-radius: 999rpx; background: #eeeaf7; color: #6b5aa4; font-size: 18rpx; font-weight: 800; }
.source-note { display: flex; align-items: flex-start; gap: 12rpx; margin: 18rpx 8rpx 0; color: #7c7483; font-size: 20rpx; line-height: 1.55; }.source-note-icon { display: flex; width: 28rpx; height: 28rpx; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 50%; background: #e9e3f6; color: #6652a9; font-size: 17rpx; font-weight: 900; }
.page-state { display: flex; min-height: 65vh; flex-direction: column; align-items: center; justify-content: center; padding: 40rpx; color: #776f80; }.state-spinner { width: 54rpx; height: 54rpx; border: 6rpx solid #e4deee; border-top-color: #6954b5; border-radius: 50%; animation: spin .8s linear infinite; }.empty-mark { display: flex; width: 68rpx; height: 68rpx; align-items: center; justify-content: center; border-radius: 50%; background: #fff0de; color: #b66f25; font-size: 34rpx; font-weight: 900; }.state-title { margin-top: 24rpx; color: #41384f; font-size: 28rpx; font-weight: 900; }.state-hint { margin-top: 10rpx; text-align: center; font-size: 21rpx; }.retry-button { margin-top: 24rpx; padding: 14rpx 28rpx; border: 0; border-radius: 18rpx; background: #6752b2; color: #fff; font-size: 22rpx; font-weight: 800; }.retry-button::after { border: 0; }@keyframes spin { to { transform: rotate(360deg); } }
</style>
