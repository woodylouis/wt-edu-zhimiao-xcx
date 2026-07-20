<template>
  <view class="approval-page">
    <view class="page-orb orb-yellow"></view>
    <view class="page-orb orb-purple"></view>

    <u-sticky>
      <custom-nav
        :needBack="true"
        :needBar="false"
        :xcxName="'入班审批'"
        navCustomStyle="background: linear-gradient(135deg, #FFF4BF 0%, #FFD880 48%, #FFB7B0 100%);height: calc(100vh / 8);"
      />
    </u-sticky>

    <view class="page-content">
      <view class="approval-hero">
        <view>
          <text class="hero-kicker">SCHOOL APPROVAL</text>
          <text class="hero-title">老师入班申请</text>
          <text class="hero-subtitle">班主任处理本班，学校负责人处理本校申请</text>
        </view>
        <view class="pending-bubble">
          <text class="bubble-count">{{ summary.pending || 0 }}</text>
          <text class="bubble-label">待处理</text>
        </view>
      </view>

      <view class="status-tabs">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="status-tab"
          :class="{ 'status-tab--active': activeStatus === tab.key }"
          @click="changeStatus(tab.key)"
        >
          <text>{{ tab.text }}</text>
          <view v-if="tab.count" class="tab-count">{{ tab.count }}</view>
        </view>
      </view>

      <view v-if="!loading && !canReview" class="empty-state">
        <view class="empty-icon">🔒</view>
        <text class="empty-title">暂无审批权限</text>
        <text class="empty-copy">只有班主任或学校负责人可以处理入班申请</text>
      </view>

      <view v-else-if="!loading && approvals.length === 0" class="empty-state">
        <view class="empty-icon">{{ activeStatus === 'pending' ? '🌱' : '📚' }}</view>
        <text class="empty-title">{{ activeStatus === 'pending' ? '暂时没有待审批申请' : '暂无已处理记录' }}</text>
        <text class="empty-copy">{{ activeStatus === 'pending' ? '有新的老师申请时会显示在这里' : '完成审批后可在这里回看记录' }}</text>
      </view>

      <view v-else class="approval-list">
        <view v-for="item in approvals" :key="item._id" class="approval-card">
          <view class="card-head">
            <view class="applicant-avatar">{{ firstChar(item.applicant_name) }}</view>
            <view class="applicant-info">
              <view class="applicant-name-row">
                <text class="applicant-name">{{ item.applicant_name || '未设置昵称' }}</text>
                <view class="role-chip">老师</view>
              </view>
              <text class="apply-time">{{ formatTime(item.apply_time) }}</text>
            </view>
            <view class="status-chip" :class="'status-chip--' + item.status">
              {{ statusText(item.status) }}
            </view>
          </view>

          <view class="target-panel">
            <view class="target-row">
              <text class="target-label">学校</text>
              <text class="target-value">{{ item.school_name }}</text>
            </view>
            <view class="target-row">
              <text class="target-label">班级</text>
              <text class="target-value">{{ item.class_name }} · {{ item.class_code }}</text>
            </view>
            <view class="target-row">
              <text class="target-label">手机</text>
              <text class="target-value">{{ item.applicant_mobile || '未绑定' }}</text>
            </view>
          </view>

          <view v-if="item.status === 'pending'" class="card-actions">
            <button
              class="action-button action-button--reject"
              :disabled="reviewingId === item._id"
              @click="review(item, 'reject')"
            >
              拒绝
            </button>
            <button
              class="action-button action-button--approve"
              :loading="reviewingId === item._id"
              :disabled="reviewingId === item._id"
              @click="review(item, 'approve')"
            >
              通过
            </button>
          </view>

          <view v-else class="review-result">
            <view class="review-line">
              <text>审批人</text>
              <text>{{ item.reviewer_name || '管理员' }}</text>
            </view>
            <view class="review-line">
              <text>审批时间</text>
              <text>{{ formatTime(item.review_time) }}</text>
            </view>
            <view v-if="item.review_remark" class="review-remark">
              {{ item.review_remark }}
            </view>
          </view>
        </view>
      </view>
    </view>

    <dopamine-loading
      :show="loading"
      text="正在加载审批"
      subtext="小芽正在核对学校与班级信息"
    />
  </view>
</template>

<script>
import DopamineLoading from "@/components/dopamine-loading/index.vue"

