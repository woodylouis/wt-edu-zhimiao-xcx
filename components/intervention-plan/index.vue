<template>
  <view id="training-plan-section" class="training-plan" :class="{ 'training-plan--editing': editing }">
    <view class="section-heading">
      <view class="section-kicker"><text class="kicker-line"></text>计划设置与每日安排<text class="kicker-line"></text></view>
      <view class="heading-row">
        <view class="calendar-mark"><text class="calendar-rings">••</text><text class="calendar-day">7</text></view>
        <view class="heading-copy">
          <text class="heading-title">个性化成长训练计划</text>
          <text class="heading-subtitle">看完评估结果后，再把重点技能安排到每一周、每一天</text>
        </view>
        <view v-if="hasPlan" class="ready-badge" :class="{ warning: planMismatched }">
          <text class="ready-dot"></text>{{ planMismatched ? '需更新' : '已匹配' }}
        </view>
      </view>

      <view v-if="hasVisibleGenerationTask" class="generation-card" :class="generationTone">
        <view class="generation-card-head">
          <view class="generation-state-icon">
            <view v-if="isGenerationActive" class="state-spinner"></view>
            <text v-else>{{ generationFailed ? '!' : '✓' }}</text>
          </view>
          <view class="generation-copy">
            <view class="generation-title-row">
              <text class="generation-title">{{ generationTitle }}</text>
              <text class="generation-percent">{{ taskProgress }}%</text>
            </view>
            <text class="generation-message">{{ generationTask.message || generationTask.statusText }}</text>
          </view>
        </view>
        <view class="progress-track"><view class="progress-value" :style="{ width: `${taskProgress}%` }"></view></view>
        <view class="generation-meta">
          <text>{{ generationTask.completedWeeks || 0 }}/{{ generationTask.totalWeeks || 0 }}周已完成</text>
          <text v-if="generationTask.attempt > 1">自动重试 {{ generationTask.attempt }}/{{ generationTask.maxAttempts }}</text>
          <text v-if="generationTask.updatedAt">更新于 {{ formatTaskTime(generationTask.updatedAt) }}</text>
        </view>
        <view v-if="isGenerationActive" class="background-note">
          <text class="cloud-mark">☁</text>
          <text>任务已保存在云端，可以安全退出本页面；再次进入会自动恢复最新进度。</text>
        </view>
        <view v-if="generationFailed" class="generation-error">
          <text class="generation-error-code">{{ generationTask.errorCode || 'GENERATION_FAILED' }}</text>
          <text class="generation-error-text">{{ generationTask.errorMessage || '生成失败，请稍后重试' }}</text>
          <text v-if="generationTask.diagnosticMessage" class="generation-error-diagnostic">诊断：{{ generationTask.diagnosticMessage }}</text>
          <text v-if="generationTask.completedWeeks" class="generation-error-retained">已保留完成的{{ generationTask.completedWeeks }}周，重试后将继续生成。</text>
        </view>
        <view class="generation-actions">
          <button v-if="isGenerationActive" class="task-secondary-button" @click="refreshGenerationStatus(false)">刷新状态</button>
          <button v-if="generationFailed && generationTask.retryable !== false && !readOnly" class="task-primary-button" :disabled="submitting" @click="retryGeneration">
            {{ submitting ? '正在提交…' : '从当前进度重试' }}
          </button>
          <button v-if="generationFailed && !readOnly" class="task-secondary-button" @click="beginEditing">重新设置周期</button>
        </view>
      </view>

      <view v-if="!hasPlan && !editing && !readOnly && !hasVisibleGenerationTask" class="create-callout">
        <view class="callout-copy">
          <text class="callout-title">从报告建议继续制定每日训练</text>
          <text class="callout-text">从今天开始，选择训练周期，AI 将生成材料、步骤与完成标准。</text>
        </view>
        <button class="create-button" @click="beginEditing">制定计划 <text>→</text></button>
      </view>

      <view v-if="hasPlan" class="compact-summary" :class="{ mismatch: planMismatched }">
        <view class="compact-copy">
          <text class="compact-title">{{ plan.title }}</text>
          <view class="compact-meta">
            <text>{{ plan.weeksCount }}周 · {{ plan.weeksCount * 7 }}天</text>
            <text class="meta-divider">·</text>
            <text>{{ shortDate(plan.startDate) }}—{{ shortDate(plan.endDate) }}</text>
          </view>
        </view>
        <view v-if="!editing" class="compact-actions">
          <button v-if="!readOnly" class="secondary-button" :class="{ refresh: planMismatched }" @click="beginEditing">
            {{ planMismatched ? '重新生成' : '调整日期' }}
          </button>
          <button class="view-button" @click="planExpanded = !planExpanded">
            {{ planExpanded ? '收起计划' : '查看计划' }} <text>{{ planExpanded ? '↑' : '↓' }}</text>
          </button>
        </view>
      </view>
      <view v-if="hasPlan && planMismatched" class="mismatch-alert">
        <view class="mismatch-icon">!</view>
        <view class="mismatch-copy">
          <text class="mismatch-title">训练计划与当前报告不匹配</text>
          <text class="mismatch-text">{{ planMismatchMessage }}</text>
        </view>
        <button v-if="!readOnly" class="mismatch-action" @click="beginEditing">及时重新生成</button>
      </view>
    </view>

    <view v-if="editing && !isGenerationActive" class="plan-editor">
      <view class="editor-heading">
        <view>
          <text class="editor-title">设置计划周期</text>
          <text class="editor-hint">先确定哪天开始，再选择训练几周；结束日期会自动算好</text>
        </view>
        <button class="text-button" @click="cancelEditing">取消</button>
      </view>

      <view class="schedule-builder">
        <intervention-date-picker :value="startDate" @change="handleStartDateChange">
          <view class="schedule-control">
            <view class="control-index">1</view>
            <view class="control-copy">
              <view class="control-label-row"><text class="control-label">开始日期</text><text class="default-chip">默认今天</text></view>
              <text class="control-value">{{ formatPickerDate(startDate) || '请选择开始日期' }}</text>
              <text class="control-hint">点击可更换日期</text>
            </view>
            <text class="control-action">选择</text>
          </view>
        </intervention-date-picker>

        <view class="schedule-connector"><text></text></view>

        <view class="schedule-control schedule-control--duration">
          <view class="control-index">2</view>
          <view class="control-copy">
            <text class="control-label">训练周期</text>
            <text class="control-hint control-hint--duration">{{ selectedDuration.hint }}</text>
          </view>
          <view class="duration-select-wrap">
            <uni-data-select
              v-model="durationIndex"
              :localdata="durationSelectOptions"
              :clear="false"
              @change="handleDurationChange"
            />
          </view>
        </view>

        <view v-if="isCustomRange" class="custom-weeks-row">
          <view class="custom-weeks-copy">
            <text class="custom-weeks-title">自定义训练周期</text>
            <text class="custom-weeks-hint">请输入大于10的整数，不设最大周数</text>
          </view>
          <view class="custom-weeks-input-wrap" :class="{ error: customWeeksError }">
            <input
              class="custom-weeks-input"
              type="number"
              inputmode="numeric"
              :value="customWeeks"
              placeholder="例如 12"
              @input="handleCustomWeeksInput"
            />
            <text class="custom-weeks-unit">周</text>
          </view>
        </view>

        <view class="schedule-connector"><text></text></view>

        <intervention-date-picker
          :start-date="startDate"
          :value="endDate"
          restrict-to-complete-weeks
          @change="handleEndDateChange"
          @invalid="handleInvalidEndDate"
        >
          <view class="schedule-control schedule-control--date">
            <view class="control-index" :class="{ 'control-index--done': rangeInfo.valid }">{{ rangeInfo.valid ? '✓' : '3' }}</view>
            <view class="control-copy">
              <text class="control-label">结束日期</text>
              <text class="control-value">{{ formatPickerDate(endDate) || '请选择结束日期' }}</text>
              <text class="control-hint">仅能选择完整周结束日；选择后会回填训练周期</text>
            </view>
            <text class="control-action">选择</text>
          </view>
        </intervention-date-picker>
      </view>

      <view class="range-feedback" :class="{ valid: rangeInfo.valid, error: rangeInfo.error || customWeeksError }">
        <view class="feedback-icon">{{ rangeInfo.valid ? '✓' : 'i' }}</view>
        <view class="feedback-copy">
          <text class="feedback-title">{{ rangeFeedbackTitle }}</text>
          <text class="feedback-text">{{ rangeFeedbackText }}</text>
        </view>
      </view>

      <button class="generate-button" :disabled="submitting || !rangeInfo.valid || !reportId" @click="generatePlan">
        <view v-if="submitting" class="button-spinner"></view>
        <text>{{ submitting ? '正在创建后台任务…' : `使用 DeepSeek 生成${rangeWeeks || ''}周计划` }}</text>
      </button>
      <text class="generating-note">提交后可安全退出页面，系统会在后台按周生成并保存进度</text>
      <text v-if="errorMessage" class="error-message">{{ errorMessage }}</text>
    </view>

    <view v-else-if="!hasPlan && readOnly" class="readonly-empty">
      <view class="empty-symbol">◌</view>
      <view><text class="empty-title">该报告尚未生成训练计划</text><text class="empty-hint">生成后会在这里展示每周目标和每日安排</text></view>
    </view>

    <view v-if="hasPlan && planExpanded && !editing" class="plan-body">
      <view class="plan-introduction">
        <text class="introduction-label">计划说明</text>
        <text class="introduction-text">{{ plan.summary }}</text>
      </view>

      <scroll-view class="week-tabs" scroll-x :show-scrollbar="false">
        <view class="week-tabs-inner">
          <button
            v-for="(week, index) in plan.weeklyPlans"
            :key="week.weekNumber"
            class="week-tab"
            :class="{ active: selectedWeek === index }"
            @click="selectWeek(index)"
          >
            <text class="week-tab-number">第{{ week.weekNumber }}周</text>
            <text class="week-tab-date">{{ shortDate(week.startDate) }}起</text>
          </button>
        </view>
      </scroll-view>

      <view v-if="currentWeek" class="week-panel">
        <view class="week-goal">
          <view class="goal-index">{{ currentWeek.weekNumber }}</view>
          <view class="goal-copy">
            <text class="goal-label">本周核心目标</text>
            <text class="goal-text">{{ currentWeek.goal }}</text>
            <view class="skill-chips"><text v-for="skill in currentWeek.focusSkills" :key="skill" class="skill-chip">{{ skill }}</text></view>
          </view>
        </view>

        <view class="criteria-box">
          <text class="criteria-title">本周完成标准</text>
          <view v-for="(item, index) in currentWeek.weeklySuccessCriteria" :key="index" class="criteria-item">
            <text class="criteria-check">✓</text><text>{{ item }}</text>
          </view>
        </view>

        <view class="daily-heading"><text class="daily-title">每日安排</text><text class="daily-hint">点击某一天查看步骤</text></view>
        <view class="day-list">
          <view v-for="(day, dayIndex) in currentWeek.dailyPlans" :key="day.date" class="day-card" :class="{ open: isDayOpen(dayIndex) }">
            <view class="day-card-head" @click="toggleDay(dayIndex)">
              <view class="day-date"><text class="day-weekday">{{ day.weekday }}</text><text class="day-month-date">{{ shortDate(day.date) }}</text></view>
              <view class="day-main">
                <view class="day-tags"><text class="activity-tag">{{ day.activityType }}</text><text class="duration-tag">{{ day.durationMinutes }}分钟</text></view>
                <text class="day-title">{{ day.title }}</text>
                <text class="day-target">{{ day.target }}</text>
              </view>
              <text class="expand-icon">{{ isDayOpen(dayIndex) ? '−' : '+' }}</text>
            </view>
            <view v-if="isDayOpen(dayIndex)" class="day-detail">
              <view class="detail-block"><text class="detail-label">准备材料</text><view class="material-list"><text v-for="item in day.materials" :key="item" class="material">{{ item }}</text></view></view>
              <view class="detail-block"><text class="detail-label">执行步骤</text><view v-for="(step, stepIndex) in day.steps" :key="stepIndex" class="step-row"><text class="step-number">{{ stepIndex + 1 }}</text><text class="step-text">{{ step }}</text></view></view>
              <view class="result-box"><text class="result-label">完成标准</text><text class="result-text">{{ day.successCriteria }}</text></view>
              <view class="caregiver-tip"><text class="tip-icon">i</text><text>{{ day.caregiverTip }}</text></view>
            </view>
          </view>
        </view>
      </view>

      <view class="caregiver-guide">
        <text class="guide-title">执行小提醒</text>
        <view v-for="(item, index) in plan.caregiverGuidance" :key="index" class="guide-item"><text class="guide-number">{{ index + 1 }}</text><text>{{ item }}</text></view>
        <text class="ai-note">本计划由 AI 根据当前评估结果生成，请结合孩子当天状态灵活调整。</text>
      </view>
    </view>
  </view>
