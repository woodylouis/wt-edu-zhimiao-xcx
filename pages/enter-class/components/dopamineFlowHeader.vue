<template>
  <view class="flow-hero" :class="`flow-hero--${tone}`">
    <view class="flow-confetti flow-confetti--one"></view>
    <view class="flow-confetti flow-confetti--two"></view>
    <view class="flow-confetti flow-confetti--three">✦</view>

    <view class="flow-hero__copy">
      <text class="flow-hero__eyebrow">{{ eyebrow }}</text>
      <text class="flow-hero__title">{{ title }}</text>
      <text class="flow-hero__subtitle">{{ subtitle }}</text>
      <view v-if="totalSteps > 1" class="flow-progress">
        <view
          v-for="index in totalSteps"
          :key="index"
          class="flow-progress__bar"
          :class="{ 'flow-progress__bar--active': index <= step }"
        ></view>
        <text class="flow-progress__text">{{ step }}/{{ totalSteps }}</text>
      </view>
    </view>

    <view class="flow-hero__sticker">
      <view class="sticker-spark">+</view>
      <view class="sticker-card">
        <view class="sticker-face">
          <view class="sticker-eye"></view>
          <view class="sticker-eye"></view>
          <view class="sticker-smile"></view>
        </view>
        <text class="sticker-label">{{ badge }}</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: "DopamineFlowHeader",
  props: {
    eyebrow: { type: String, default: "GROWTH JOURNEY" },
    title: { type: String, default: "加入成长班级" },
    subtitle: { type: String, default: "跟着小芽，一步一步完成" },
    badge: { type: String, default: "GO" },
    tone: { type: String, default: "yellow" },
    step: { type: Number, default: 1 },
    totalSteps: { type: Number, default: 2 },
  },
};
</script>

<style scoped lang="scss">
.flow-hero {
  position: relative;
  display: flex;
  min-height: 260rpx;
  box-sizing: border-box;
  overflow: hidden;
  padding: 34rpx 38rpx 48rpx;
  border-bottom: 4rpx solid #2f2854;
  background: linear-gradient(135deg, #ffde6f 0%, #ffc75f 100%);
  color: #2f2854;
}

.flow-hero--coral {
  background: linear-gradient(135deg, #ffb8ac 0%, #ff8f86 100%);
}

.flow-hero--purple {
  background: linear-gradient(135deg, #d8cdff 0%, #a98cff 100%);
}

.flow-hero--mint {
  background: linear-gradient(135deg, #bdf4dc 0%, #74d9b5 100%);
}

.flow-hero__copy {
  position: relative;
  z-index: 2;
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  padding-right: 24rpx;
}

.flow-hero__eyebrow {
  align-self: flex-start;
  padding: 7rpx 14rpx;
  border: 3rpx solid #2f2854;
  border-radius: 18rpx;
  background: rgba(255, 253, 248, 0.86);
  font-size: 18rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}

.flow-hero__title {
  margin-top: 16rpx;
  font-size: 42rpx;
  font-weight: 900;
  line-height: 1.18;
}

.flow-hero__subtitle {
  margin-top: 9rpx;
  color: rgba(47, 40, 84, 0.72);
  font-size: 22rpx;
  font-weight: 600;
  line-height: 1.4;
}

.flow-progress {
  display: flex;
  align-items: center;
  margin-top: 22rpx;
}

.flow-progress__bar {
  width: 50rpx;
  height: 10rpx;
  margin-right: 9rpx;
  border: 2rpx solid #2f2854;
  border-radius: 10rpx;
  background: rgba(255, 255, 255, 0.5);
}

.flow-progress__bar--active {
  background: #7657f6;
}

.flow-progress__text {
  margin-left: 5rpx;
  font-size: 19rpx;
  font-weight: 800;
}

.flow-hero__sticker {
  position: relative;
  z-index: 2;
  display: flex;
  width: 162rpx;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
}

.sticker-card {
  display: flex;
  width: 130rpx;
  height: 142rpx;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  border: 4rpx solid #2f2854;
  border-radius: 36rpx 36rpx 36rpx 12rpx;
  background: #fffdf8;
  box-shadow: 8rpx 9rpx 0 #2f2854;
  transform: rotate(4deg);
}

.sticker-face {
  position: relative;
  display: flex;
  width: 72rpx;
  height: 62rpx;
  box-sizing: border-box;
  justify-content: space-around;
  padding: 20rpx 14rpx 0;
  border: 3rpx solid #2f2854;
  border-radius: 50%;
  background: #8ee3c2;
}

.sticker-eye {
  width: 8rpx;
  height: 10rpx;
  border-radius: 50%;
  background: #2f2854;
}

.sticker-smile {
  position: absolute;
  bottom: 11rpx;
  left: 22rpx;
  width: 25rpx;
  height: 12rpx;
  border-bottom: 4rpx solid #2f2854;
  border-radius: 0 0 20rpx 20rpx;
}

.sticker-label {
  margin-top: 12rpx;
  color: #7657f6;
  font-size: 22rpx;
  font-weight: 900;
  letter-spacing: 1rpx;
}

.sticker-spark {
  position: absolute;
  z-index: 3;
  top: 3rpx;
  right: 1rpx;
  color: #7657f6;
  font-size: 39rpx;
  font-weight: 900;
  transform: rotate(12deg);
}

.flow-confetti {
  position: absolute;
  z-index: 1;
}

.flow-confetti--one {
  width: 24rpx;
  height: 9rpx;
  top: 22rpx;
  left: 22rpx;
  border-radius: 8rpx;
  background: #ff7168;
  transform: rotate(30deg);
}

.flow-confetti--two {
  width: 18rpx;
  height: 18rpx;
  right: 190rpx;
  bottom: 28rpx;
  border: 3rpx solid #2f2854;
  border-radius: 50%;
  background: #fffdf8;
}

.flow-confetti--three {
  right: 28rpx;
  bottom: 18rpx;
  color: #fffdf8;
  font-size: 35rpx;
  font-weight: 900;
}
</style>
