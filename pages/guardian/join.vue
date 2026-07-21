<template>
  <view class="join-page">
    <view class="orb orb--yellow"></view>
    <view class="orb orb--purple"></view>
    <custom-nav
      :needBack="true"
      :needBar="false"
      xcxName="家长加入班级"
      navCustomStyle="background: linear-gradient(135deg, #FFF0AD 0%, #FFB6AD 52%, #A58BFF 100%);height: calc(100vh / 8);"
    />

    <view class="hero-card">
      <view class="hero-sticker">FAMILY LINK</view>
      <view class="hero-icon">🌱</view>
      <view class="hero-copy">
        <text class="hero-title">找到孩子的班级</text>
        <text class="hero-subtitle">用老师登记的手机号安全匹配，无需等待审批</text>
      </view>
    </view>

    <view class="content-card">
      <view v-if="!classCode" class="code-form">
        <view class="section-kicker">CLASS CODE</view>
        <view class="section-title">输入老师分享的班级码</view>
        <view class="code-input-wrap">
          <input
            v-model="manualCode"
            class="code-input"
            type="number"
            maxlength="12"
            placeholder="请输入班级码"
            placeholder-class="input-placeholder"
          />
          <button class="code-button" @click="useManualCode">开始匹配</button>
        </view>
      </view>

      <template v-else>
        <view class="class-strip">
          <view class="class-strip__icon">班</view>
          <view class="class-strip__copy">
            <text class="class-strip__label">{{ classInfo.nickname || '正在识别班级' }}</text>
            <text class="class-strip__code">班级码 {{ classInfo.code || classCode }}</text>
          </view>
          <view v-if="mobileMasked" class="mobile-chip">{{ mobileMasked }}</view>
        </view>

        <view v-if="state === 'login'" class="state-card">
          <view class="state-emoji">👋</view>
          <text class="state-title">登录后即可识别孩子</text>
          <text class="state-copy">我们只会使用你绑定的手机号与老师登记的信息进行匹配。</text>
          <button class="primary-button" @click="goLogin">微信快捷登录</button>
        </view>

        <view v-else-if="state === 'mobile'" class="state-card state-card--mobile">
          <view class="state-emoji">📱</view>
          <text class="state-title">还差一个手机号</text>
          <text class="state-copy">家长必须绑定本人手机号。绑定后会自动重新匹配，不需要老师审批。</text>
          <button class="primary-button primary-button--coral" @click="openBindMobile">绑定本人手机号</button>
        </view>

        <view v-else-if="state === 'empty'" class="state-card state-card--empty">
          <view class="state-emoji">🧩</view>
          <text class="state-title">还没有匹配到孩子</text>
          <text class="state-copy">请让老师在孩子资料中核对你的手机号，确认后再来试一次。</text>
          <button class="secondary-button" @click="lookup">重新匹配</button>
          <view class="change-code" @click="changeCode">换一个班级码</view>
        </view>

        <view v-else-if="state === 'error'" class="state-card state-card--error">
          <view class="state-emoji">🌧️</view>
          <text class="state-title">暂时没能完成匹配</text>
          <text class="state-copy">{{ errorMessage }}</text>
          <button class="secondary-button" @click="lookup">重试</button>
          <view class="change-code" @click="changeCode">换一个班级码</view>
        </view>

        <view v-else-if="state === 'ready'" class="match-section">
          <view class="match-heading">
            <view>
              <text class="section-kicker">MATCHED</text>
              <text class="section-title">请确认要绑定的孩子</text>
            </view>
            <text class="match-count">匹配到 {{ children.length }} 位</text>
          </view>
          <text class="match-tip">如果同一手机号登记了多个孩子，可以一次选择多个。</text>

          <view
            v-for="child in children"
            :key="child._id"
            class="child-card"
            :class="{
              'child-card--selected': selectedChildIds.includes(child._id),
              'child-card--bound': child.alreadyBound
            }"
            @click="toggleChild(child)"
          >
            <image v-if="child.avatar" class="child-avatar" :src="child.avatar" mode="aspectFill" />
            <view v-else class="child-avatar child-avatar--fallback">🌟</view>
            <view class="child-copy">
              <text class="child-name">{{ child.name }}</text>
              <text class="child-relation">我是孩子的{{ child.relationshipLabel }}</text>
            </view>
            <view v-if="child.alreadyBound" class="bound-badge">已绑定</view>
            <view v-else class="child-check">{{ selectedChildIds.includes(child._id) ? '✓' : '' }}</view>
          </view>

          <button
            v-if="unboundChildren.length"
            class="primary-button confirm-button"
            :disabled="!selectedChildIds.length || submitting"
            @click="confirmBinding"
          >
            {{ submitting ? '正在安全绑定' : `确认绑定 ${selectedChildIds.length} 个孩子` }}
          </button>
          <button v-else class="primary-button confirm-button" @click="enterReports(children[0])">
            进入孩子的成长报告
          </button>
          <text class="agreement-copy">点击确认表示你是上述孩子的合法监护人</text>
        </view>
      </template>
    </view>

    <dopamine-loading
      :show="state === 'loading' || submitting"
      :text="submitting ? '正在加入班级' : '正在安全匹配'"
      :subtext="submitting ? '小芽正在建立家庭与班级的连接' : '只核对当前班级与手机号'"
    />
    <uni-id-pages-bind-mobile ref="bindMobile" @success="handleBindMobileSuccess" />
  </view>
