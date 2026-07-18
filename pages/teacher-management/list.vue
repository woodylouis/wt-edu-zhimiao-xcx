<template>
  <view class="teacher-page">
    <view class="page-orb orb-blue"></view>
    <view class="page-orb orb-green"></view>

    <u-sticky>
      <custom-nav
        :needBack="true"
        :needBar="false"
        :xcxName="'老师管理'"
        navCustomStyle="background: linear-gradient(135deg, #DDE9FF 0%, #AFCBFF 50%, #9BE0C5 100%);height: calc(100vh / 8);"
      />
    </u-sticky>

    <view class="page-content">
      <view class="teacher-hero">
        <view>
          <text class="hero-kicker">TEACHER TEAM</text>
          <text class="hero-title">老师任教管理</text>
          <text class="hero-subtitle">管理您负责学校内的老师</text>
        </view>
        <view class="teacher-count">
          <text class="count-value">{{ summary.teacherCount || 0 }}</text>
          <text class="count-label">位老师</text>
        </view>
      </view>

      <view class="search-panel">
        <view class="search-box">
          <text class="search-icon">⌕</text>
          <input
            v-model="keyword"
            class="search-input"
            type="text"
            confirm-type="search"
            placeholder="搜索老师姓名或手机号"
            @confirm="search"
          />
          <text v-if="keyword" class="clear-search" @click="clearSearch">×</text>
        </view>
        <view class="filter-row">
          <picker :range="schoolOptions" range-key="text" @change="handleSchoolPicker">
            <view class="filter-pill">
              <text>{{ selectedSchoolText }}</text>
              <text class="filter-arrow">⌄</text>
            </view>
          </picker>
          <picker :range="classOptions" range-key="text" @change="handleClassPicker">
            <view class="filter-pill">
              <text>{{ selectedClassText }}</text>
              <text class="filter-arrow">⌄</text>
            </view>
          </picker>
          <view class="search-button" @click="search">查询</view>
        </view>
      </view>

      <view class="list-heading">
        <view>
          <text class="list-title">任教关系</text>
          <text class="list-hint">移出班级不会删除账号和历史报告</text>
        </view>
        <text class="list-total">{{ total }} 条</text>
      </view>

      <view v-if="!loading && !canManage" class="empty-state">
        <view class="empty-icon">🔒</view>
        <text class="empty-title">暂无老师管理权限</text>
        <text class="empty-copy">只有学校负责人可以管理本校老师</text>
      </view>

      <view v-else-if="!loading && teachers.length === 0" class="empty-state">
        <view class="empty-icon">👩‍🏫</view>
        <text class="empty-title">暂无老师数据</text>
        <text class="empty-copy">审批老师入班后会显示在这里</text>
      </view>

      <view v-else class="teacher-list">
        <view v-for="item in teachers" :key="item.memberId" class="teacher-card">
          <view class="card-head">
            <image v-if="item.avatarUrl" :src="item.avatarUrl" class="teacher-avatar" mode="aspectFill" />
            <view v-else class="teacher-avatar teacher-avatar--placeholder">
              {{ firstChar(item.teacherName) }}
            </view>
            <view class="teacher-copy">
              <view class="teacher-name-row">
                <text class="teacher-name">{{ item.teacherName }}</text>
                <view v-if="item.isHeadTeacher" class="head-teacher-chip">班主任</view>
                <view class="source-chip" :class="'source-chip--' + item.joinSource">
                  {{ item.joinSource === 'approval' ? '审批加入' : '历史成员' }}
                </view>
              </view>
              <text class="teacher-mobile">{{ item.mobile || '未绑定手机号' }}</text>
            </view>
          </view>

          <view class="assignment-panel">
            <view class="assignment-row">
              <text class="assignment-label">学校</text>
              <text class="assignment-value">{{ item.schoolName }}</text>
            </view>
            <view class="assignment-row">
              <text class="assignment-label">班级</text>
              <text class="assignment-value">{{ item.className }} · {{ item.classCode }}</text>
            </view>
            <view class="assignment-row">
              <text class="assignment-label">加入</text>
              <text class="assignment-value">{{ formatTime(item.joinTime) }}</text>
            </view>
          </view>

          <view class="card-footer">
            <text class="scope-note">仅移除当前班级任教身份</text>
            <button
              class="remove-button"
              :loading="processingId === item.memberId"
              :disabled="processingId === item.memberId || item.isHeadTeacher"
              @click="confirmRemove(item)"
            >
              {{ item.isHeadTeacher ? '需先更换班主任' : '移出班级' }}
            </button>
          </view>
        </view>

        <view v-if="teachers.length < total" class="load-more" @click="loadMore">
          {{ loadingMore ? '加载中...' : '加载更多' }}
        </view>
      </view>
    </view>

    <dopamine-loading
      :show="loading"
      text="正在整理老师名单"
      subtext="小芽正在核对学校和任教班级"
    />
  </view>
