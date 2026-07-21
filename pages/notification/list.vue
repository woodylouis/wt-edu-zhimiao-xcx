<template>
  <view class="notification-page">
    <view class="orb orb--coral"></view>
    <view class="orb orb--mint"></view>
    <u-sticky>
      <custom-nav
        :needBack="true"
        :needBar="false"
        xcxName="班级通知"
        navCustomStyle="background: linear-gradient(135deg, #D8CDFF 0%, #A98CFF 48%, #FFB8AC 100%);height: calc(100vh / 8);"
      />
    </u-sticky>

    <view class="notification-hero">
      <view>
        <text class="hero-kicker">CLASS NEWS</text>
        <text class="hero-title">班级新动态</text>
        <text class="hero-subtitle">家长入班记录会通知本班所有老师</text>
      </view>
      <view class="hero-bell">🔔</view>
    </view>

    <view class="toolbar">
      <view class="unread-summary">
        <text class="unread-number">{{ unread }}</text>
        <text class="unread-label">条未读</text>
      </view>
      <view v-if="unread" class="read-all" @click="markAllRead">全部已读</view>
    </view>

    <view v-if="!loading && notifications.length" class="notification-list">
      <view
        v-for="item in notifications"
        :key="item._id"
        class="notification-card"
        :class="{ 'notification-card--unread': item.status === 'unread' }"
        @click="openNotification(item)"
      >
        <view class="notification-icon">
          <text>🎉</text>
          <view v-if="item.status === 'unread'" class="unread-dot"></view>
        </view>
        <view class="notification-copy">
          <view class="notification-topline">
            <text class="notification-title">{{ item.title }}</text>
            <text class="notification-time">{{ formatTime(item.create_time) }}</text>
          </view>
          <text class="notification-content">{{ item.content }}</text>
          <view class="notification-meta">
            <text class="meta-chip meta-chip--class">{{ item.class_name || '未命名班级' }}</text>
            <text v-if="item.actor_mobile_masked" class="meta-chip">{{ item.actor_mobile_masked }}</text>
          </view>
        </view>
        <text class="notification-arrow">›</text>
      </view>
      <view v-if="hasMore" class="load-more" @click="loadMore">加载更多</view>
      <view v-else class="list-end">这里就是全部通知啦 · 🌱</view>
    </view>

    <view v-else-if="!loading && !errorMessage" class="empty-card">
      <view class="empty-emoji">📬</view>
      <text class="empty-title">暂时还没有通知</text>
      <text class="empty-copy">当家长通过手机号匹配加入班级后，新动态会出现在这里。</text>
    </view>

    <view v-else-if="!loading" class="empty-card empty-card--error">
      <view class="empty-emoji">🌧️</view>
      <text class="empty-title">通知暂时没有加载出来</text>
      <text class="empty-copy">{{ errorMessage }}</text>
      <button class="retry-button" @click="refresh">重新加载</button>
    </view>

    <dopamine-loading :show="loading" text="正在整理班级通知" subtext="小芽正在收集最新动态" />
  </view>
</template>

<script>
import DopamineLoading from '@/components/dopamine-loading/index.vue'

