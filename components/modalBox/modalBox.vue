<!-- 选择弹窗 -->
<template>
  <view class="create-class-card">
    <view class="create-class-header">
      <text class="header-text">请确认以下信息是否正确</text>
    </view>

    <div class="confirmation-content">
      <div class="info-field">
        <span class="info-label">所属班级：</span>
        <span class="info-value">{{ className }}</span>
      </div>
      <div class="info-field">
        <span class="info-label">班级昵称：</span>
        <span class="info-value">{{ nickname }}</span>
      </div>
      <div class="info-field">
        <span class="info-label">我的姓名：</span>
        <span class="info-value">{{ teacherName }}</span>
      </div>
      <div class="info-field">
        <span class="info-label">备注：</span>
        <span class="info-value">{{ remark }}</span>
      </div>
    </div>

    <view class="buttons-container">
      <view class="btn btn-cancel" @tap="onCancel">
        <text class="btn-text">{{ cancelText }}</text>
      </view>
      <view class="btn btn-create" @tap="onCreate">
        <text class="btn-text">{{ confirmText }}</text>
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

<style>
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
</style>
