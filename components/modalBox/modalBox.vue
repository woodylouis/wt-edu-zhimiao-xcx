<!-- 选择弹窗 -->
<template>
  <view class="create-class-card">
    <view class="modal-confetti modal-confetti--one"></view>
    <view class="modal-confetti modal-confetti--two">✦</view>
    <view class="create-class-header">
      <view class="header-icon">
        <view class="header-eye"></view>
        <view class="header-eye"></view>
        <view class="header-smile"></view>
      </view>
      <view class="header-copy">
        <text class="header-kicker">READY TO CREATE</text>
        <text class="header-text">确认班级资料</text>
        <text class="header-description">确认无误后，新班级马上诞生</text>
      </view>
    </view>

    <view class="confirmation-content">
      <view class="info-field info-field--yellow">
        <text class="info-label">所属班级</text>
        <text class="info-value">{{ className }}</text>
      </view>
      <view class="info-field info-field--purple">
        <text class="info-label">班级昵称</text>
        <text class="info-value">{{ nickname }}</text>
      </view>
      <view class="info-field info-field--mint">
        <text class="info-label">我的昵称</text>
        <text class="info-value">{{ teacherName }}</text>
      </view>
      <view class="info-field info-field--coral">
        <text class="info-label">备注</text>
        <text class="info-value">{{ remark || '无' }}</text>
      </view>
    </view>

    <view class="buttons-container">
      <view class="btn btn-cancel" hover-class="btn-pressed" @tap="onCancel">
        <text class="btn-text">{{ cancelText }}</text>
      </view>
      <view class="btn btn-create" hover-class="btn-create-pressed" @tap="onCreate">
        <text class="btn-text">{{ confirmText }}</text>
        <text class="btn-arrow">→</text>
      </view>
    </view>
  </view>
</template>

<script>
  export default {
    name: "CreateClassCard",
    props: {
      // 新增数据字段
      className: {
        type: String,
      },
      nickname: {
        type: String,
      },
      teacherName: {
        type: String,
      },
      remark: {
        type: String,
      },
      list: {
        type: Array,
        default: () => ["我是家长/家委", "老师"],
      },
      cancelText: {
        type: String,
        default: "返回修改",
      },
      confirmText: {
        type: String,
        default: "确认无误",
      },
      createClass: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        selected: 0,
      };
    },
    methods: {
      selectOption(index) {
        this.selected = index;
        uni.vibrateShort();
        this.$emit("select", index);
      },
      onCancel() {
        this.$emit("cancel");
      },
      onCreate() {
        this.$emit("create", this.selected);
      },
    },
  };
</script>

