<!-- 选择弹窗 -->
<template>
    <view class="create-class-card">
        <view class="modal-confetti modal-confetti--one"></view>
        <view class="modal-confetti modal-confetti--two">✦</view>
        <view class="create-class-header">
            <view class="header-icon">✓</view>
            <view class="header-copy">
                <text class="header-kicker">CHECK IT TOGETHER</text>
                <text class="header-text">确认申请信息</text>
                <text class="header-description">再看一眼，确认后就可以继续啦</text>
            </view>
        </view>

        <view class="confirmation-content">
            <view v-for="(item, index) in items" :key="index" class="info-field" :class="`info-field--${index % 4}`">
                <text class="info-label">{{ item.label }}</text>
                <text class="info-value">{{ item.name }}</text>
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
        items: {
            type: Array,
            default: () => [
                {
                    label: "您正在申请加入：",
                    name: "【小班11班】",
                },
                {
                    label: "班级码：",
                    name: "32908",
                },
                {
                    label: "创建者：",
                    name: "丽丽爸爸",
                },
            ],
        },

        className: {
            type: String,
        },
        nickname: {
            type: String,
        },
        teacherName: {
            type: String,
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
    background: linear-gradient(221deg, #D6FFD8 2.4%, #EAFBFF 73.84%);
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
    color: #00214D;
    font-family: "PingFang SC";
    font-size: 14px;
    font-style: normal;
    font-weight: 400;
    line-height: 20px;
    /* 142.857% */
}

.info-value {
    color: #00214D;
    font-family: "PingFang SC";
    font-size: 14px;
    font-style: normal;
    font-weight: 600;
    line-height: 20px;
    /* 142.857% */
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
    background: #D8F2E0;
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
    min-height: 178rpx;
    box-sizing: border-box;
    align-items: center;
    justify-content: flex-start;
    padding: 34rpx;
    border-bottom: 3rpx solid #2f2854;
    background: linear-gradient(135deg, #d8cdff 0%, #ffb3a8 100%);
    text-align: left;
}

.header-icon {
    display: flex;
    width: 88rpx;
    height: 88rpx;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    margin-right: 24rpx;
    border: 4rpx solid #2f2854;
    border-radius: 28rpx 28rpx 28rpx 10rpx;
    background: #8ee3c2;
    box-shadow: 6rpx 7rpx 0 #2f2854;
    color: #2f2854;
    font-size: 39rpx;
    font-weight: 900;
    transform: rotate(-4deg);
}

.header-copy { display: flex; min-width: 0; flex-direction: column; }
.header-kicker { color: #7657f6; font-size: 18rpx; font-weight: 900; letter-spacing: 2rpx; }
.header-text { margin-top: 7rpx; color: #2f2854; font-size: 34rpx; font-weight: 900; line-height: 1.2; }
.header-description { margin-top: 8rpx; color: rgba(47, 40, 84, 0.7); font-size: 20rpx; font-weight: 600; }

.confirmation-content {
    display: flex;
    width: auto;
    box-sizing: border-box;
    flex-direction: column;
    gap: 14rpx;
    margin: 0;
    padding: 30rpx;
}

.info-field {
    display: flex;
    min-height: 78rpx;
    box-sizing: border-box;
    align-items: center;
    justify-content: space-between;
    margin: 0;
    padding: 17rpx 20rpx;
    border: 3rpx solid #2f2854;
    border-radius: 21rpx;
    line-height: 1.35;
}

.info-field--0 { background: #fff4be; }
.info-field--1 { background: #eee9ff; }
.info-field--2 { background: #e2f8ee; }
.info-field--3 { background: #ffe9e5; }
.info-label { max-width: 48%; color: #7c748e; font-size: 21rpx; font-weight: 700; }
.info-value { max-width: 52%; color: #2f2854; font-size: 24rpx; font-weight: 800; text-align: right; }

.buttons-container { display: flex; gap: 18rpx; margin: 0; padding: 2rpx 30rpx 34rpx; }
.btn { height: 88rpx; box-sizing: border-box; border: 4rpx solid #2f2854; border-radius: 24rpx; }
.btn-cancel { width: 188rpx; background: #ffffff; }
.btn-create { flex: 1; background: #7657f6; box-shadow: 6rpx 7rpx 0 #2f2854; }
.btn-create .btn-text { color: #ffffff; }
.btn-arrow { margin-left: 12rpx; color: #ffffff; font-size: 27rpx; font-weight: 900; }
.modal-confetti { position: absolute; z-index: 4; pointer-events: none; }
.modal-confetti--one { width: 24rpx; height: 9rpx; top: 24rpx; left: 18rpx; border-radius: 8rpx; background: #ff7168; transform: rotate(28deg); }
.modal-confetti--two { top: 16rpx; right: 22rpx; color: #fffdf8; font-size: 32rpx; font-weight: 900; }
.btn-pressed { transform: scale(0.97); }
.btn-create-pressed { transform: translate(4rpx, 5rpx); box-shadow: 2rpx 2rpx 0 #2f2854; }
</style>