export default {
  components: { DopamineLoading },
  data() {
    return {
      notifications: [],
      total: 0,
      unread: 0,
      pageNo: 1,
      pageSize: 20,
      loading: true,
      errorMessage: ''
    }
  },
  computed: {
    hasMore() {
      return this.notifications.length < this.total
    }
  },
  onLoad() {
    this.refresh()
  },
  onPullDownRefresh() {
    this.refresh().finally(() => uni.stopPullDownRefresh())
  },
  methods: {
    async callCenter(data) {
      const { result } = await uniCloud.callFunction({
        name: 'wtdb-notification-center',
        data: { ...data, uniIdToken: uni.getStorageSync('uni_id_token') }
      })
      if (result?.code !== 200) throw new Error(result?.message || result?.msg || '请求失败')
      return result.data || {}
    },
    async refresh() {
      this.loading = true
      this.errorMessage = ''
      this.pageNo = 1
      try {
        const [listData, summary] = await Promise.all([
          this.callCenter({ action: 'list', pageNo: 1, pageSize: this.pageSize }),
          this.callCenter({ action: 'summary' })
        ])
        this.notifications = listData.list || []
        this.total = listData.total || 0
        this.unread = summary.unread || 0
      } catch (error) {
        console.error('通知加载失败:', error)
        this.errorMessage = error.message || '请稍后重试'
      } finally {
        this.loading = false
      }
    },
    async loadMore() {
      if (this.loading || !this.hasMore) return
      this.loading = true
      try {
        const nextPage = this.pageNo + 1
        const data = await this.callCenter({ action: 'list', pageNo: nextPage, pageSize: this.pageSize })
        this.notifications.push(...(data.list || []))
        this.total = data.total || this.total
        this.pageNo = nextPage
      } catch (error) {
        uni.showToast({ title: error.message || '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async openNotification(item) {
      if (item.status === 'unread') {
        try {
          await this.callCenter({ action: 'read', notificationId: item._id })
          item.status = 'read'
          this.unread = Math.max(0, this.unread - 1)
        } catch (error) {
          uni.showToast({ title: error.message || '操作失败', icon: 'none' })
        }
      }
      uni.showModal({
        title: item.title,
        content: `${item.content}\n\n班级：${item.class_name || '-'}\n手机号：${item.actor_mobile_masked || '-'}\n时间：${this.formatTime(item.create_time, true)}`,
        showCancel: false,
        confirmText: '我知道了',
        confirmColor: '#7c63e8'
      })
    },
    async markAllRead() {
      try {
        await this.callCenter({ action: 'read-all' })
        this.notifications.forEach(item => { item.status = 'read' })
        this.unread = 0
        uni.showToast({ title: '已全部读取', icon: 'success' })
      } catch (error) {
        uni.showToast({ title: error.message || '操作失败', icon: 'none' })
      }
    },
    formatTime(value, detailed = false) {
      const date = new Date(Number(value))
      if (Number.isNaN(date.getTime())) return '-'
      const pad = number => String(number).padStart(2, '0')
      const today = new Date()
      const sameDay = date.toDateString() === today.toDateString()
      if (!detailed && sameDay) return `${pad(date.getHours())}:${pad(date.getMinutes())}`
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    }
  }
}
</script>

<style lang="scss" scoped>
.notification-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  padding-bottom: 90rpx;
  color: #31284f;
  background: linear-gradient(180deg, #f2edff 0%, #fff7ef 48%, #f1fbf7 100%);
}

.orb { position: fixed; z-index: 0; border: 4rpx solid #392f59; pointer-events: none; }
.orb--coral { top: 34%; left: -55rpx; width: 110rpx; height: 110rpx; border-radius: 50%; background: #ff8f82; box-shadow: 9rpx 9rpx 0 #ffd447; }
.orb--mint { right: -45rpx; bottom: 12%; width: 92rpx; height: 140rpx; border-radius: 50rpx; background: #79dfc2; transform: rotate(-12deg); }

.notification-hero,
.toolbar,
.notification-list,
.empty-card { position: relative; z-index: 1; margin-right: 30rpx; margin-left: 30rpx; }

.notification-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 30rpx;
  padding: 27rpx;
  border: 4rpx solid #392f59;
  border-radius: 32rpx;
  background: linear-gradient(135deg, #a58bff 0%, #ffb6ad 100%);
  box-shadow: 8rpx 8rpx 0 #ffd447;
}

.hero-kicker,
.hero-title,
.hero-subtitle,
.notification-title,
.notification-content,
.empty-title,
.empty-copy { display: block; }
.hero-kicker { color: #fff; font-size: 18rpx; font-weight: 900; letter-spacing: 3rpx; }
.hero-title { margin-top: 4rpx; font-size: 33rpx; font-weight: 900; }
.hero-subtitle { margin-top: 6rpx; color: #5e536f; font-size: 20rpx; font-weight: 700; }
.hero-bell { display: flex; width: 82rpx; height: 82rpx; align-items: center; justify-content: center; border: 4rpx solid #392f59; border-radius: 27rpx; background: #fff; box-shadow: 5rpx 5rpx 0 #79dfc2; font-size: 41rpx; }

.toolbar { display: flex; align-items: center; justify-content: space-between; margin-top: 31rpx; margin-bottom: 17rpx; }
.unread-summary { display: flex; align-items: baseline; gap: 7rpx; }
.unread-number { color: #7c63e8; font-size: 38rpx; font-weight: 900; }
.unread-label { color: #746b80; font-size: 22rpx; font-weight: 800; }
.read-all { padding: 9rpx 16rpx; color: #392f59; border: 3rpx solid #392f59; border-radius: 999rpx; background: #c9f4e6; font-size: 20rpx; font-weight: 900; }

.notification-card { display: flex; align-items: center; margin-bottom: 18rpx; padding: 20rpx; border: 3rpx solid #392f59; border-radius: 27rpx; background: rgba(255,255,255,.95); box-shadow: 5rpx 5rpx 0 #d7d0e4; }
.notification-card--unread { background: #fff9d9; box-shadow: 7rpx 7rpx 0 #a58bff; }
.notification-icon { position: relative; display: flex; width: 68rpx; height: 68rpx; flex-shrink: 0; align-items: center; justify-content: center; margin-right: 16rpx; border: 3rpx solid #392f59; border-radius: 21rpx; background: #ffb6ad; font-size: 33rpx; }
.unread-dot { position: absolute; top: -7rpx; right: -7rpx; width: 20rpx; height: 20rpx; border: 3rpx solid #392f59; border-radius: 50%; background: #ff4f55; }
.notification-copy { min-width: 0; flex: 1; }
.notification-topline { display: flex; align-items: baseline; justify-content: space-between; gap: 12rpx; }
.notification-title { overflow: hidden; font-size: 25rpx; font-weight: 900; text-overflow: ellipsis; white-space: nowrap; }
.notification-time { flex-shrink: 0; color: #91899a; font-size: 18rpx; font-weight: 700; }
.notification-content { margin-top: 7rpx; overflow: hidden; color: #706779; font-size: 21rpx; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.notification-meta { display: flex; margin-top: 10rpx; flex-wrap: wrap; gap: 8rpx; }
.meta-chip { padding: 5rpx 10rpx; color: #6e6579; border: 2rpx solid #b9b1c4; border-radius: 999rpx; background: #fff; font-size: 17rpx; font-weight: 800; }
.meta-chip--class { color: #256b5c; border-color: #57a994; background: #e1f8f0; }
.notification-arrow { margin-left: 8rpx; color: #7c63e8; font-size: 40rpx; font-weight: 900; }

.load-more,
.list-end { padding: 24rpx; color: #7a7285; font-size: 21rpx; font-weight: 800; text-align: center; }
.load-more { color: #7c63e8; text-decoration: underline; }

.empty-card { display: flex; align-items: center; margin-top: 45rpx; padding: 58rpx 32rpx; border: 4rpx solid #392f59; border-radius: 34rpx; background: #fff; box-shadow: 8rpx 8rpx 0 #79dfc2; flex-direction: column; text-align: center; }
.empty-card--error { box-shadow: 8rpx 8rpx 0 #ffb6ad; }
.empty-emoji { display: flex; width: 105rpx; height: 105rpx; align-items: center; justify-content: center; border: 4rpx solid #392f59; border-radius: 34rpx; background: #ffd447; font-size: 52rpx; }
.empty-title { margin-top: 25rpx; font-size: 29rpx; font-weight: 900; }
.empty-copy { margin-top: 11rpx; color: #7b7387; font-size: 21rpx; font-weight: 650; line-height: 1.65; }
.retry-button { height: 70rpx; margin-top: 24rpx; padding: 0 36rpx; color: #392f59; border: 3rpx solid #392f59; border-radius: 21rpx; background: #ffd447; font-size: 22rpx; font-weight: 900; line-height: 64rpx; }
.retry-button::after { border: 0; }
</style>