</template>

<script>
import DopamineLoading from '@/components/dopamine-loading/index.vue'

export default {
  components: {
    DopamineLoading
  },
  data() {
    return {
      summary: {
        teacherCount: 0,
        assignmentCount: 0,
        schools: [],
        classes: []
      },
      canManage: true,
      teachers: [],
      keyword: '',
      schoolId: '',
      classId: '',
      page: 1,
      pageSize: 20,
      total: 0,
      loading: false,
      loadingMore: false,
      processingId: ''
    }
  },
  computed: {
    schoolOptions() {
      return [
        { value: '', text: '全部学校' },
        ...(this.summary.schools || []).map(item => ({
          value: item.schoolId,
          text: item.schoolName
        }))
      ]
    },
    classOptions() {
      const classes = (this.summary.classes || []).filter(item => {
        return !this.schoolId || item.schoolId === this.schoolId
      })
      return [
        { value: '', text: '全部班级' },
        ...classes.map(item => ({
          value: item.classId,
          text: item.classCode ? `${item.className} · ${item.classCode}` : item.className
        }))
      ]
    },
    selectedSchoolText() {
      const item = this.schoolOptions.find(option => option.value === this.schoolId)
      return item?.text || '全部学校'
    },
    selectedClassText() {
      const item = this.classOptions.find(option => option.value === this.classId)
      return item?.text || '全部班级'
    }
  },
  onShow() {
    this.loadPage()
  },
  onPullDownRefresh() {
    this.loadPage().finally(() => uni.stopPullDownRefresh())
  },
  methods: {
    async callTeacherManagement(data) {
      const { result } = await uniCloud.callFunction({
        name: 'wtdb-teacher-management',
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
        const summaryRes = await this.callTeacherManagement({ action: 'summary' })
        if (summaryRes.code !== 200) throw new Error(summaryRes.msg || '老师信息加载失败')
        this.summary = summaryRes.data || this.summary
        this.canManage = !!summaryRes.data?.canManage
        if (!this.canManage) {
          this.teachers = []
          this.total = 0
          return
        }
        this.page = 1
        await this.loadList(false)
      } catch (error) {
        uni.showToast({ title: error.message || '老师信息加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async loadList(append) {
      const result = await this.callTeacherManagement({
        action: 'list',
        schoolId: this.schoolId,
        classId: this.classId,
        keyword: this.keyword.trim(),
        page: this.page,
        pageSize: this.pageSize
      })
      if (result.code !== 200) throw new Error(result.msg || '老师列表加载失败')
      const list = result.data?.list || []
      this.teachers = append ? [...this.teachers, ...list] : list
      this.total = result.data?.total || 0
    },
    handleSchoolPicker(event) {
      const option = this.schoolOptions[Number(event.detail.value)] || this.schoolOptions[0]
      this.schoolId = option.value
      const currentClass = (this.summary.classes || []).find(item => item.classId === this.classId)
      if (currentClass && currentClass.schoolId !== this.schoolId) this.classId = ''
      this.search()
    },
    handleClassPicker(event) {
      const option = this.classOptions[Number(event.detail.value)] || this.classOptions[0]
      this.classId = option.value
      this.search()
    },
    async search() {
      if (this.loading) return
      this.loading = true
      this.page = 1
      try {
        await this.loadList(false)
      } catch (error) {
        uni.showToast({ title: error.message || '查询失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    clearSearch() {
      this.keyword = ''
      this.search()
    },
    async loadMore() {
      if (this.loadingMore || this.teachers.length >= this.total) return
      this.loadingMore = true
      this.page += 1
      try {
        await this.loadList(true)
      } catch (error) {
        this.page -= 1
        uni.showToast({ title: error.message || '加载失败', icon: 'none' })
      } finally {
        this.loadingMore = false
      }
    },
    confirmRemove(item) {
      uni.showModal({
        title: '将老师移出班级？',
        content: `移出后，${item.teacherName} 将不能再进入“${item.className}”进行评估。账号和历史报告会保留。`,
        editable: true,
        placeholderText: '请填写移出原因',
        confirmText: '确认移出',
        confirmColor: '#e85d75',
        success: async modalRes => {
          if (!modalRes.confirm) return
          const reason = String(modalRes.content || '').trim()
          if (!reason) {
            uni.showToast({ title: '请填写移出原因', icon: 'none' })
            return
          }
          await this.removeTeacher(item, reason)
        }
      })
    },
    async removeTeacher(item, reason) {
      this.processingId = item.memberId
      try {
        const result = await this.callTeacherManagement({
          action: 'remove',
          memberId: item.memberId,
          reason
        })
        if (result.code !== 200) throw new Error(result.msg || '移出失败')
        uni.showToast({ title: '已移出班级', icon: 'success' })
        await this.loadPage()
      } catch (error) {
        uni.showToast({ title: error.message || '移出失败', icon: 'none' })
      } finally {
        this.processingId = ''
      }
    },
    firstChar(value) {
      return String(value || '师').charAt(0)
    },
    formatTime(value) {
      if (!value) return '-'
      const date = new Date(Number(value))
      const pad = number => String(number).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    }
  }
}
</script>

<style lang="scss" scoped>
.teacher-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: linear-gradient(180deg, #f0f5ff 0%, #f8fbff 42%, #f1faf6 100%);
  color: #302852;
}

.page-orb {
  position: fixed;
  border-radius: 50%;
  pointer-events: none;
}

.orb-blue {
  width: 260rpx;
  height: 260rpx;
  top: 260rpx;
  right: -160rpx;
  background: rgba(78, 135, 232, 0.13);
}

.orb-green {
  width: 230rpx;
  height: 230rpx;
  left: -150rpx;
  bottom: 100rpx;
  background: rgba(36, 168, 102, 0.11);
}

.page-content {
  position: relative;
  z-index: 1;
  padding: 28rpx 28rpx calc(48rpx + env(safe-area-inset-bottom));
}

.teacher-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 34rpx;
  border: 4rpx solid #302852;
  border-radius: 32rpx;
  background: linear-gradient(135deg, #4e87e8 0%, #72a2ef 56%, #69c79e 100%);
  box-shadow: 9rpx 10rpx 0 #a9c5f5;
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
  opacity: 0.82;
}

.hero-title {
  margin-top: 10rpx;
  font-size: 39rpx;
  font-weight: 900;
}

.hero-subtitle {
  margin-top: 8rpx;
  font-size: 22rpx;
  opacity: 0.9;
}

.teacher-count {
  display: flex;
  width: 112rpx;
  height: 112rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 4rpx solid #302852;
  border-radius: 50%;
  background: #f8fbff;
  color: #302852;
  box-shadow: 5rpx 6rpx 0 rgba(48, 40, 82, 0.25);
}

.count-value {
  font-size: 38rpx;
  font-weight: 900;
  line-height: 1;
}

.count-label {
  margin-top: 7rpx;
  font-size: 18rpx;
}

.search-panel {
  margin-top: 34rpx;
  padding: 22rpx;
  border: 3rpx solid #d9e2f5;
  border-radius: 26rpx;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 10rpx 26rpx rgba(66, 91, 135, 0.08);
}

.search-box {
  display: flex;
  height: 76rpx;
  align-items: center;
  padding: 0 22rpx;
  border: 3rpx solid #302852;
  border-radius: 20rpx;
  background: #f8faff;
}

.search-icon {
  color: #4e87e8;
  font-size: 34rpx;
  font-weight: 800;
}

.search-input {
  min-width: 0;
  flex: 1;
  margin-left: 14rpx;
  font-size: 24rpx;
}

.clear-search {
  padding: 10rpx;
  color: #8a849a;
  font-size: 32rpx;
}

.filter-row {
  display: flex;
  align-items: center;
  margin-top: 18rpx;
  gap: 12rpx;
}

.filter-row picker {
  min-width: 0;
  flex: 1;
}

.filter-pill {
  display: flex;
  height: 62rpx;
  align-items: center;
  justify-content: space-between;
  padding: 0 17rpx;
  overflow: hidden;
  border: 2rpx solid #d6def0;
  border-radius: 17rpx;
  color: #625c73;
  font-size: 21rpx;
  white-space: nowrap;
}

.filter-pill > text:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
}

.filter-arrow {
  margin-left: 8rpx;
  color: #4e87e8;
}

.search-button {
  display: flex;
  height: 62rpx;
  align-items: center;
  justify-content: center;
  padding: 0 24rpx;
  border: 3rpx solid #302852;
  border-radius: 17rpx;
  background: #4e87e8;
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
}

.list-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin: 34rpx 4rpx 18rpx;
}

.list-title,
.list-hint {
  display: block;
}

.list-title {
  font-size: 30rpx;
  font-weight: 850;
}

.list-hint {
  margin-top: 6rpx;
  color: #817a91;
  font-size: 19rpx;
}

.list-total {
  color: #817a91;
  font-size: 21rpx;
}

.teacher-list {
  display: flex;
  flex-direction: column;
  gap: 22rpx;
}

.teacher-card {
  padding: 27rpx;
  border: 3rpx solid #302852;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 7rpx 8rpx 0 #c4d8f7;
}

.card-head {
  display: flex;
  align-items: center;
}

.teacher-avatar {
  width: 82rpx;
  height: 82rpx;
  flex-shrink: 0;
  border: 3rpx solid #302852;
  border-radius: 24rpx;
}

.teacher-avatar--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #dce9ff;
  color: #345fa7;
  font-size: 31rpx;
  font-weight: 900;
}

.teacher-copy {
  min-width: 0;
  flex: 1;
  margin-left: 19rpx;
}

.teacher-name-row {
  display: flex;
  align-items: center;
}

.teacher-name {
  max-width: 260rpx;
  overflow: hidden;
  font-size: 29rpx;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.head-teacher-chip {
  flex-shrink: 0;
  margin-left: 10rpx;
  padding: 4rpx 10rpx;
  border-radius: 10rpx;
  background: #fff0bd;
  color: #8a5a00;
  font-size: 18rpx;
  font-weight: 750;
}

.source-chip {
  margin-left: 12rpx;
  padding: 5rpx 11rpx;
  border-radius: 16rpx;
  font-size: 18rpx;
}

.source-chip--approval {
  background: #dcf5e9;
  color: #238653;
}

.source-chip--legacy {
  background: #eef0f4;
  color: #777d87;
}

.teacher-mobile {
  display: block;
  margin-top: 8rpx;
  color: #827b91;
  font-size: 21rpx;
}

.assignment-panel {
  margin-top: 22rpx;
  padding: 19rpx 21rpx;
  border-radius: 20rpx;
  background: #f2f6fd;
}

.assignment-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  font-size: 22rpx;
  line-height: 1.55;
}

.assignment-row + .assignment-row {
  margin-top: 8rpx;
}

.assignment-label {
  flex-shrink: 0;
  color: #8a8497;
}

.assignment-value {
  margin-left: 24rpx;
  color: #3d3752;
  font-weight: 600;
  text-align: right;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 21rpx;
}

.scope-note {
  color: #928b9f;
  font-size: 19rpx;
}

.remove-button {
  height: 62rpx;
  margin: 0;
  padding: 0 24rpx;
  border: 3rpx solid #302852;
  border-radius: 18rpx;
  background: #fff0f2;
  color: #c64c5d;
  font-size: 21rpx;
  font-weight: 750;
  line-height: 56rpx;
}

.remove-button::after {
  border: none;
}

.load-more {
  padding: 26rpx;
  color: #4e87e8;
  font-size: 23rpx;
  font-weight: 700;
  text-align: center;
}

.empty-state {
  display: flex;
  min-height: 410rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #777082;
}

.empty-icon {
  font-size: 82rpx;
}

.empty-title {
  margin-top: 22rpx;
  color: #302852;
  font-size: 29rpx;
  font-weight: 800;
}

.empty-copy {
  margin-top: 10rpx;
  font-size: 21rpx;
}
</style>
