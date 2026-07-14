<!-- 选择弹窗 -->
<template>
    <view class="create-class-card">
        <view class="modal-spark modal-spark--one">✦</view>
        <view class="modal-spark modal-spark--two">+</view>
        <view class="create-class-header">
            <view class="header-icon">🌱</view>
            <view class="header-copy">
                <text class="header-kicker">成长任务确认</text>
                <text class="header-text">请确认以下信息</text>
            </view>
        </view>

        <view class="confirmation-content">
            <view v-if="tips" class="info-tips"> {{ tips }} </view>
            <view v-for="(item, index) in items" :key="index" class="info-field">
                <text class="info-label">{{ item.label }} </text>
                <text class="info-value">{{ item.name }}</text>
            </view>
            <view class="info-tips"> {{ tips2 }} </view>
        </view>

        <view class="buttons-container" :class="{ 'has-extra-button': extraText }">
            <view class="btn btn-cancel" @tap="onCancel">
                <text class="btn-text">{{ cancelText }}</text>
            </view>
            <view v-if="extraText" class="btn btn-extra" @tap="onExtra">
                <text class="btn-text">{{ extraText }}</text>
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
        extraText: {
            type: String,
            default: "",
        },
        createClass: {
            type: Boolean,
            default: false,
        },
        tips: {
            type: String,
            default: "",
        },
        tips2: {
            type: String,
            default: "",
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
        onExtra() {
            this.$emit("extra");
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
    background: linear-gradient(221deg, #D6FFD8 2.4%, #EAFBFF 73.84%);
    text-align: center;
    justify-content: center;
}

.confirmation-content {
    display: flex;
    margin-top: 12px;
    /* width: 100%; */
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

.info-tips {
    margin: 12px 0 0 14px;
    color: #00214D;
    font-family: "PingFang SC";
    font-size: 14px;
    font-style: normal;
    font-weight: 600;
    line-height: 20px;
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
    white-space: pre-line;
    /* 新增这行，支持换行 */
    word-break: break-word;
    /* 新增这行，支持长单词换行 */
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

.buttons-container.has-extra-button {
    flex-direction: column;
}

.btn {
    height: 80rpx;
    width: 236rpx;
    box-sizing: border-box;
    border-radius: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.has-extra-button .btn {
    width: 100%;
}

.btn-cancel {
    border: 2rpx solid #00214d;
}

.btn-create {
    background: #6edd8a;
}

.btn-extra {
    border: 2rpx solid #459c5c;
    background: #f2fbf5;
}

.btn-text {
    font-size: 28rpx;
    font-weight: 500;
    color: #00214d;
    line-height: 40rpx;
}
</style>

<style scoped lang="scss">
.create-class-card {
    position: relative;
    width: 610rpx;
    max-height: 82vh;
    box-sizing: border-box;
    overflow: hidden;
    border: 4rpx solid #44365f;
    border-radius: 38rpx;
    background: #fffef8;
    box-shadow: 10rpx 12rpx 0 #ffd447;
}

.modal-spark {
    position: absolute;
    z-index: 3;
    color: #ffd447;
    font-weight: 950;
    pointer-events: none;
}

.modal-spark--one {
    top: 18rpx;
    right: 28rpx;
    font-size: 35rpx;
    transform: rotate(14deg);
}

.modal-spark--two {
    top: 72rpx;
    right: 76rpx;
    color: #ffffff;
    font-size: 29rpx;
    transform: rotate(-12deg);
}

.create-class-header {
    position: relative;
    height: auto;
    min-height: 132rpx;
    box-sizing: border-box;
    justify-content: flex-start;
    gap: 18rpx;
    padding: 24rpx 30rpx;
    border-bottom: 3rpx solid #44365f;
    background: linear-gradient(135deg, #ff7f95 0%, #9b78ef 100%);
    text-align: left;
}

.create-class-header::after {
    content: '';
    position: absolute;
    width: 94rpx;
    height: 94rpx;
    right: -30rpx;
    bottom: -38rpx;
    border-radius: 50%;
    background: rgba(255, 212, 71, 0.45);
}

.header-icon {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 74rpx;
    height: 74rpx;
    flex: 0 0 auto;
    box-sizing: border-box;
    border: 3rpx solid #44365f;
    border-radius: 24rpx;
    background: #fff2aa;
    box-shadow: 4rpx 5rpx 0 #44365f;
    font-size: 38rpx;
}

.header-copy {
    position: relative;
    z-index: 2;
    display: flex;
    min-width: 0;
    flex-direction: column;
}

.header-kicker {
    color: #fff1ad;
    font-size: 20rpx;
    font-weight: 850;
    letter-spacing: 2rpx;
}

.header-text {
    margin-top: 4rpx;
    color: #ffffff;
    font-size: 31rpx;
    font-weight: 950;
    line-height: 1.3;
}

.confirmation-content {
    max-height: 45vh;
    box-sizing: border-box;
    margin: 0;
    padding: 24rpx 28rpx 4rpx;
    overflow-y: auto;
    align-items: stretch;
    font-size: 25rpx;
}

.info-field {
    display: flex;
    box-sizing: border-box;
    flex-direction: column;
    gap: 7rpx;
    margin: 14rpx 0 0;
    padding: 18rpx 20rpx;
    border: 2rpx solid #ded5e6;
    border-radius: 20rpx;
    background: #faf8fc;
    line-height: 1.4;
}

.info-field:first-child {
    margin-top: 0;
}

.info-label {
    color: #897b94;
    font-size: 21rpx;
    font-weight: 700;
    line-height: 1.4;
}

.info-value {
    color: #3e3356;
    font-size: 25rpx;
    font-weight: 850;
    line-height: 1.5;
    word-break: break-word;
    white-space: pre-line;
}

.info-tips {
    margin: 12rpx 0 0;
    padding: 17rpx 19rpx;
    border: 2rpx dashed #a07945;
    border-radius: 19rpx;
    color: #735021;
    background: #fff3bc;
    font-size: 23rpx;
    font-weight: 750;
    line-height: 1.55;
}

.info-tips:empty {
    display: none;
}

.buttons-container {
    gap: 16rpx;
    margin: 0;
    padding: 25rpx 28rpx 30rpx;
}

.btn {
    height: 80rpx;
    box-sizing: border-box;
    border: 3rpx solid #44365f;
    border-radius: 25rpx;
}

.btn:active {
    transform: translateY(3rpx);
    box-shadow: none;
}

.btn-cancel {
    color: #5a4d68;
    border-color: #44365f;
    background: #ffffff;
    box-shadow: 4rpx 5rpx 0 #c9bdd4;
}

.btn-create {
    color: #ffffff;
    background: linear-gradient(135deg, #ff718b 0%, #8d6ae9 100%);
    box-shadow: 4rpx 5rpx 0 #ffd447;
}

.btn-extra {
    color: #315e53;
    border-color: #44365f;
    background: #b4efd9;
    box-shadow: 4rpx 5rpx 0 #7f65d9;
}

.btn-text,
.btn-cancel .btn-text,
.btn-create .btn-text,
.btn-extra .btn-text {
    color: inherit;
    font-size: 26rpx;
    font-weight: 900;
}
</style>