</template>

<script>
import DopamineLoading from '@/components/dopamine-loading/index.vue'
import { mutations } from '@/uni_modules/uni-id-pages/common/store.js'
import { CURRENT_CLASS } from '@/lib/types/local_storage.js'

export default {
  components: { DopamineLoading },
  data() {
    return {
      classCode: '',
      manualCode: '',
      classInfo: {},
      mobileMasked: '',
      children: [],
      selectedChildIds: [],
      state: 'loading',
      submitting: false,
      errorMessage: ''
    }
  },
  computed: {
    unboundChildren() {
      return this.children.filter(child => !child.alreadyBound)
    }
  },
  onLoad(options = {}) {
    const scene = options.scene ? decodeURIComponent(String(options.scene)) : ''
    this.classCode = String(options.classCode || options.code || scene || '').trim()
    this.manualCode = this.classCode
    if (!this.classCode) this.state = 'idle'
  },
  onShow() {
    if (!this.classCode) return
    if (!this.isLoggedIn()) {
      this.state = 'login'
      return
    }
    this.lookup()
  },
  methods: {
    isLoggedIn() {
      return Boolean(
        uni.getStorageSync('uni_id_token') &&
        uni.getStorageSync('uni_id_token_expired') > Date.now()
      )
    },
    async callBinding(data) {
      const { result } = await uniCloud.callFunction({
        name: 'wtdb-guardian-binding',
        data: {
          ...data,
          classCode: this.classCode,
          uniIdToken: uni.getStorageSync('uni_id_token')
        }
      })
      return result || {}
    },
    useManualCode() {
      const code = String(this.manualCode || '').trim()
      if (!code) {
        uni.showToast({ title: '请输入班级码', icon: 'none' })
        return
      }
      this.classCode = code
      if (!this.isLoggedIn()) this.state = 'login'
      else this.lookup()
    },
    changeCode() {
      this.classCode = ''
      this.manualCode = ''
      this.classInfo = {}
      this.children = []
      this.selectedChildIds = []
      this.state = 'idle'
    },
    goLogin() {
      const redirect = `/pages/guardian/join?classCode=${encodeURIComponent(this.classCode)}`
      uni.navigateTo({
        url: `/uni_modules/uni-id-pages/pages/login/login-withoutpwd?uniIdRedirectUrl=${encodeURIComponent(redirect)}`
      })
    },
    async lookup() {
      if (!this.isLoggedIn()) {
        this.state = 'login'
        return
      }
      this.state = 'loading'
      this.errorMessage = ''
      try {
        const result = await this.callBinding({ action: 'lookup' })
        if (result.code === 428) {
          this.state = 'mobile'
          return
        }
        if (result.code === 401) {
          this.state = 'login'
          return
        }
        if (result.code !== 200) throw new Error(result.message || result.msg || '匹配失败')
        this.classInfo = result.data?.classInfo || {}
        this.mobileMasked = result.data?.mobileMasked || ''
        this.children = Array.isArray(result.data?.children) ? result.data.children : []
        this.selectedChildIds = this.children
          .filter(child => !child.alreadyBound)
          .map(child => child._id)
        this.state = this.children.length ? 'ready' : 'empty'
      } catch (error) {
        console.error('家长匹配失败:', error)
        this.errorMessage = error.message || '请稍后重试'
        this.state = 'error'
      }
    },
    openBindMobile() {
      this.$refs.bindMobile.open()
    },
    async handleBindMobileSuccess() {
      await mutations.updateUserInfo()
      await this.lookup()
    },
    toggleChild(child) {
      if (child.alreadyBound) return
      const index = this.selectedChildIds.indexOf(child._id)
      if (index >= 0) this.selectedChildIds.splice(index, 1)
      else this.selectedChildIds.push(child._id)
    },
    async confirmBinding() {
      if (this.submitting || !this.selectedChildIds.length) return
      this.submitting = true
      const selectedChildIds = [...this.selectedChildIds]
      const boundResults = []
      try {
        for (const childId of selectedChildIds) {
          const result = await this.callBinding({ action: 'bind', childId })
          if (result.code !== 200) throw new Error(result.message || result.msg || '加入班级失败')
          boundResults.push(result.data)
        }
        this.applyBindingResults(boundResults)
        const first = boundResults[0]
        this.storeCurrentClass(first.classInfo, first.child, first.membership)
        uni.showModal({
          title: '🎉 加入成功',
          content: selectedChildIds.length > 1
            ? `已绑定 ${selectedChildIds.length} 个孩子，老师也收到通知了。`
            : '你已经加入班级，老师也收到通知了。',
          showCancel: false,
          confirmText: '查看成长报告',
          confirmColor: '#7c63e8',
          success: () => uni.redirectTo({ url: '/pages/assessment/list?role=parent' })
        })
      } catch (error) {
        console.error('家长绑定失败:', error)
        uni.showModal({
          title: '还差一点',
          content: error.message || '加入班级失败，请稍后重试。',
          showCancel: false
        })
        await this.lookup()
      } finally {
        this.submitting = false
      }
    },
    applyBindingResults(results = []) {
      const bindingsByChildId = new Map()
      results.forEach(data => {
        const childId = String(data?.child?._id || '')
        if (!childId) return
        bindingsByChildId.set(childId, data)
        if (data.classInfo) this.classInfo = data.classInfo
      })
      if (!bindingsByChildId.size) return

      this.children = this.children.map(child => {
        const binding = bindingsByChildId.get(String(child._id || ''))
        if (!binding) return child
        return {
          ...child,
          ...binding.child,
          alreadyBound: true,
          membershipId: binding.membership?._id || binding.child?.membershipId || child.membershipId || ''
        }
      })
      this.selectedChildIds = this.selectedChildIds.filter(childId =>
        !bindingsByChildId.has(String(childId))
      )
      this.state = this.children.length ? 'ready' : this.state
    },
    storeCurrentClass(classInfo, child, membership) {
      uni.setStorageSync(CURRENT_CLASS, {
        ...classInfo,
        memberRole: 'parent',
        memberNickname: membership?.nickname || '',
        memberId: membership?._id || child?.membershipId || '',
        childId: child?._id || '',
        childName: child?.name || '',
        childAvatar: child?.avatar || '',
        childBirthdate: child?.birthdate || null,
        relationship: membership?.relationship || child?.relationship || ''
      })
    },
    enterReports(child) {
      this.storeCurrentClass(this.classInfo, child, {
        _id: child.membershipId,
        relationship: child.relationship,
        nickname: ''
      })
      uni.redirectTo({ url: '/pages/assessment/list?role=parent' })
    }
  }
}
</script>