export default {
  components: {
    DopamineLoading
  },
  data() {
    return {
      activeStatus: 'pending',
      approvals: [],
      summary: {
        pending: 0,
        approved: 0,
        rejected: 0
      },
      canReview: true,
      loading: false,
      reviewingId: ''
    }
  },
  computed: {
    tabs() {
      return [
        { key: 'pending', text: '待审批', count: this.summary.pending },
        {
          key: 'processed',
          text: '已处理',
          count: Number(this.summary.approved || 0) + Number(this.summary.rejected || 0)
        }
      ]
    }
  },
  onShow() {
    this.loadPage()
  },
  onPullDownRefresh() {
    this.loadPage().finally(() => uni.stopPullDownRefresh())
  },
  methods: {
    async callApproval(data) {
      const { result } = await uniCloud.callFunction({
        name: 'wtdb-class-approval',
        data: {
          ...data,
          uniIdToken: uni.getStorageSync('uni_id_token')
        }
      })
      return result
    },
    async loadPage() {
      if (this.loading) return
      this.loading = true
      try {
        const summaryRes = await this.callApproval({ action: 'summary' })
        if (summaryRes.code !== 200) throw new Error(summaryRes.msg || '审批信息加载失败')
        this.summary = summaryRes.data || this.summary
        this.canReview = !!summaryRes.data?.canReview
        if (!this.canReview) {
          this.approvals = []
          return
        }

        const listRes = await this.callApproval({
          action: 'list',
          status: this.activeStatus,
          page: 1,
          pageSize: 50
        })
        if (listRes.code !== 200) throw new Error(listRes.msg || '审批列表加载失败')
        this.approvals = listRes.data?.list || []
      } catch (error) {
        uni.showToast({
          title: error.message || '审批信息加载失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },
    changeStatus(status) {
      if (status === this.activeStatus) return
      this.activeStatus = status
      this.loadPage()
    },
    review(item, decision) {
      const isReject = decision === 'reject'
      uni.showModal({
        title: isReject ? '拒绝这条申请？' : '确认通过申请？',
        content: isReject
          ? ''
          : `通过后，${item.applicant_name} 将成为「${item.class_name}」的老师。`,
        editable: isReject,
        placeholderText: isReject ? '请填写拒绝原因' : '',
        confirmText: isReject ? '确认拒绝' : '确认通过',
        confirmColor: isReject ? '#e85d75' : '#24a866',
        success: async modalRes => {
          if (!modalRes.confirm) return
          const remark = String(modalRes.content || '').trim()
          if (isReject && !remark) {
            uni.showToast({ title: '请填写拒绝原因', icon: 'none' })
            return
          }
          await this.submitReview(item, decision, remark)
        }
      })
    },
    async submitReview(item, decision, remark) {
      this.reviewingId = item._id
      try {
        const result = await this.callApproval({
          action: 'review',
          approvalId: item._id,
          decision,
          remark
        })
        if (result.code !== 200) throw new Error(result.msg || '审批失败')
        uni.showToast({
          title: decision === 'approve' ? '已通过申请' : '已拒绝申请',
          icon: 'success'
        })
        await this.loadPage()
      } catch (error) {
        uni.showToast({ title: error.message || '审批失败', icon: 'none' })
      } finally {
        this.reviewingId = ''
      }
    },
    statusText(status) {
      return {
        pending: '待审批',
        approved: '已通过',
        rejected: '已拒绝'
      }[status] || status
    },
    firstChar(value) {
      return String(value || '师').charAt(0)
    },
    formatTime(value) {
      if (!value) return '-'
      const date = new Date(Number(value))
      const pad = number => String(number).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    }
  }
}
</script>

<style lang="scss" scoped>
.approval-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: linear-gradient(180deg, #fff8df 0%, #f7f5ff 42%, #f2fbf6 100%);
  color: #302852;
}

.page-orb {
  position: fixed;
  border-radius: 50%;
  pointer-events: none;
}

.orb-yellow {
  width: 260rpx;
  height: 260rpx;
  top: 260rpx;
  right: -150rpx;
  background: rgba(255, 209, 70, 0.18);
}

.orb-purple {
  width: 230rpx;
  height: 230rpx;
  left: -150rpx;
  bottom: 120rpx;
  background: rgba(123, 97, 255, 0.12);
}

.page-content {
  position: relative;
  z-index: 1;
  padding: 28rpx 28rpx calc(48rpx + env(safe-area-inset-bottom));
}

.approval-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 34rpx;
  border: 4rpx solid #302852;
  border-radius: 32rpx;
  background: linear-gradient(135deg, #7b61ff 0%, #9b72ff 62%, #ef81b7 100%);
  box-shadow: 9rpx 10rpx 0 #ffd146;
  color: #fff;
}

.hero-kicker,
.hero-title,
.hero-subtitle {
  display: block;
}

.hero-kicker {
  font-size: 18rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
  opacity: 0.8;
}

.hero-title {
  margin-top: 10rpx;
  font-size: 39rpx;
  font-weight: 900;
}

.hero-subtitle {
  margin-top: 8rpx;
  font-size: 22rpx;
  opacity: 0.88;
}

.pending-bubble {
  display: flex;
  width: 112rpx;
  height: 112rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 4rpx solid #302852;
  border-radius: 50%;
  background: #fff8dc;
  color: #302852;
  box-shadow: 5rpx 6rpx 0 rgba(48, 40, 82, 0.28);
}

.bubble-count {
  font-size: 38rpx;
  font-weight: 900;
  line-height: 1;
}

.bubble-label {
  margin-top: 7rpx;
  font-size: 18rpx;
}

.status-tabs {
  display: flex;
  margin-top: 34rpx;
  padding: 7rpx;
  border: 3rpx solid #ddd5f4;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.9);
}

.status-tab {
  display: flex;
  min-height: 72rpx;
  flex: 1;
  align-items: center;
  justify-content: center;
  border-radius: 17rpx;
  color: #766f89;
  font-size: 26rpx;
  font-weight: 700;
}

.status-tab--active {
  background: #302852;
  color: #fff;
  box-shadow: 0 5rpx 14rpx rgba(48, 40, 82, 0.2);
}

.tab-count {
  min-width: 33rpx;
  margin-left: 10rpx;
  padding: 3rpx 8rpx;
  border-radius: 18rpx;
  background: #ff706b;
  color: #fff;
  font-size: 18rpx;
  text-align: center;
}

.approval-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-top: 26rpx;
}

.approval-card {
  padding: 28rpx;
  border: 3rpx solid #e1daef;
  border-radius: 29rpx;
  background: #fff;
  box-shadow: 0 10rpx 30rpx rgba(67, 53, 112, 0.08);
}

.card-head {
  display: flex;
  align-items: center;
}

.applicant-avatar {
  display: flex;
  width: 76rpx;
  height: 76rpx;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 3rpx solid #302852;
  border-radius: 24rpx;
  background: #8fe1c4;
  color: #302852;
  font-size: 31rpx;
  font-weight: 900;
}

.applicant-info {
  min-width: 0;
  flex: 1;
  margin-left: 18rpx;
}

.applicant-name-row {
  display: flex;
  align-items: center;
}

.applicant-name {
  max-width: 240rpx;
  overflow: hidden;
  font-size: 31rpx;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-chip {
  margin-left: 10rpx;
  padding: 4rpx 11rpx;
  border-radius: 13rpx;
  background: #eee9ff;
  color: #6d55d9;
  font-size: 19rpx;
  font-weight: 700;
}

.apply-time {
  display: block;
  margin-top: 7rpx;
  color: #918aa1;
  font-size: 21rpx;
}

.status-chip {
  padding: 7rpx 13rpx;
  border-radius: 15rpx;
  font-size: 20rpx;
  font-weight: 800;
}

.status-chip--pending {
  background: #fff0bc;
  color: #a76800;
}

.status-chip--approved {
  background: #dff7e8;
  color: #16824c;
}

.status-chip--rejected {
  background: #ffe3e7;
  color: #c74259;
}

.target-panel {
  margin-top: 22rpx;
  padding: 18rpx 20rpx;
  border-radius: 20rpx;
  background: #f8f6fc;
}

.target-row {
  display: flex;
  align-items: center;
  padding: 7rpx 0;
  font-size: 23rpx;
}

.target-label {
  width: 74rpx;
  flex-shrink: 0;
  color: #938ca3;
}

.target-value {
  color: #403958;
  font-weight: 600;
}

.card-actions {
  display: flex;
  gap: 18rpx;
  margin-top: 22rpx;
}

.action-button {
  height: 76rpx;
  flex: 1;
  margin: 0;
  border-radius: 22rpx;
  font-size: 26rpx;
  font-weight: 800;
  line-height: 76rpx;
}

.action-button::after {
  border: none;
}

.action-button--reject {
  border: 3rpx solid #e85d75;
  background: #fff;
  color: #d84b65;
}

.action-button--approve {
  border: 3rpx solid #302852;
  background: #77dca4;
  color: #302852;
  box-shadow: 5rpx 6rpx 0 #302852;
}

.review-result {
  margin-top: 20rpx;
  padding-top: 18rpx;
  border-top: 2rpx dashed #ddd6ea;
}

.review-line {
  display: flex;
  justify-content: space-between;
  padding: 5rpx 0;
  color: #716a80;
  font-size: 22rpx;
}

.review-remark {
  margin-top: 10rpx;
  padding: 14rpx 16rpx;
  border-radius: 15rpx;
  background: #fff4f1;
  color: #8c5360;
  font-size: 22rpx;
  line-height: 1.5;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 28rpx;
  padding: 90rpx 36rpx;
  border: 3rpx dashed #d7cfea;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.72);
}

.empty-icon {
  font-size: 72rpx;
}

.empty-title {
  margin-top: 20rpx;
  font-size: 29rpx;
  font-weight: 800;
}

.empty-copy {
  margin-top: 10rpx;
  color: #8f879f;
  font-size: 22rpx;
  text-align: center;
}
</style>
