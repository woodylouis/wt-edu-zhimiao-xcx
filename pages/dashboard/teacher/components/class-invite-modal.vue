<template>
  <up-popup :show="visible" mode="bottom" :round="30" @close="close">
    <view class="invite-modal">
      <view class="invite-handle"></view>
      <view class="invite-heading">
        <view>
          <text class="invite-kicker">FAMILY INVITE</text>
          <text class="invite-title">邀请家长加入班级</text>
          <text class="invite-subtitle">家长用微信扫码即可直接进入小程序</text>
        </view>
        <view class="invite-close" @click="close">×</view>
      </view>

      <view class="class-card">
        <view class="class-icon">班</view>
        <view class="class-copy">
          <text class="class-name">{{ inviteData.className || classDisplay }}</text>
          <text class="class-code">班级码 {{ inviteData.classCode || classInfo.code || '--' }}</text>
        </view>
        <view class="copy-code" @click="copyClassCode">复制</view>
      </view>

      <view class="qr-stage">
        <view v-if="loading" class="qr-state">
          <view class="qr-spinner"></view>
          <text class="qr-state-title">正在生成小程序码</text>
          <text class="qr-state-copy">很快就可以分享给家长</text>
        </view>
        <view v-else-if="errorMessage" class="qr-state">
          <view class="qr-state-emoji">🌧️</view>
          <text class="qr-state-title">邀请码暂时没准备好</text>
          <text class="qr-state-copy">{{ errorMessage }}</text>
          <button class="retry-button" @click="loadInviteCode">重新生成</button>
        </view>
        <template v-else>
          <view class="qr-frame">
            <image class="qr-image" :src="inviteData.imageBase64" mode="aspectFit" />
            <view class="qr-sprout">🌱</view>
          </view>
          <text class="qr-tip">微信扫一扫 · 自动识别孩子 · 无需审批</text>
        </template>
      </view>

      <view class="invite-actions">
        <button
          class="invite-action invite-action--share"
          open-type="share"
          data-share-type="parent"
          :disabled="loading || Boolean(errorMessage)"
        >
          <text class="action-icon">↗</text>
          <text>分享小程序卡片</text>
        </button>
        <button
          class="invite-action invite-action--save"
          :disabled="loading || Boolean(errorMessage)"
          @click="saveCode"
        >
          <text class="action-icon">⇩</text>
          <text>保存邀请码</text>
        </button>
      </view>
      <view class="privacy-tip">
        <text>🛡️</text>
        <text>只有手机号与孩子资料匹配的家长才能加入</text>
      </view>
    </view>
  </up-popup>
</template>

<script>
export default {
  name: 'ClassInviteModal',
  props: {
    visible: { type: Boolean, default: false },
    classInfo: { type: Object, default: () => ({}) }
  },
  emits: ['close'],
  data() {
    return {
      loading: false,
      errorMessage: '',
      inviteData: {},
      loadedClassId: ''
    }
  },
  computed: {
    classDisplay() {
      if (this.classInfo.nickname) return this.classInfo.nickname
      if (this.classInfo.grade && this.classInfo.class) {
        return `${this.classInfo.grade}${this.classInfo.class}班`
      }
      return '当前班级'
    }
  },
  watch: {
    visible(value) {
      if (value) this.loadInviteCode()
    }
  },
  methods: {
    close() {
      this.$emit('close')
    },
    async loadInviteCode() {
      const classId = String(this.classInfo._id || this.classInfo.id || '')
      if (!classId || this.loading) return
      if (this.loadedClassId === classId && this.inviteData.imageBase64) return
      this.loading = true
      this.errorMessage = ''
      try {
        const { result } = await uniCloud.callFunction({
          name: 'wtdb-class-invite',
          data: {
            classId,
            uniIdToken: uni.getStorageSync('uni_id_token')
          }
        })
        if (result?.code !== 200) throw new Error(result?.message || result?.msg || '生成邀请码失败')
        this.inviteData = result.data || {}
        this.loadedClassId = classId
      } catch (error) {
        console.error('班级邀请码生成失败:', error)
        this.errorMessage = error.message || '请稍后重试'
      } finally {
        this.loading = false
      }
    },
    copyClassCode() {
      const code = String(this.inviteData.classCode || this.classInfo.code || '')
      if (!code) return
      uni.setClipboardData({ data: code })
    },
    saveCode() {
      const image = this.inviteData.imageBase64 || ''
      if (!image) return
      // #ifdef MP-WEIXIN
      const base64 = image.replace(/^data:image\/\w+;base64,/, '')
      const filePath = `${wx.env.USER_DATA_PATH}/class-invite-${Date.now()}.png`
      wx.getFileSystemManager().writeFile({
        filePath,
        data: base64,
        encoding: 'base64',
        success: () => {
          uni.saveImageToPhotosAlbum({
            filePath,
            success: () => uni.showToast({ title: '已保存到相册', icon: 'success' }),
            fail: error => {
              if (String(error.errMsg || '').includes('auth deny')) {
                uni.showModal({
                  title: '需要相册权限',
                  content: '请在设置中允许保存图片后重试。',
                  success: result => result.confirm && uni.openSetting()
                })
              } else {
                uni.showToast({ title: '保存失败', icon: 'none' })
              }
            }
          })
        },
        fail: () => uni.showToast({ title: '保存失败', icon: 'none' })
      })
      // #endif
      // #ifndef MP-WEIXIN
      uni.showToast({ title: '请在微信小程序中保存', icon: 'none' })
      // #endif
    }
  }
}
</script>