<style scoped>
  .create-class-card {
    width: 560rpx;
    /* 高度自适应 */
    height: auto;
    background: #ffffff;
    border-radius: 32rpx;
    overflow: hidden;
  }

  .create-class-header {
    height: 120rpx;
    display: flex;
    align-items: center;
    background: linear-gradient(221deg, #d6ffd8 2.4%, #eafbff 73.84%);
    text-align: center;
    justify-content: center;
  }

  .confirmation-content {
    display: flex;
    margin-top: 20px;
    width: 100%;
    padding: 0 16px;
    flex-direction: column;
    align-items: start;
    font-size: 14px;
  }

  .info-field {
    display: flex;
    margin: 12px 0 0 14px;
    align-items: stretch;
    line-height: 1;
  }

  .info-field:first-child {
    margin-top: 0;
  }

  .info-label {
    font-weight: 400;
    flex-grow: 1;
  }

  .info-value {
    font-weight: 600;
  }

  .header-text {
    font-size: 32rpx;
    font-weight: 600;
    color: #00214d;
    line-height: 48rpx;
  }

  .options-list {
    padding: 40rpx 32rpx;
    display: flex;
    flex-direction: column;
    gap: 24rpx;
  }

  .option {
    display: flex;
    align-items: center;
    height: 80rpx;
    background: #f3f4f6;
    border-radius: 16rpx;
    padding: 0 32rpx;
    width: calc(100% - 64rpx);
    cursor: pointer;
  }

  .option-selected {
    background: #d8f2e0;
  }

  .option-icon {
    width: 40rpx;
    height: 40rpx;
  }

  .option-text {
    margin-left: 72rpx;
    font-size: 28rpx;
    line-height: 40rpx;
    color: #71717a;
  }

  .text-selected {
    color: #00214d;
  }

  .buttons-container {
    display: flex;
    gap: 20rpx;
    padding: 0 32rpx;
    margin-top: 40rpx;
    margin-bottom: 40rpx;
  }

  .btn {
    height: 80rpx;
    width: 236rpx;
    border-radius: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-cancel {
    border: 2rpx solid #00214d;
  }

  .btn-create {
    background: #6edd8a;
  }

  .btn-text {
    font-size: 28rpx;
    font-weight: 500;
    color: #00214d;
    line-height: 40rpx;
  }

  .create-class-card {
    position: relative;
    width: 640rpx;
    max-width: 92vw;
    box-sizing: border-box;
    overflow: hidden;
    border: 4rpx solid #2f2854;
    border-radius: 40rpx;
    background: #fffdf8;
    box-shadow: 12rpx 14rpx 0 rgba(47, 40, 84, 0.55);
  }

  .create-class-header {
    display: flex;
    height: auto;
    min-height: 180rpx;
    box-sizing: border-box;
    align-items: center;
    justify-content: flex-start;
    padding: 34rpx;
    border-bottom: 3rpx solid #2f2854;
    background: linear-gradient(135deg, #ffdf6e 0%, #ffb3a8 100%);
    text-align: left;
  }

  .header-icon {
    position: relative;
    display: flex;
    width: 92rpx;
    height: 92rpx;
    flex-shrink: 0;
    box-sizing: border-box;
    justify-content: space-around;
    margin-right: 24rpx;
    padding: 31rpx 18rpx 0;
    border: 4rpx solid #2f2854;
    border-radius: 30rpx 30rpx 30rpx 10rpx;
    background: #8ee3c2;
    box-shadow: 6rpx 7rpx 0 #2f2854;
    transform: rotate(-4deg);
  }

  .header-eye {
    width: 8rpx;
    height: 11rpx;
    border-radius: 50%;
    background: #2f2854;
  }

  .header-smile {
    position: absolute;
    bottom: 21rpx;
    left: 27rpx;
    width: 31rpx;
    height: 14rpx;
    border-bottom: 4rpx solid #2f2854;
    border-radius: 0 0 22rpx 22rpx;
  }

  .header-copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .header-kicker {
    color: #7657f6;
    font-size: 18rpx;
    font-weight: 900;
    letter-spacing: 2rpx;
  }

  .header-text {
    margin-top: 7rpx;
    color: #2f2854;
    font-size: 34rpx;
    font-weight: 900;
    line-height: 1.2;
  }

  .header-description {
    margin-top: 8rpx;
    color: rgba(47, 40, 84, 0.7);
    font-size: 20rpx;
    font-weight: 600;
  }

  .confirmation-content {
    display: grid;
    width: auto;
    box-sizing: border-box;
    grid-template-columns: repeat(2, 1fr);
    gap: 16rpx;
    margin: 0;
    padding: 30rpx;
  }

  .info-field {
    display: flex;
    min-width: 0;
    min-height: 102rpx;
    box-sizing: border-box;
    flex-direction: column;
    justify-content: center;
    margin: 0;
    padding: 17rpx 19rpx;
    border: 3rpx solid #2f2854;
    border-radius: 22rpx;
    line-height: 1.3;
  }

  .info-field--yellow { background: #fff4be; }
  .info-field--purple { background: #eee9ff; }
  .info-field--mint { background: #e2f8ee; }
  .info-field--coral { background: #ffe9e5; }

  .info-label {
    color: #8a839d;
    font-size: 19rpx;
    font-weight: 700;
  }

  .info-value {
    overflow: hidden;
    margin-top: 7rpx;
    color: #2f2854;
    font-size: 25rpx;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .buttons-container {
    display: flex;
    gap: 18rpx;
    margin: 0;
    padding: 4rpx 30rpx 34rpx;
  }

  .btn {
    height: 88rpx;
    box-sizing: border-box;
    border: 4rpx solid #2f2854;
    border-radius: 24rpx;
  }

  .btn-cancel {
    width: 188rpx;
    background: #ffffff;
  }

  .btn-create {
    flex: 1;
    background: #7657f6;
    box-shadow: 6rpx 7rpx 0 #2f2854;
  }

  .btn-create .btn-text { color: #ffffff; }

  .btn-arrow {
    margin-left: 12rpx;
    color: #ffffff;
    font-size: 27rpx;
    font-weight: 900;
  }

  .modal-confetti {
    position: absolute;
    z-index: 4;
    pointer-events: none;
  }

  .modal-confetti--one {
    width: 24rpx;
    height: 9rpx;
    top: 24rpx;
    left: 18rpx;
    border-radius: 8rpx;
    background: #ff7168;
    transform: rotate(28deg);
  }

  .modal-confetti--two {
    top: 16rpx;
    right: 22rpx;
    color: #7657f6;
    font-size: 32rpx;
    font-weight: 900;
  }

  .btn-pressed { transform: scale(0.97); }
  .btn-create-pressed { transform: translate(4rpx, 5rpx); box-shadow: 2rpx 2rpx 0 #2f2854; }
</style>
