<template>
  <view v-if="visible" class="dopamine-loading" :class="{ 'with-mask': mask }">
    <view class="loading-card">
      <view class="loading-spark spark-left">+</view>
      <view class="loading-spark spark-right">✦</view>

      <view class="mascot-stage">
        <view class="orbit orbit-coral"></view>
        <view class="orbit orbit-purple"></view>
        <view class="mascot">
          <view class="leaf leaf-left"></view>
          <view class="leaf leaf-right"></view>
          <view class="mascot-eye eye-left"></view>
          <view class="mascot-eye eye-right"></view>
          <view class="mascot-smile"></view>
          <view class="mascot-cheek cheek-left"></view>
          <view class="mascot-cheek cheek-right"></view>
        </view>
        <view class="mascot-shadow"></view>
      </view>

      <text class="loading-title">{{ displayText }}</text>
      <text v-if="subtext" class="loading-subtitle">{{ subtext }}</text>
      <view class="loading-dots">
        <view class="loading-dot dot-one"></view>
        <view class="loading-dot dot-two"></view>
        <view class="loading-dot dot-three"></view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: "DopamineLoading",
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    text: {
      type: String,
      default: "正在努力加载",
    },
    subtext: {
      type: String,
      default: "小芽马上就好",
    },
    mask: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      internalShow: false,
      internalText: "",
    };
  },
  computed: {
    visible() {
      return this.show || this.internalShow;
    },
    displayText() {
      return this.internalText || this.text;
    },
  },
  methods: {
    open(options = {}) {
      this.internalText = options.text || "";
      this.internalShow = true;
    },
    close() {
      this.internalShow = false;
      this.internalText = "";
    },
  },
};
</script>

<style scoped lang="scss">
.dopamine-loading {
  position: fixed;
  z-index: 99999;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.with-mask {
  background: rgba(47, 40, 84, 0.46);
}

.loading-card {
  position: relative;
  display: flex;
  align-items: center;
  flex-direction: column;
  width: 330rpx;
  min-height: 340rpx;
  box-sizing: border-box;
  padding: 36rpx 28rpx 28rpx;
  border: 4rpx solid #2f2854;
  border-radius: 42rpx;
  background: #fff9e9;
  box-shadow: 11rpx 13rpx 0 #ffcf46;
}

.mascot-stage {
  position: relative;
  width: 190rpx;
  height: 176rpx;
}

.mascot {
  position: absolute;
  z-index: 3;
  width: 116rpx;
  height: 112rpx;
  top: 32rpx;
  left: 37rpx;
  box-sizing: border-box;
  border: 4rpx solid #2f2854;
  border-radius: 42% 42% 46% 46%;
  background: #8ee3c2;
  animation: mascot-hop 0.86s ease-in-out infinite;
}

.leaf {
  position: absolute;
  width: 44rpx;
  height: 27rpx;
  top: -25rpx;
  border: 4rpx solid #2f2854;
  background: #51c596;
}

.leaf-left {
  left: 22rpx;
  border-radius: 38rpx 5rpx 38rpx 5rpx;
  transform: rotate(28deg);
}

.leaf-right {
  right: 19rpx;
  border-radius: 5rpx 38rpx 5rpx 38rpx;
  transform: rotate(-27deg);
}

.mascot-eye {
  position: absolute;
  width: 9rpx;
  height: 13rpx;
  top: 43rpx;
  border-radius: 50%;
  background: #2f2854;
  animation: eye-blink 2.4s linear infinite;
}

.eye-left {
  left: 31rpx;
}

.eye-right {
  right: 31rpx;
}

.mascot-smile {
  position: absolute;
  width: 31rpx;
  height: 15rpx;
  left: 39rpx;
  top: 61rpx;
  border-bottom: 5rpx solid #2f2854;
  border-radius: 0 0 28rpx 28rpx;
}

.mascot-cheek {
  position: absolute;
  width: 15rpx;
  height: 8rpx;
  top: 66rpx;
  border-radius: 50%;
  background: #ff8e83;
}

.cheek-left {
  left: 15rpx;
}

.cheek-right {
  right: 15rpx;
}

.mascot-shadow {
  position: absolute;
  z-index: 1;
  width: 100rpx;
  height: 20rpx;
  left: 45rpx;
  bottom: 13rpx;
  border-radius: 50%;
  background: rgba(47, 40, 84, 0.18);
  animation: shadow-pulse 0.86s ease-in-out infinite;
}

.orbit {
  position: absolute;
  border: 3rpx solid #2f2854;
  border-radius: 50%;
  animation: orbit-float 1.5s ease-in-out infinite;
}

.orbit-coral {
  width: 33rpx;
  height: 33rpx;
  top: 22rpx;
  left: 2rpx;
  background: #ff7d6b;
}

.orbit-purple {
  width: 24rpx;
  height: 24rpx;
  top: 72rpx;
  right: 1rpx;
  background: #9f83ff;
  animation-delay: 0.4s;
}

.loading-spark {
  position: absolute;
  color: #7657f6;
  font-weight: 800;
  animation: sparkle 1.8s ease-in-out infinite;
}

.spark-left {
  top: 32rpx;
  left: 30rpx;
  font-size: 34rpx;
}

.spark-right {
  top: 47rpx;
  right: 29rpx;
  color: #ff7d6b;
  font-size: 29rpx;
  animation-delay: 0.6s;
}

.loading-title {
  margin-top: 4rpx;
  color: #2f2854;
  font-size: 29rpx;
  font-weight: 800;
  line-height: 1.3;
}

.loading-subtitle {
  margin-top: 9rpx;
  color: #918aa5;
  font-size: 20rpx;
  line-height: 1.3;
}

.loading-dots {
  display: flex;
  margin-top: 22rpx;
}

.loading-dot {
  width: 12rpx;
  height: 12rpx;
  margin: 0 6rpx;
  border: 2rpx solid #2f2854;
  border-radius: 50%;
  animation: dot-bounce 0.9s ease-in-out infinite;
}

.dot-one {
  background: #7657f6;
}

.dot-two {
  background: #ff7d6b;
  animation-delay: 0.15s;
}

.dot-three {
  background: #ffcf46;
  animation-delay: 0.3s;
}

@keyframes mascot-hop {
  0%,
  100% {
    transform: translateY(0) rotate(-2deg);
  }

  50% {
    transform: translateY(-18rpx) rotate(3deg);
  }
}

@keyframes shadow-pulse {
  0%,
  100% {
    transform: scaleX(1);
    opacity: 0.18;
  }

  50% {
    transform: scaleX(0.72);
    opacity: 0.1;
  }
}

@keyframes eye-blink {
  0%,
  45%,
  52%,
  100% {
    transform: scaleY(1);
  }

  48% {
    transform: scaleY(0.12);
  }
}

@keyframes orbit-float {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-12rpx);
  }
}

@keyframes sparkle {
  0%,
  100% {
    transform: scale(0.82) rotate(0deg);
    opacity: 0.65;
  }

  50% {
    transform: scale(1.18) rotate(15deg);
    opacity: 1;
  }
}

@keyframes dot-bounce {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-9rpx);
  }
}
</style>
