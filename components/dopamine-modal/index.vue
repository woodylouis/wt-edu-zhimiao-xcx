<template>
  <up-overlay :show="show" :opacity="0.52" :z-index="10080">
    <view class="dopamine-modal-wrap">
      <view class="dopamine-modal-card">
        <view class="confetti confetti-coral"></view>
        <view class="confetti confetti-purple"></view>
        <view class="confetti confetti-mint"></view>

        <view class="modal-hero">
          <view class="hero-shape shape-left"></view>
          <view class="hero-shape shape-right"></view>
          <view class="mascot-card">
            <view class="mascot-leaf leaf-left"></view>
            <view class="mascot-leaf leaf-right"></view>
            <view class="mascot-face">
              <view class="face-eye"></view>
              <view class="face-eye"></view>
              <view class="face-smile"></view>
            </view>
          </view>
          <view class="hero-badge">GO</view>
        </view>

        <view class="modal-content">
          <text class="modal-eyebrow">{{ eyebrow }}</text>
          <text class="modal-title">{{ title }}</text>
          <text class="modal-description">{{ content }}</text>
        </view>

        <view class="modal-actions" :class="{ 'single-action': !showCancel }">
          <view
            v-if="showCancel"
            class="modal-btn cancel-btn"
            hover-class="cancel-pressed"
            :hover-stay-time="80"
            @tap="handleCancel"
          >
            {{ cancelText }}
          </view>
          <view
            class="modal-btn confirm-btn"
            hover-class="confirm-pressed"
            :hover-stay-time="80"
            @tap="handleConfirm"
          >
            <text>{{ confirmText }}</text>
            <view class="confirm-arrow">→</view>
          </view>
        </view>
      </view>
    </view>
  </up-overlay>
</template>

<script>
export default {
  name: "DopamineModal",
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    eyebrow: {
      type: String,
      default: "温馨提示",
    },
    title: {
      type: String,
      default: "确认继续吗？",
    },
    content: {
      type: String,
      default: "",
    },
    confirmText: {
      type: String,
      default: "确定",
    },
    cancelText: {
      type: String,
      default: "取消",
    },
    showCancel: {
      type: Boolean,
      default: true,
    },
  },
  methods: {
    handleConfirm() {
      this.$emit("confirm");
    },
    handleCancel() {
      this.$emit("cancel");
    },
  },
};
</script>

<style scoped lang="scss">
.dopamine-modal-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 38rpx;
}

.dopamine-modal-card {
  position: relative;
  width: 620rpx;
  max-width: 92vw;
  box-sizing: border-box;
  overflow: hidden;
  border: 4rpx solid #2f2854;
  border-radius: 42rpx;
  background: #fffdf8;
  box-shadow: 12rpx 14rpx 0 rgba(47, 40, 84, 0.56);
}

.modal-hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 220rpx;
  overflow: hidden;
  border-bottom: 3rpx solid #2f2854;
  background: linear-gradient(135deg, #ffdc69 0%, #ffbd5c 100%);
}

.hero-shape {
  position: absolute;
  border: 3rpx solid #2f2854;
  border-radius: 50%;
}

.shape-left {
  width: 106rpx;
  height: 106rpx;
  left: -35rpx;
  bottom: -28rpx;
  background: #ff7d6b;
}

.shape-right {
  width: 88rpx;
  height: 88rpx;
  top: -28rpx;
  right: 34rpx;
  background: #9f83ff;
}

.mascot-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 132rpx;
  height: 132rpx;
  border: 4rpx solid #2f2854;
  border-radius: 42rpx 42rpx 42rpx 15rpx;
  background: #8ee3c2;
  box-shadow: 8rpx 9rpx 0 #2f2854;
  transform: rotate(-4deg);
}

.mascot-leaf {
  position: absolute;
  width: 40rpx;
  height: 24rpx;
  top: -22rpx;
  border: 3rpx solid #2f2854;
  background: #54c89d;
}

.leaf-left {
  left: 28rpx;
  border-radius: 36rpx 5rpx 36rpx 5rpx;
  transform: rotate(26deg);
}

.leaf-right {
  right: 25rpx;
  border-radius: 5rpx 36rpx 5rpx 36rpx;
  transform: rotate(-24deg);
}

.mascot-face {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-around;
  width: 74rpx;
  height: 66rpx;
  box-sizing: border-box;
  padding: 0 15rpx 13rpx;
  border: 3rpx solid #2f2854;
  border-radius: 50%;
  background: #fffdf8;
}

.face-eye {
  width: 8rpx;
  height: 11rpx;
  border-radius: 50%;
  background: #2f2854;
}

.face-smile {
  position: absolute;
  width: 28rpx;
  height: 13rpx;
  left: 20rpx;
  bottom: 11rpx;
  border-bottom: 4rpx solid #2f2854;
  border-radius: 0 0 24rpx 24rpx;
}

.hero-badge {
  position: absolute;
  right: 166rpx;
  bottom: 26rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 58rpx;
  height: 58rpx;
  border: 3rpx solid #2f2854;
  border-radius: 50%;
  background: #7657f6;
  color: #ffffff;
  font-size: 19rpx;
  font-weight: 800;
  transform: rotate(9deg);
}

.confetti {
  position: absolute;
  z-index: 5;
}

.confetti-coral {
  width: 27rpx;
  height: 9rpx;
  top: 42rpx;
  left: 45rpx;
  border-radius: 8rpx;
  background: #ff7d6b;
  transform: rotate(30deg);
}

.confetti-purple {
  width: 18rpx;
  height: 18rpx;
  top: 38rpx;
  right: 44rpx;
  border: 3rpx solid #2f2854;
  border-radius: 50%;
  background: #9f83ff;
}

.confetti-mint {
  width: 10rpx;
  height: 32rpx;
  top: 148rpx;
  right: 68rpx;
  border-radius: 8rpx;
  background: #3ec99a;
  transform: rotate(22deg);
}

.modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 36rpx 46rpx 30rpx;
  text-align: center;
}

.modal-eyebrow {
  padding: 7rpx 17rpx;
  border-radius: 18rpx;
  background: #eee9ff;
  color: #7657f6;
  font-size: 19rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
  line-height: 1;
}

.modal-title {
  margin-top: 18rpx;
  color: #2f2854;
  font-size: 38rpx;
  font-weight: 800;
  line-height: 1.3;
}

.modal-description {
  margin-top: 16rpx;
  color: #858096;
  font-size: 25rpx;
  line-height: 1.65;
}

.modal-actions {
  display: flex;
  padding: 0 32rpx 36rpx;
}

.modal-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  box-sizing: border-box;
  border: 3rpx solid #2f2854;
  border-radius: 25rpx;
  font-size: 28rpx;
  font-weight: 700;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.cancel-btn {
  width: 184rpx;
  margin-right: 18rpx;
  background: #ffffff;
  color: #2f2854;
}

.confirm-btn {
  flex: 1;
  background: #7657f6;
  box-shadow: 6rpx 7rpx 0 #2f2854;
  color: #ffffff;
}

.single-action .confirm-btn {
  width: 100%;
}

.confirm-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32rpx;
  height: 32rpx;
  margin-left: 13rpx;
  border-radius: 50%;
  background: #ffffff;
  color: #7657f6;
  font-size: 22rpx;
  font-weight: 800;
}

.cancel-pressed {
  transform: scale(0.97);
  background: #f3efff;
}

.confirm-pressed {
  transform: translate(4rpx, 5rpx);
  box-shadow: 2rpx 2rpx 0 #2f2854;
}
</style>