<style lang="scss" scoped>
.invite-modal {
  padding: 18rpx 30rpx calc(34rpx + env(safe-area-inset-bottom));
  color: #31284f;
  border-top: 4rpx solid #392f59;
  background: linear-gradient(180deg, #fff8df 0%, #fff 52%, #f2efff 100%);
}

.invite-handle {
  width: 74rpx;
  height: 8rpx;
  margin: 0 auto 20rpx;
  border-radius: 999rpx;
  background: #c9c2d5;
}

.invite-heading,
.class-card,
.invite-actions,
.privacy-tip {
  display: flex;
  align-items: center;
}

.invite-heading {
  justify-content: space-between;
}

.invite-kicker,
.invite-title,
.invite-subtitle,
.class-name,
.class-code,
.qr-state-title,
.qr-state-copy,
.qr-tip {
  display: block;
}

.invite-kicker {
  color: #7c63e8;
  font-size: 18rpx;
  font-weight: 900;
  letter-spacing: 3rpx;
}

.invite-title {
  margin-top: 5rpx;
  font-size: 31rpx;
  font-weight: 900;
}

.invite-subtitle {
  margin-top: 5rpx;
  color: #7a7286;
  font-size: 20rpx;
  font-weight: 650;
}

.invite-close {
  display: flex;
  width: 54rpx;
  height: 54rpx;
  align-items: center;
  justify-content: center;
  border: 3rpx solid #392f59;
  border-radius: 18rpx;
  background: #fff;
  box-shadow: 3rpx 3rpx 0 #ffb6ad;
  font-size: 35rpx;
  font-weight: 900;
}

.class-card {
  margin-top: 22rpx;
  padding: 14rpx 16rpx;
  border: 3rpx solid #392f59;
  border-radius: 22rpx;
  background: #c9f4e6;
}

.class-icon {
  display: flex;
  width: 49rpx;
  height: 49rpx;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  margin-right: 12rpx;
  color: #fff;
  border: 3rpx solid #392f59;
  border-radius: 15rpx;
  background: #ff765f;
  font-size: 20rpx;
  font-weight: 900;
}

.class-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.class-name { font-size: 24rpx; font-weight: 900; }
.class-code { margin-top: 3rpx; color: #6e6679; font-size: 18rpx; font-weight: 700; }

.copy-code {
  padding: 7rpx 13rpx;
  border: 2rpx solid #392f59;
  border-radius: 999rpx;
  background: #fff;
  font-size: 18rpx;
  font-weight: 900;
}

.qr-stage {
  display: flex;
  min-height: 410rpx;
  align-items: center;
  justify-content: center;
  padding: 22rpx 0 10rpx;
  flex-direction: column;
}

.qr-frame {
  position: relative;
  width: 320rpx;
  height: 320rpx;
  padding: 15rpx;
  border: 4rpx solid #392f59;
  border-radius: 34rpx;
  background: #fff;
  box-shadow: 9rpx 9rpx 0 #ffd447;
  box-sizing: border-box;
}

.qr-image { width: 100%; height: 100%; border-radius: 23rpx; }

.qr-sprout {
  position: absolute;
  right: -21rpx;
  bottom: -19rpx;
  display: flex;
  width: 62rpx;
  height: 62rpx;
  align-items: center;
  justify-content: center;
  border: 3rpx solid #392f59;
  border-radius: 20rpx;
  background: #ffb6ad;
  font-size: 31rpx;
}

.qr-tip { margin-top: 25rpx; color: #6d6579; font-size: 19rpx; font-weight: 800; }

.qr-state { display: flex; align-items: center; padding: 30rpx; flex-direction: column; text-align: center; }
.qr-spinner { width: 65rpx; height: 65rpx; border: 8rpx solid #ded7f4; border-top-color: #7c63e8; border-radius: 50%; animation: spin 0.8s linear infinite; }
.qr-state-emoji { font-size: 64rpx; }
.qr-state-title { margin-top: 22rpx; font-size: 27rpx; font-weight: 900; }
.qr-state-copy { margin-top: 9rpx; color: #7c7487; font-size: 20rpx; font-weight: 650; }

.retry-button {
  height: 66rpx;
  margin-top: 20rpx;
  padding: 0 30rpx;
  color: #392f59;
  border: 3rpx solid #392f59;
  border-radius: 20rpx;
  background: #ffd447;
  font-size: 22rpx;
  font-weight: 900;
  line-height: 60rpx;
}

.retry-button::after,
.invite-action::after { border: 0; }

.invite-actions { gap: 16rpx; }

.invite-action {
  display: flex;
  flex: 1;
  height: 82rpx;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0 13rpx;
  color: #fff;
  border: 3rpx solid #392f59;
  border-radius: 24rpx;
  background: #7c63e8;
  box-shadow: 5rpx 5rpx 0 #ffd447;
  font-size: 21rpx;
  font-weight: 900;
  line-height: 1;
  gap: 7rpx;
}

.invite-action--save { color: #392f59; background: #c9f4e6; box-shadow: 5rpx 5rpx 0 #a58bff; }
.invite-action[disabled] { opacity: 0.48; }
.action-icon { font-size: 27rpx; }

.privacy-tip {
  justify-content: center;
  margin-top: 20rpx;
  color: #746c80;
  font-size: 19rpx;
  font-weight: 700;
  gap: 7rpx;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