<style lang="scss" scoped>
.join-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  padding-bottom: 90rpx;
  color: #31284f;
  background: linear-gradient(180deg, #fff6ce 0%, #fff7f4 45%, #f3efff 100%);
  box-sizing: border-box;
}

.orb {
  position: fixed;
  z-index: 0;
  border: 4rpx solid #392f59;
  pointer-events: none;
}

.orb--yellow {
  top: 30%;
  left: -58rpx;
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: #ffd447;
  box-shadow: 10rpx 10rpx 0 #ff8f82;
}

.orb--purple {
  right: -44rpx;
  bottom: 13%;
  width: 92rpx;
  height: 142rpx;
  border-radius: 50rpx;
  background: #a58bff;
  transform: rotate(-13deg);
}

.hero-card,
.content-card {
  position: relative;
  z-index: 1;
  margin-right: 30rpx;
  margin-left: 30rpx;
  border: 4rpx solid #392f59;
}

.hero-card {
  display: flex;
  align-items: center;
  margin-top: 30rpx;
  padding: 28rpx;
  border-radius: 34rpx;
  background: linear-gradient(135deg, #ffb6ad, #ffd447);
  box-shadow: 9rpx 9rpx 0 #79dfc2;
}

.hero-sticker {
  position: absolute;
  top: -18rpx;
  right: 24rpx;
  padding: 6rpx 15rpx;
  color: #fff;
  border: 3rpx solid #392f59;
  border-radius: 999rpx;
  background: #7c63e8;
  font-size: 18rpx;
  font-weight: 900;
  transform: rotate(3deg);
}

.hero-icon {
  display: flex;
  width: 92rpx;
  height: 92rpx;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  margin-right: 22rpx;
  border: 4rpx solid #392f59;
  border-radius: 28rpx;
  background: #fff;
  box-shadow: 5rpx 5rpx 0 #a58bff;
  font-size: 48rpx;
}

.hero-copy,
.class-strip__copy,
.child-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.hero-title {
  font-size: 31rpx;
  font-weight: 900;
}

.hero-subtitle {
  margin-top: 7rpx;
  color: #61576f;
  font-size: 21rpx;
  font-weight: 700;
  line-height: 1.5;
}

.content-card {
  min-height: 440rpx;
  margin-top: 28rpx;
  padding: 26rpx;
  border-radius: 36rpx;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 9rpx 9rpx 0 #a58bff;
  box-sizing: border-box;
}

.section-kicker {
  display: block;
  color: #7c63e8;
  font-size: 19rpx;
  font-weight: 900;
  letter-spacing: 3rpx;
}

.section-title {
  display: block;
  margin-top: 6rpx;
  font-size: 29rpx;
  font-weight: 900;
}

.code-input-wrap {
  display: flex;
  align-items: center;
  margin-top: 28rpx;
  padding: 8rpx;
  border: 3rpx solid #392f59;
  border-radius: 26rpx;
  background: #fffaf0;
}

.code-input {
  flex: 1;
  min-width: 0;
  height: 76rpx;
  padding: 0 16rpx;
  font-size: 29rpx;
  font-weight: 900;
}

.input-placeholder {
  color: #a19aaa;
  font-weight: 650;
}

.code-button {
  height: 70rpx;
  margin: 0;
  padding: 0 19rpx;
  color: #fff;
  border: 3rpx solid #392f59;
  border-radius: 20rpx;
  background: #7c63e8;
  font-size: 22rpx;
  font-weight: 900;
  line-height: 64rpx;
}

.code-button::after,
.primary-button::after,
.secondary-button::after {
  border: 0;
}

.class-strip {
  display: flex;
  align-items: center;
  padding: 16rpx;
  border: 3rpx solid #392f59;
  border-radius: 24rpx;
  background: #c9f4e6;
}

.class-strip__icon {
  display: flex;
  width: 54rpx;
  height: 54rpx;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  margin-right: 13rpx;
  color: #fff;
  border: 3rpx solid #392f59;
  border-radius: 17rpx;
  background: #ff765f;
  font-size: 22rpx;
  font-weight: 900;
}

.class-strip__label {
  overflow: hidden;
  font-size: 25rpx;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.class-strip__code {
  margin-top: 3rpx;
  color: #6c6478;
  font-size: 19rpx;
  font-weight: 700;
}

.mobile-chip {
  flex-shrink: 0;
  margin-left: 10rpx;
  padding: 7rpx 11rpx;
  border: 2rpx solid #392f59;
  border-radius: 999rpx;
  background: #fff;
  font-size: 18rpx;
  font-weight: 900;
}

.state-card {
  display: flex;
  align-items: center;
  padding: 44rpx 12rpx 18rpx;
  flex-direction: column;
  text-align: center;
}

.state-emoji {
  display: flex;
  width: 104rpx;
  height: 104rpx;
  align-items: center;
  justify-content: center;
  border: 4rpx solid #392f59;
  border-radius: 34rpx;
  background: #ffd447;
  box-shadow: 7rpx 7rpx 0 #ffb6ad;
  font-size: 50rpx;
}

.state-card--mobile .state-emoji { background: #ffb6ad; box-shadow: 7rpx 7rpx 0 #a58bff; }
.state-card--empty .state-emoji { background: #a9d5ff; box-shadow: 7rpx 7rpx 0 #ffd447; }
.state-card--error .state-emoji { background: #eee9ff; box-shadow: 7rpx 7rpx 0 #ffb6ad; }

.state-title {
  margin-top: 27rpx;
  font-size: 30rpx;
  font-weight: 900;
}

.state-copy {
  max-width: 570rpx;
  margin-top: 12rpx;
  color: #756d82;
  font-size: 22rpx;
  font-weight: 650;
  line-height: 1.65;
}

.primary-button,
.secondary-button {
  width: 100%;
  height: 88rpx;
  margin: 30rpx 0 0;
  color: #fff;
  border: 4rpx solid #392f59;
  border-radius: 26rpx;
  background: #7c63e8;
  box-shadow: 7rpx 7rpx 0 #ffd447;
  font-size: 27rpx;
  font-weight: 900;
  line-height: 80rpx;
}

.primary-button--coral { background: #ff765f; box-shadow: 7rpx 7rpx 0 #a58bff; }

.primary-button[disabled] {
  color: #8a8493;
  border-color: #8a8493;
  background: #ddd8e6;
  box-shadow: 5rpx 5rpx 0 #c4bdcf;
}

.secondary-button {
  color: #392f59;
  background: #c9f4e6;
  box-shadow: 7rpx 7rpx 0 #a58bff;
}

.change-code {
  margin-top: 25rpx;
  color: #7c63e8;
  font-size: 22rpx;
  font-weight: 900;
  text-decoration: underline;
}

.match-section {
  margin-top: 28rpx;
}

.match-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14rpx;
}

.match-count {
  flex-shrink: 0;
  padding: 7rpx 12rpx;
  color: #392f59;
  border: 3rpx solid #392f59;
  border-radius: 999rpx;
  background: #ffd447;
  font-size: 18rpx;
  font-weight: 900;
}

.match-tip {
  display: block;
  margin-top: 10rpx;
  color: #7d7589;
  font-size: 20rpx;
  font-weight: 650;
  line-height: 1.5;
}

.child-card {
  display: flex;
  align-items: center;
  margin-top: 18rpx;
  padding: 18rpx;
  border: 3rpx solid #392f59;
  border-radius: 25rpx;
  background: #fff;
  box-shadow: 4rpx 4rpx 0 #d8d1e5;
}

.child-card--selected {
  background: #fff6c8;
  box-shadow: 6rpx 6rpx 0 #a58bff;
  transform: translate(-1rpx, -1rpx);
}

.child-card--bound {
  background: #effbf7;
}

.child-avatar {
  width: 74rpx;
  height: 74rpx;
  flex-shrink: 0;
  margin-right: 16rpx;
  border: 3rpx solid #392f59;
  border-radius: 23rpx;
  background: #eee9ff;
}

.child-avatar--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
}

.child-name {
  font-size: 27rpx;
  font-weight: 900;
}

.child-relation {
  margin-top: 5rpx;
  color: #7b7387;
  font-size: 20rpx;
  font-weight: 700;
}

.child-check {
  display: flex;
  width: 42rpx;
  height: 42rpx;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  margin-left: 12rpx;
  color: #fff;
  border: 3rpx solid #392f59;
  border-radius: 13rpx;
  background: #fff;
  font-size: 25rpx;
  font-weight: 900;
}

.child-card--selected .child-check { background: #7c63e8; }

.bound-badge {
  flex-shrink: 0;
  margin-left: 12rpx;
  padding: 7rpx 12rpx;
  color: #256b5c;
  border: 2rpx solid #256b5c;
  border-radius: 999rpx;
  background: #c9f4e6;
  font-size: 18rpx;
  font-weight: 900;
}

.confirm-button {
  margin-top: 28rpx;
}

.agreement-copy {
  display: block;
  margin-top: 18rpx;
  color: #8a8295;
  font-size: 19rpx;
  font-weight: 650;
  line-height: 1.5;
  text-align: center;
}
</style>