</template>

<script>
import InterventionDatePicker from './intervention-date-picker.vue'

export default {
  name: 'InterventionPlan',
  components: { InterventionDatePicker },
  props: {
    report: { type: Object, default: () => ({}) },
    readOnly: { type: Boolean, default: false }
  },
  data() {
    return {
      editing: false,
      submitting: false,
      planExpanded: false,
      startDate: '',
      endDate: '',
      durationIndex: 3,
      durationOptions: [
        ...Array.from({ length: 10 }, (_, index) => ({
          label: `${index + 1}周 · ${(index + 1) * 7}天`,
          hint: index === 3 ? '常用周期，适合建立并巩固训练节奏' : `连续训练${index + 1}个完整周`,
          weeks: index + 1
        })),
        { label: '自定义（超过10周）', hint: '输入任意大于10的整数周数', weeks: 0 }
      ],
      customWeeks: '',
      selectedWeek: 0,
      openedDayKey: '0-0',
      errorMessage: '',
      generationTask: null,
      pollTimer: null,
      statusRequestInFlight: false,
      workerRunning: false,
      workerKickAt: 0,
      pollFailures: 0
    }
  },
  computed: {
    plan() { return this.report?.interventionPlan || null },
    hasPlan() { return !!(this.plan && Array.isArray(this.plan.weeklyPlans) && this.plan.weeklyPlans.length) },
    reportId() { return this.report?.reportId || this.report?._id || '' },
    currentWeek() { return this.plan?.weeklyPlans?.[this.selectedWeek] || null },
    durationSelectOptions() { return this.durationOptions.map((option, index) => ({ text: option.label, value: index })) },
    selectedDuration() { return this.durationOptions[this.durationIndex] || this.durationOptions[0] },
    isCustomRange() { return !this.selectedDuration.weeks },
    customWeeksNumber() {
      const weeks = Number(this.customWeeks)
      return Number.isInteger(weeks) && weeks > 10 ? weeks : 0
    },
    customWeeksError() {
      if (!this.isCustomRange || !String(this.customWeeks).length) return ''
      return this.customWeeksNumber ? '' : '请输入大于10的整数周数'
    },
    effectiveWeeks() { return this.isCustomRange ? this.customWeeksNumber : this.selectedDuration.weeks },
    rangeInfo() { return this.validateDateRange(this.startDate, this.endDate) },
    rangeWeeks() { return this.rangeInfo.valid ? this.rangeInfo.weeks : 0 },
    isGenerationActive() {
      return ['pending', 'generating_overview', 'generating_weeks', 'assembling'].includes(this.generationTask?.status)
    },
    generationFailed() {
      return ['failed', 'timed_out'].includes(this.generationTask?.status)
    },
    hasVisibleGenerationTask() {
      return !!(this.generationTask && this.generationTask.status !== 'completed')
    },
    taskProgress() {
      return Math.max(0, Math.min(100, Number(this.generationTask?.progress) || 0))
    },
    generationTone() {
      if (this.generationTask?.status === 'timed_out') return 'timeout'
      if (this.generationFailed) return 'failed'
      return 'active'
    },
    generationTitle() {
      if (this.generationTask?.status === 'timed_out') return '生成任务已超时'
      if (this.generationFailed) return '训练计划生成失败'
      if (this.generationTask?.status === 'assembling') return '正在完成最后检查'
      if (this.generationTask?.currentWeek) {
        return `正在生成第${this.generationTask.currentWeek}/${this.generationTask.totalWeeks}周`
      }
      return '训练计划正在后台生成'
    },
    planMismatched() {
      if (!this.hasPlan) return false
      if (this.report?.interventionPlanStatus === 'stale') return true
      const reportRevision = Number(this.report?.analysisRevision || 0)
      const sourceRevision = Number(this.plan?.sourceAnalysisRevision || 0)
      if (reportRevision && sourceRevision && reportRevision !== sourceRevision) return true
      const planRange = this.validateDateRange(this.plan?.startDate, this.plan?.endDate)
      if (!planRange.valid || planRange.weeks !== Number(this.plan?.weeksCount)) return true
      if (!Array.isArray(this.plan?.weeklyPlans) || this.plan.weeklyPlans.length !== Number(this.plan?.weeksCount)) return true
      return this.plan.weeklyPlans.some(week => !Array.isArray(week?.dailyPlans) || week.dailyPlans.length !== 7)
    },
    planMismatchMessage() {
      if (this.report?.interventionPlanStaleReason) return this.report.interventionPlanStaleReason
      const reportRevision = Number(this.report?.analysisRevision || 0)
      const sourceRevision = Number(this.plan?.sourceAnalysisRevision || 0)
      if (reportRevision && sourceRevision && reportRevision !== sourceRevision) {
        return '报告的AI分析已经更新，请基于最新结果重新生成计划。'
      }
      return '计划的日期周期或每日安排不完整，请及时重新生成。'
    },
    rangeFeedbackTitle() {
      if (this.rangeInfo.valid) return `已选择 ${this.rangeInfo.weeks} 个完整周，共 ${this.rangeInfo.totalDays} 天`
      if (this.isCustomRange && !this.customWeeksNumber) return this.customWeeksError || '请输入超过10周的训练周期'
      if (this.rangeInfo.error) return this.rangeInfo.error
      return '请完成计划周期设置'
    },
    rangeFeedbackText() {
      if (this.rangeInfo.valid) return `${this.startDate} 至 ${this.endDate}，开始与结束当天均包含在计划内`
      return this.isCustomRange ? '自定义周数不设上限，结束日期会按完整周自动计算' : '也可以直接选择有效结束日期，系统会自动回填训练周期'
    }
  },
  watch: {
    reportId() {
      this.editing = false
      this.planExpanded = false
      this.selectedWeek = 0
      this.openedDayKey = '0-0'
      this.errorMessage = ''
      this.generationTask = null
      this.stopPolling()
      this.$nextTick(() => this.initializeGenerationState())
    }
  },
  mounted() {
    this.initializeGenerationState()
  },
  beforeDestroy() {
    this.stopPolling()
  },
  methods: {
    parseDate(value) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null
      const date = new Date(`${value}T00:00:00.000Z`)
      return Number.isNaN(date.getTime()) ? null : date
    },
    validateDateRange(startValue, endValue) {
      if (!startValue || !endValue) return { valid: false, error: '', totalDays: 0, weeks: 0 }
      const start = this.parseDate(startValue)
      const end = this.parseDate(endValue)
      if (!start || !end) return { valid: false, error: '日期格式不正确', totalDays: 0, weeks: 0 }
      const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
      if (totalDays <= 0) return { valid: false, error: '结束日期不能早于开始日期', totalDays, weeks: 0 }
      if (totalDays % 7 !== 0) return { valid: false, error: '日期区间不是完整周，请调整结束日期', totalDays, weeks: totalDays / 7 }
      const weeks = totalDays / 7
      return { valid: true, error: '', totalDays, weeks }
    },
    addDays(value, days) {
      const date = this.parseDate(value)
      if (!date) return ''
      date.setUTCDate(date.getUTCDate() + days)
      return date.toISOString().slice(0, 10)
    },
    shortDate(value) {
      const parts = String(value || '').split('-')
      return parts.length === 3 ? `${Number(parts[1])}月${Number(parts[2])}日` : value
    },
    formatPickerDate(value) {
      const parts = String(value || '').split('-')
      if (parts.length !== 3) return ''
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const date = this.parseDate(value)
      const weekday = date ? weekdays[date.getUTCDay()] : ''
      return `${parts[0]}年${Number(parts[1])}月${Number(parts[2])}日${weekday ? ` · ${weekday}` : ''}`
    },
    todayDate() {
      const date = new Date()
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    beginEditing() {
      if (this.isGenerationActive) return
      const startDate = this.plan?.startDate || this.todayDate()
      const planRange = this.validateDateRange(startDate, this.plan?.endDate)
      const presetIndex = planRange.valid && planRange.weeks <= 10 ? planRange.weeks - 1 : 3
      this.durationIndex = planRange.valid && planRange.weeks > 10 ? this.durationOptions.length - 1 : presetIndex
      this.customWeeks = planRange.valid && planRange.weeks > 10 ? String(planRange.weeks) : ''
      this.startDate = startDate
      this.endDate = planRange.valid
        ? this.plan.endDate
        : this.addDays(startDate, 4 * 7 - 1)
      this.errorMessage = ''
      this.planExpanded = false
      this.editing = true
    },
    cancelEditing() {
      this.editing = false
      this.errorMessage = ''
    },
    formatTaskTime(value) {
      const date = new Date(Number(value))
      if (Number.isNaN(date.getTime())) return ''
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
    },
    initializeGenerationState() {
      const snapshot = this.report?.interventionPlanGeneration || null
      if (snapshot && snapshot.status !== 'completed') {
        this.generationTask = { ...snapshot }
        this.$emit('status-change', this.generationTask)
      }
      if (this.reportId) this.refreshGenerationStatus(true)
    },
    applyGenerationTask(task, plan = null) {
      if (!task) {
        this.generationTask = null
        this.stopPolling()
        return
      }
      this.generationTask = { ...task }
      this.$emit('status-change', this.generationTask)
      if (task.status === 'completed') {
        this.stopPolling()
        if (plan) this.finishGeneratedPlan(plan)
        return
      }
      if (this.isGenerationActive) {
        this.editing = false
        this.startPolling()
        const staleFor = Date.now() - Number(task.updatedAt || 0)
        if (!this.readOnly && (task.status === 'pending' || staleFor > 90000)) this.kickWorker(task.taskId)
      } else {
        this.stopPolling()
      }
    },
    finishGeneratedPlan(plan) {
      if (!plan) return
      this.generationTask = {
        ...(this.generationTask || {}),
        status: 'completed',
        progress: 100,
        message: '训练计划已生成'
      }
      this.editing = false
      this.planExpanded = true
      this.selectedWeek = 0
      this.openedDayKey = '0-0'
      this.errorMessage = ''
      this.$emit('generated', plan)
      this.$emit('status-change', this.generationTask)
    },
    startPolling() {
      if (this.pollTimer) return
      this.pollTimer = setInterval(() => this.refreshGenerationStatus(true), 3000)
    },
    stopPolling() {
      if (this.pollTimer) clearInterval(this.pollTimer)
      this.pollTimer = null
    },
    async refreshGenerationStatus(silent = true) {
      if (!this.reportId || this.statusRequestInFlight) return
      this.statusRequestInFlight = true
      try {
        const response = await uniCloud.callFunction({
          name: 'wtdb-generate-intervention-plan',
          data: {
            action: 'status',
            reportId: this.reportId,
            taskId: this.generationTask?.taskId || '',
            uniIdToken: uni.getStorageSync('uni_id_token')
          },
          timeout: 12000
        })
        const result = response?.result || {}
        if (result.code !== 200) throw new Error(result.msg || '状态刷新失败')
        this.pollFailures = 0
        this.applyGenerationTask(result.data?.task || null, result.data?.plan || null)
        if (!silent) uni.showToast({ title: '状态已更新', icon: 'none' })
      } catch (error) {
        this.pollFailures += 1
        console.warn('刷新训练计划状态失败:', error)
        if (!silent) uni.showToast({ title: '暂时无法刷新，后台任务不会受影响', icon: 'none' })
      } finally {
        this.statusRequestInFlight = false
      }
    },
    kickWorker(taskId) {
      if (!taskId || this.workerRunning || Date.now() - this.workerKickAt < 15000) return
      this.workerKickAt = Date.now()
      this.workerRunning = true
      uniCloud.callFunction({
        name: 'wtdb-run-intervention-plan-task',
        data: {
          taskId,
          uniIdToken: uni.getStorageSync('uni_id_token')
        },
        timeout: 600000
      }).catch(error => {
        console.warn('后台训练计划执行请求结束或中断:', error)
      }).finally(() => {
        this.workerRunning = false
        this.refreshGenerationStatus(true)
      })
    },
    async retryGeneration() {
      if (!this.generationTask?.taskId || this.submitting) return
      this.submitting = true
      this.errorMessage = ''
      try {
        const response = await uniCloud.callFunction({
          name: 'wtdb-generate-intervention-plan',
          data: {
            action: 'retry',
            reportId: this.reportId,
            taskId: this.generationTask.taskId,
            uniIdToken: uni.getStorageSync('uni_id_token')
          },
          timeout: 15000
        })
        const result = response?.result || {}
        if (result.code !== 202 || !result.data?.task) throw new Error(result.msg || '重试任务提交失败')
        this.applyGenerationTask(result.data.task)
        this.kickWorker(result.data.task.taskId)
        uni.showToast({ title: '已从当前进度继续生成', icon: 'none' })
      } catch (error) {
        this.errorMessage = error.message || '重试失败，请稍后再试'
        uni.showToast({ title: this.errorMessage, icon: 'none' })
      } finally {
        this.submitting = false
      }
    },
    handleStartDateChange(result) {
      if (!result?.value) return
      this.startDate = result.value
      const weeks = this.effectiveWeeks
      if (weeks) this.endDate = this.addDays(this.startDate, weeks * 7 - 1)
    },
    handleEndDateChange(result) {
      const value = result?.value || ''
      if (!value) return
      const range = this.validateDateRange(this.startDate, value)
      if (!range.valid) return
      this.endDate = value
      if (range.weeks <= 10) {
        this.durationIndex = range.weeks - 1
        this.customWeeks = ''
      } else {
        this.durationIndex = this.durationOptions.length - 1
        this.customWeeks = String(range.weeks)
      }
    },
    handleInvalidEndDate() {
      uni.showToast({ title: '请选择完整周结束日（第7、14、21…天）', icon: 'none' })
    },
    handleDurationChange(value) {
      const index = Number(value)
      if (!Number.isInteger(index) || index < 0 || index >= this.durationOptions.length) return
      this.durationIndex = index
      if (this.selectedDuration.weeks && this.startDate) {
        this.customWeeks = ''
        this.endDate = this.addDays(this.startDate, this.selectedDuration.weeks * 7 - 1)
      } else if (this.isCustomRange) {
        const existingWeeks = this.rangeWeeks > 10 ? this.rangeWeeks : 0
        this.customWeeks = existingWeeks ? String(existingWeeks) : ''
        this.endDate = existingWeeks ? this.addDays(this.startDate, existingWeeks * 7 - 1) : ''
      }
    },
    handleCustomWeeksInput(event) {
      const value = String(event.detail.value || '').trim()
      this.customWeeks = value
      const weeks = Number(value)
      this.endDate = Number.isInteger(weeks) && weeks > 10
        ? this.addDays(this.startDate, weeks * 7 - 1)
        : ''
    },
    selectWeek(index) {
      this.selectedWeek = index
      this.openedDayKey = `${index}-0`
    },
    isDayOpen(dayIndex) { return this.openedDayKey === `${this.selectedWeek}-${dayIndex}` },
    toggleDay(dayIndex) {
      const key = `${this.selectedWeek}-${dayIndex}`
      this.openedDayKey = this.openedDayKey === key ? '' : key
    },
    async confirmRegeneration() {
      if (!this.hasPlan) return true
      return new Promise(resolve => {
        uni.showModal({
          title: this.planMismatched ? '生成匹配当前报告的新计划？' : '重新生成训练计划？',
          content: this.planMismatched
            ? '当前计划与最新报告不匹配。重新生成后会按当前报告和所选日期区间覆盖旧计划。'
            : '新的日期区间和训练安排会覆盖当前计划。',
          confirmText: '重新生成',
          success: result => resolve(!!result.confirm),
          fail: () => resolve(false)
        })
      })
    },
    async generatePlan() {
      if (this.submitting || this.isGenerationActive || !this.rangeInfo.valid || !this.reportId) return
      if (!await this.confirmRegeneration()) return
      this.submitting = true
      this.errorMessage = ''
      try {
        const response = await uniCloud.callFunction({
          name: 'wtdb-generate-intervention-plan',
          data: {
            action: 'start',
            reportId: this.reportId,
            startDate: this.startDate,
            endDate: this.endDate,
            forceRegenerate: this.hasPlan,
            uniIdToken: uni.getStorageSync('uni_id_token')
          },
          timeout: 15000
        })
        const result = response?.result || {}
        if (result.code === 200 && result.data?.plan) {
          this.finishGeneratedPlan(result.data.plan)
          uni.showToast({ title: '计划已加载', icon: 'success' })
          return
        }
        if (result.code !== 202 || !result.data?.task) throw new Error(result.msg || '后台任务创建失败')
        this.applyGenerationTask(result.data.task)
        this.kickWorker(result.data.task.taskId)
        uni.showToast({ title: result.data.reused ? '已恢复生成任务' : '已转入后台生成', icon: 'none' })
      } catch (error) {
        console.error('创建训练计划任务失败:', error)
        this.errorMessage = error.message || '任务创建失败，请稍后重试'
        uni.showToast({ title: this.errorMessage, icon: 'none' })
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style scoped>
.training-plan { margin: 28px 0 8px; overflow: hidden; border: 1px solid #e8e5ef; border-radius: 18px; background: #fff; box-shadow: 0 8px 28px rgba(48, 42, 73, .07); color: #302a49; }.training-plan--editing { overflow: visible; }
.section-heading { padding: 22px; background: linear-gradient(135deg, #fffdf8 0%, #fff 56%, #f9f7ff 100%); }
.section-kicker { display: flex; align-items: center; justify-content: center; gap: 9px; margin-bottom: 18px; color: #9a8f78; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; }.kicker-line { width: 28px; height: 1px; background: #ded5c2; }
.heading-row { display: flex; align-items: center; gap: 14px; }.calendar-mark { position: relative; display: flex; width: 48px; height: 48px; flex-shrink: 0; align-items: center; justify-content: center; border: 1px solid #f2c77b; border-radius: 14px; background: #fff4d9; color: #76551f; }.calendar-rings { position: absolute; top: -8px; color: #d49a37; font-size: 18px; letter-spacing: 8px; transform: translateX(4px); }.calendar-day { font-size: 20px; font-weight: 900; }
.heading-copy { min-width: 0; flex: 1; }.heading-title { display: block; color: #342c4c; font-size: 20px; font-weight: 850; }.heading-subtitle { display: block; margin-top: 5px; color: #827a8e; font-size: 12px; line-height: 1.5; }.ready-badge { display: flex; flex-shrink: 0; align-items: center; padding: 6px 9px; border-radius: 20px; background: #edf8f2; color: #43805f; font-size: 10px; font-weight: 800; }.ready-badge.warning { background: #fff0dc; color: #a66520; }.ready-dot { width: 6px; height: 6px; margin-right: 5px; border-radius: 50%; background: #55af7c; }.warning .ready-dot { background: #e29138; }
.generation-card { margin-top: 18px; padding: 16px; border: 1px solid #dcd3f3; border-radius: 14px; background: linear-gradient(135deg, #f8f5ff, #fff); box-shadow: 0 6px 18px rgba(74,55,132,.07); }.generation-card.failed, .generation-card.timeout { border-color: #efc4bd; background: linear-gradient(135deg, #fff5f2, #fff); }.generation-card-head { display: flex; align-items: flex-start; gap: 11px; }.generation-state-icon { display: flex; width: 34px; height: 34px; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 11px; background: #6954b5; color: #fff; font-size: 16px; font-weight: 900; }.failed .generation-state-icon, .timeout .generation-state-icon { background: #c8655d; }.state-spinner { width: 15px; height: 15px; border: 2px solid rgba(255,255,255,.35); border-top-color: #fff; border-radius: 50%; animation: spin .8s linear infinite; }.generation-copy { min-width: 0; flex: 1; }.generation-title-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }.generation-title { color: #43375d; font-size: 14px; font-weight: 900; }.failed .generation-title, .timeout .generation-title { color: #8e403b; }.generation-percent { flex-shrink: 0; color: #6752b2; font-size: 14px; font-weight: 900; }.failed .generation-percent, .timeout .generation-percent { color: #b65b53; }.generation-message { display: block; margin-top: 4px; color: #7e7489; font-size: 11px; line-height: 1.5; }.progress-track { height: 7px; overflow: hidden; margin-top: 13px; border-radius: 999px; background: #ebe7f2; }.progress-value { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #745bc4, #9c84e4); transition: width .35s ease; }.failed .progress-value, .timeout .progress-value { background: linear-gradient(90deg, #d67970, #e9a29b); }.generation-meta { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 8px; color: #8e8597; font-size: 9px; }.background-note { display: flex; align-items: flex-start; gap: 7px; margin-top: 12px; padding: 9px 10px; border-radius: 9px; background: #eef7f3; color: #4f7765; font-size: 10px; line-height: 1.5; }.cloud-mark { flex-shrink: 0; color: #4f9b77; font-size: 13px; }.generation-error { display: flex; flex-direction: column; margin-top: 12px; padding: 10px 11px; border-radius: 9px; background: #fff0ed; }.generation-error-code { color: #bd625a; font-size: 8px; font-weight: 900; letter-spacing: .5px; }.generation-error-text { margin-top: 4px; color: #8b4b46; font-size: 11px; line-height: 1.5; }.generation-error-diagnostic { margin-top: 6px; padding-top: 6px; border-top: 1px dashed #e8b9b3; color: #8f625e; font-size: 9px; line-height: 1.45; word-break: break-all; }.generation-error-retained { margin-top: 5px; color: #a26b66; font-size: 9px; }.generation-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; margin-top: 12px; }.task-primary-button, .task-secondary-button { padding: 8px 11px; border-radius: 9px; font-size: 10px; font-weight: 850; }.task-primary-button { background: #6752b2; color: #fff; }.task-primary-button[disabled] { opacity: .55; }.task-secondary-button { border: 1px solid #ded8e8; background: #fff; color: #675c75; }
.create-callout { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 18px; padding: 15px; border: 1px solid #ede6d8; border-radius: 13px; background: rgba(255,255,255,.86); }.callout-copy { min-width: 0; flex: 1; }.callout-title { display: block; color: #493e2e; font-size: 14px; font-weight: 800; }.callout-text { display: block; margin-top: 4px; color: #8d8374; font-size: 11px; line-height: 1.5; }
button { margin: 0; padding: 0; border: 0; background: none; line-height: normal; }button::after { border: 0; }.create-button { min-width: 108px; padding: 11px 13px; border-radius: 11px; background: #6650b7; color: #fff; font-size: 12px; font-weight: 800; box-shadow: 0 6px 13px rgba(80,60,154,.2); }
.compact-summary { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 18px; padding: 14px 15px; border: 1px solid #e8e2f5; border-radius: 13px; background: #fff; }.compact-summary.mismatch { border-color: #edc58f; background: #fffdf8; }.compact-copy { min-width: 0; flex: 1; }.compact-title { display: block; overflow: hidden; color: #41375d; font-size: 14px; font-weight: 850; text-overflow: ellipsis; white-space: nowrap; }.compact-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 5px; color: #877f95; font-size: 11px; }.meta-divider { color: #c0b9ca; }.compact-actions { display: flex; flex-shrink: 0; gap: 8px; }.secondary-button, .view-button { padding: 9px 11px; border-radius: 9px; font-size: 11px; font-weight: 800; }.secondary-button { border: 1px solid #ddd6eb; color: #70677e; }.secondary-button.refresh { border-color: #dda453; background: #fff1d9; color: #995e18; }.view-button { background: #eee9fb; color: #604ca8; }
.mismatch-alert { display: flex; align-items: center; gap: 10px; margin-top: 10px; padding: 11px 12px; border: 1px solid #f0c788; border-radius: 11px; background: #fff5e6; }.mismatch-icon { display: flex; width: 23px; height: 23px; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 50%; background: #dc8c2e; color: #fff; font-size: 12px; font-weight: 900; }.mismatch-copy { min-width: 0; flex: 1; }.mismatch-title { display: block; color: #895317; font-size: 11px; font-weight: 850; }.mismatch-text { display: block; margin-top: 3px; color: #987246; font-size: 10px; line-height: 1.45; }.mismatch-action { flex-shrink: 0; padding: 7px 9px; border-radius: 8px; background: #d98427; color: #fff; font-size: 10px; font-weight: 850; }
.plan-editor { padding: 20px 22px 22px; border-top: 1px solid #eee9f3; background: #faf9fc; }.editor-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }.editor-title { display: block; color: #3c344e; font-size: 16px; font-weight: 850; }.editor-hint { display: block; margin-top: 5px; color: #81798c; font-size: 11px; line-height: 1.5; }.text-button { flex-shrink: 0; color: #6752b2; font-size: 12px; font-weight: 800; }
.schedule-builder { margin-top: 16px; padding: 6px 14px; border: 1px solid #e4deeb; border-radius: 16px; background: #fff; box-shadow: 0 5px 18px rgba(57,47,77,.04); }.schedule-picker { display: block; }.schedule-control { display: flex; min-height: 68px; align-items: center; gap: 12px; padding: 11px 3px; }.schedule-control--duration { position: relative; z-index: 4; }.schedule-control--result { margin: 0; }.control-index { display: flex; width: 27px; height: 27px; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 9px; background: #6751b7; color: #fff; font-size: 11px; font-weight: 900; box-shadow: 0 3px 8px rgba(83,61,157,.18); }.control-index--done { background: #4fa978; box-shadow: 0 3px 8px rgba(66,143,99,.16); }.control-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }.control-label-row { display: flex; align-items: center; gap: 7px; }.control-label { color: #82798d; font-size: 10px; font-weight: 750; }.default-chip { padding: 2px 6px; border-radius: 8px; background: #fff1ce; color: #92701f; font-size: 8px; font-weight: 800; }.control-value { display: block; overflow: hidden; margin-top: 3px; color: #3c334c; font-size: 14px; font-weight: 850; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; }.control-hint { display: block; overflow: hidden; margin-top: 2px; color: #9a92a2; font-size: 9px; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; }.control-hint--duration { max-width: 260px; margin-top: 5px; white-space: normal; }.control-action { flex-shrink: 0; padding: 7px 9px; border-radius: 8px; background: #f0ecfa; color: #654fad; font-size: 10px; font-weight: 850; }.duration-select-wrap { position: relative; z-index: 5; width: 150px; flex-shrink: 0; }.duration-select-wrap :deep(.uni-stat__select) { width: 100%; }.duration-select-wrap :deep(.uni-select) { border-color: #d9d1e8; border-radius: 9px; background: #faf8fd; }.duration-select-wrap :deep(.uni-select__input-box) { height: 36px; padding: 0 10px; }.duration-select-wrap :deep(.uni-select__input-text) { color: #4a3d61; font-size: 11px; font-weight: 800; }.duration-select-wrap :deep(.uni-select__selector) { z-index: 20; border-color: #ded7e9; box-shadow: 0 8px 22px rgba(54,42,78,.13); }.duration-select-wrap :deep(.uni-select__selector-scroll) { height: 250px; max-height: 250px !important; overflow-y: auto; }.calculated-chip { flex-shrink: 0; padding: 6px 8px; border-radius: 8px; background: #e7f6ee; color: #347457; font-size: 9px; font-weight: 850; }.schedule-connector { height: 12px; margin: -6px 0 -6px 16px; border-left: 1px dashed #c7bdd8; }.schedule-connector text { display: none; }
.custom-weeks-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 2px 5px 41px; padding: 11px 12px; border: 1px solid #e6dfef; border-radius: 11px; background: #faf8fd; }.custom-weeks-copy { min-width: 0; flex: 1; }.custom-weeks-title { display: block; color: #50445f; font-size: 11px; font-weight: 850; }.custom-weeks-hint { display: block; margin-top: 3px; color: #968d9f; font-size: 9px; line-height: 1.4; }.custom-weeks-input-wrap { display: flex; width: 116px; height: 36px; flex-shrink: 0; align-items: center; overflow: hidden; border: 1px solid #d7cfe5; border-radius: 9px; background: #fff; }.custom-weeks-input-wrap.error { border-color: #d96b61; box-shadow: 0 0 0 2px rgba(217,107,97,.1); }.custom-weeks-input { min-width: 0; height: 36px; flex: 1; padding: 0 9px; color: #3d334d; font-size: 12px; font-weight: 850; }.custom-weeks-unit { padding-right: 9px; color: #756a80; font-size: 10px; font-weight: 800; }
.range-feedback { display: flex; align-items: flex-start; gap: 10px; margin-top: 12px; padding: 11px 12px; border-radius: 11px; background: #f1eef7; }.range-feedback.valid { background: #edf8f2; }.range-feedback.error { background: #fff0ee; }.feedback-icon { display: flex; width: 20px; height: 20px; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 50%; background: #8b819c; color: #fff; font-size: 10px; font-weight: 900; }.valid .feedback-icon { background: #4fa978; }.error .feedback-icon { background: #d16d61; }.feedback-copy { display: flex; flex-direction: column; }.feedback-title { color: #5f586a; font-size: 11px; font-weight: 850; }.valid .feedback-title { color: #367456; }.error .feedback-title { color: #a64e46; }.feedback-text { margin-top: 3px; color: #8c8495; font-size: 10px; line-height: 1.45; }
.generate-button { display: flex; width: 100%; height: 46px; align-items: center; justify-content: center; gap: 9px; margin-top: 14px; border-radius: 12px; background: #6751b7; color: #fff; font-size: 14px; font-weight: 850; box-shadow: 0 7px 16px rgba(86,65,167,.2); }.generate-button[disabled] { background: #cbc6d4; box-shadow: none; color: #f5f3f7; }.button-spinner { width: 15px; height: 15px; border: 2px solid rgba(255,255,255,.35); border-top-color: #fff; border-radius: 50%; animation: spin .8s linear infinite; }.generating-note, .error-message { display: block; margin-top: 8px; text-align: center; font-size: 11px; }.generating-note { color: #7b7482; }.error-message { color: #bd514b; }@keyframes spin { to { transform: rotate(360deg); } }
.readonly-empty { display: flex; align-items: center; gap: 12px; padding: 0 22px 22px; }.empty-symbol { display: flex; width: 38px; height: 38px; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 50%; background: #f0edf6; color: #7b69b6; font-size: 24px; }.empty-title, .empty-hint { display: block; }.empty-title { color: #5a5363; font-size: 13px; font-weight: 800; }.empty-hint { margin-top: 3px; color: #948d9b; font-size: 10px; }
.plan-body { border-top: 1px solid #ece7f1; }.plan-introduction { padding: 17px 20px; background: #f8f6fc; }.introduction-label { display: block; color: #6f5db0; font-size: 10px; font-weight: 850; }.introduction-text { display: block; margin-top: 5px; color: #686071; font-size: 12px; line-height: 1.7; }
.week-tabs { width: 100%; border-top: 1px solid #eeeaf2; border-bottom: 1px solid #eeeaf2; background: #fdfcfe; white-space: nowrap; }.week-tabs-inner { display: inline-flex; gap: 8px; padding: 12px 18px; }.week-tab { display: inline-flex; min-width: 78px; flex-direction: column; padding: 9px 12px; border: 1px solid #e1dce8; border-radius: 10px; background: #fff; color: #7b7486; text-align: left; }.week-tab.active { border-color: #6751b7; background: #6751b7; color: #fff; box-shadow: 0 4px 11px rgba(91,70,174,.18); }.week-tab-number { font-size: 12px; font-weight: 850; }.week-tab-date { margin-top: 3px; opacity: .72; font-size: 9px; }
.week-panel { padding: 18px; }.week-goal { display: flex; gap: 12px; padding: 14px; border: 1px solid #e8e1f5; border-radius: 13px; background: linear-gradient(135deg, #f8f5ff, #fffaf0); }.goal-index { display: flex; width: 34px; height: 34px; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 10px; background: #6d57bb; color: #fff; font-size: 15px; font-weight: 900; }.goal-copy { min-width: 0; flex: 1; }.goal-label { display: block; color: #8975c8; font-size: 10px; font-weight: 850; }.goal-text { display: block; margin-top: 4px; color: #403650; font-size: 13px; font-weight: 750; line-height: 1.55; }.skill-chips, .material-list, .day-tags { display: flex; flex-wrap: wrap; gap: 6px; }.skill-chips { margin-top: 9px; }.skill-chip { padding: 4px 7px; border-radius: 18px; background: #ede7fb; color: #624eaa; font-size: 9px; }
.criteria-box { margin-top: 11px; padding: 12px 14px; border-radius: 11px; background: #eef8f3; }.criteria-title { display: block; color: #3a7658; font-size: 11px; font-weight: 850; }.criteria-item { display: flex; align-items: flex-start; gap: 7px; margin-top: 6px; color: #536c60; font-size: 11px; line-height: 1.5; }.criteria-check { flex-shrink: 0; color: #49a576; font-weight: 900; }.daily-heading { display: flex; align-items: center; justify-content: space-between; margin: 20px 2px 9px; }.daily-title { font-size: 14px; font-weight: 850; }.daily-hint { color: #9992a2; font-size: 10px; }
.day-list { display: flex; flex-direction: column; gap: 9px; }.day-card { overflow: hidden; border: 1px solid #e9e5ed; border-radius: 12px; }.day-card.open { border-color: #cbbef1; box-shadow: 0 5px 16px rgba(67,51,119,.06); }.day-card-head { display: flex; align-items: center; gap: 11px; padding: 12px; }.day-date { display: flex; width: 46px; flex-shrink: 0; flex-direction: column; align-items: center; padding: 7px 3px; border-radius: 9px; background: #f2eff8; }.day-weekday { color: #604cac; font-size: 11px; font-weight: 850; }.day-month-date { margin-top: 3px; color: #958e9e; font-size: 8px; }.day-main { min-width: 0; flex: 1; }.activity-tag, .duration-tag { padding: 3px 6px; border-radius: 9px; font-size: 8px; }.activity-tag { background: #fff1d2; color: #8c6517; }.duration-tag { background: #edf7f2; color: #468064; }.day-title { display: block; margin-top: 5px; color: #3d3648; font-size: 13px; font-weight: 850; }.day-target { display: -webkit-box; overflow: hidden; margin-top: 3px; color: #817a88; font-size: 10px; line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }.expand-icon { display: flex; width: 24px; height: 24px; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 50%; background: #f1edf9; color: #6954b6; font-size: 17px; }
.day-detail { padding: 2px 13px 14px 70px; border-top: 1px dashed #e5dfeb; }.detail-block { margin-top: 12px; }.detail-label { display: block; margin-bottom: 7px; color: #80778a; font-size: 10px; font-weight: 850; }.material { padding: 4px 7px; border: 1px solid #e5dfeb; border-radius: 7px; background: #faf9fb; color: #665e6d; font-size: 9px; }.step-row { display: flex; align-items: flex-start; gap: 8px; margin-top: 7px; }.step-number { display: flex; width: 19px; height: 19px; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 6px; background: #6d57bb; color: #fff; font-size: 9px; font-weight: 850; }.step-text { flex: 1; color: #544d5b; font-size: 11px; line-height: 1.55; }.result-box { margin-top: 12px; padding: 10px; border-radius: 9px; background: #fff8e8; }.result-label { display: block; color: #94701e; font-size: 9px; font-weight: 850; }.result-text { display: block; margin-top: 3px; color: #705d35; font-size: 11px; line-height: 1.5; }.caregiver-tip { display: flex; align-items: flex-start; gap: 7px; margin-top: 9px; color: #6e6677; font-size: 10px; line-height: 1.5; }.tip-icon { display: flex; width: 17px; height: 17px; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 50%; background: #eee9f8; color: #6854ae; font-size: 9px; font-weight: 900; }
.caregiver-guide { margin: 0 18px 18px; padding: 14px; border-radius: 12px; background: #373144; color: #fff; }.guide-title { display: block; margin-bottom: 8px; color: #ffedb5; font-size: 12px; font-weight: 850; }.guide-item { display: flex; align-items: flex-start; gap: 8px; margin-top: 7px; color: rgba(255,255,255,.82); font-size: 11px; line-height: 1.5; }.guide-number { display: flex; width: 18px; height: 18px; flex-shrink: 0; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,.25); border-radius: 50%; color: #ffe39a; font-size: 8px; }.ai-note { display: block; margin-top: 11px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.12); color: rgba(255,255,255,.5); font-size: 9px; line-height: 1.5; }
@media screen and (max-width: 560px) { .training-plan { margin: 28px 12px 8px; border-radius: 16px; }.section-heading, .plan-editor { padding: 17px; }.heading-title { font-size: 17px; }.heading-subtitle { font-size: 10px; }.calendar-mark { width: 42px; height: 42px; }.ready-badge { display: none; }.create-callout, .compact-summary { align-items: stretch; flex-direction: column; }.create-button { width: 100%; }.compact-actions { width: 100%; }.secondary-button, .view-button { flex: 1; }.generation-card { padding: 13px; }.generation-title { font-size: 12px; }.generation-actions { justify-content: stretch; }.task-primary-button, .task-secondary-button { flex: 1; }.schedule-builder { padding-right: 10px; padding-left: 10px; }.schedule-control { gap: 9px; }.control-index { width: 25px; height: 25px; }.control-value { font-size: 12px; }.control-hint { max-width: 145px; }.duration-select-wrap { width: 118px; }.duration-select-wrap :deep(.uni-select__input-box) { padding: 0 7px; }.duration-select-wrap :deep(.uni-select__selector-scroll) { height: 220px; max-height: 220px !important; }.custom-weeks-row { margin-left: 34px; padding: 9px; }.custom-weeks-hint { display: none; }.custom-weeks-input-wrap { width: 104px; }.week-panel { padding: 15px; }.day-detail { padding-left: 13px; }.caregiver-guide { margin: 0 15px 15px; } }
</style>
