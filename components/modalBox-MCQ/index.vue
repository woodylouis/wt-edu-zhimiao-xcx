<!-- 选择弹窗 -->
<template>
    <view class="create-class-card">
        <view class="modal-confetti confetti-one"></view>
        <view class="modal-confetti confetti-two"></view>
        <view class="modal-confetti confetti-three"></view>

        <view class="create-class-header">
            <view class="header-illustration">
                <view class="header-star">✦</view>
                <view class="header-face">
                    <view class="header-eye"></view>
                    <view class="header-eye"></view>
                    <view class="header-smile"></view>
                </view>
            </view>
            <view class="header-copy">
                <text class="header-text">{{ tips }}</text>
                <text class="header-description">选择您的身份，开启专属成长旅程</text>
            </view>
        </view>

        <view class="options-list">
            <block v-for="(item, index) in list" :key="index">
                <view
                    class="option"
                    :class="[{ 'option-selected': selected === index }, 'option-role-' + index]"
                    hover-class="option-pressed"
                    :hover-stay-time="80"
                    @tap="selectOption(index)"
                >
                    <view class="role-icon">{{ index === 0 ? '师' : '家' }}</view>
                    <view class="option-copy">
                        <text class="option-text" :class="{ 'text-selected': selected === index }">
                            {{ item }}
                        </text>
                        <text class="option-description">
                            {{ index === 0 ? '管理班级与成长评估' : '陪伴孩子记录成长' }}
                        </text>
                    </view>
                    <view class="option-radio" :class="{ 'radio-selected': selected === index }">
                        <view class="radio-dot"></view>
                    </view>
                </view>
            </block>
        </view>

        <view class="buttons-container">
            <view class="btn btn-cancel" hover-class="btn-pressed" :hover-stay-time="80" @tap="onCancel">
                <text class="btn-text">{{ cancelText }}</text>
            </view>
            <view class="btn btn-create" hover-class="btn-create-pressed" :hover-stay-time="80" @tap="onCreate">
                <text class="btn-text">{{ confirmText }}</text>
                <view class="btn-arrow">→</view>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    name: "CreateClassCard",
    props: {
        list: {
            type: Array,
            default: () => ["我是家长/家委", "老师"],
        },
        cancelText: {
            type: String,
            default: "取消",
        },
        confirmText: {
            type: String,
            default: "确定",
        },
        tips: {
            type: String,
            default: "创建班级",
        }
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
    position: relative;
    display: flex;
    align-items: center;
    min-height: 190rpx;
    box-sizing: border-box;
    padding: 38rpx 36rpx 32rpx;
    border-bottom: 3rpx solid #2f2854;
    background: linear-gradient(135deg, #ffdf6e 0%, #ffc95f 100%);
}

.header-illustration {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 106rpx;
    height: 106rpx;
    flex-shrink: 0;
    margin-right: 28rpx;
    border: 3rpx solid #2f2854;
    border-radius: 34rpx 34rpx 34rpx 12rpx;
    background: #8ee3c2;
    transform: rotate(-4deg);
    box-shadow: 7rpx 7rpx 0 #2f2854;
}

.header-face {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-around;
    width: 62rpx;
    height: 58rpx;
    box-sizing: border-box;
    padding: 0 12rpx 10rpx;
    border: 3rpx solid #2f2854;
    border-radius: 50%;
    background: #fffdf8;
}

.header-eye {
    width: 7rpx;
    height: 9rpx;
    border-radius: 50%;
    background: #2f2854;
}

.header-smile {
    position: absolute;
    width: 24rpx;
    height: 11rpx;
    left: 16rpx;
    bottom: 10rpx;
    border-bottom: 4rpx solid #2f2854;
    border-radius: 0 0 18rpx 18rpx;
}

.header-star {
    position: absolute;
    z-index: 2;
    top: -15rpx;
    right: -12rpx;
    color: #7657f6;
    font-size: 36rpx;
    font-weight: 800;
}

.header-copy {
    display: flex;
    flex-direction: column;
}

.header-text {
    color: #2f2854;
    font-size: 38rpx;
    font-weight: 800;
    line-height: 1.2;
}

.header-description {
    margin-top: 12rpx;
    color: #6f5c3f;
    font-size: 22rpx;
    font-weight: 500;
    line-height: 1.4;
}

.modal-confetti {
    position: absolute;
    z-index: 4;
    pointer-events: none;
}

.confetti-one {
    width: 22rpx;
    height: 8rpx;
    top: 27rpx;
    left: 22rpx;
    border-radius: 8rpx;
    background: #ff7d6b;
    transform: rotate(28deg);
}

.confetti-two {
    width: 14rpx;
    height: 14rpx;
    top: 25rpx;
    right: 28rpx;
    border: 3rpx solid #2f2854;
    border-radius: 50%;
    background: #9f83ff;
}

.confetti-three {
    width: 10rpx;
    height: 28rpx;
    top: 126rpx;
    right: 18rpx;
    border-radius: 8rpx;
    background: #ffffff;
    transform: rotate(18deg);
}

.options-list {
    display: flex;
    flex-direction: column;
    padding: 34rpx 32rpx 14rpx;
}

.option {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 112rpx;
    box-sizing: border-box;
    margin-bottom: 20rpx;
    padding: 18rpx 22rpx;
    border: 3rpx solid #e1dced;
    border-radius: 25rpx;
    background: #ffffff;
    transition: transform 0.16s ease, background 0.16s ease, border-color 0.16s ease;
}

.option-selected {
    border-color: #2f2854;
    background: #eee9ff;
    box-shadow: 5rpx 6rpx 0 #2f2854;
}

.option-pressed {
    transform: scale(0.985);
}

.role-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 70rpx;
    height: 70rpx;
    flex-shrink: 0;
    border: 3rpx solid #2f2854;
    border-radius: 22rpx 22rpx 22rpx 8rpx;
    background: #8ee3c2;
    color: #2f2854;
    font-size: 25rpx;
    font-weight: 800;
}

.option-role-1 .role-icon {
    background: #ffb3a8;
}

.option-copy {
    display: flex;
    flex: 1;
    flex-direction: column;
    margin-left: 22rpx;
}

.option-text {
    color: #4f4863;
    font-size: 28rpx;
    font-weight: 700;
    line-height: 1.25;
}

.option-description {
    margin-top: 7rpx;
    color: #9a94aa;
    font-size: 20rpx;
    line-height: 1.25;
}

.text-selected {
    color: #2f2854;
}

.option-radio {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34rpx;
    height: 34rpx;
    flex-shrink: 0;
    box-sizing: border-box;
    border: 3rpx solid #bcb5cc;
    border-radius: 50%;
    background: #ffffff;
}

.radio-selected {
    border-color: #2f2854;
    background: #7657f6;
}

.radio-dot {
    width: 12rpx;
    height: 12rpx;
    border-radius: 50%;
    background: transparent;
}

.radio-selected .radio-dot {
    background: #ffffff;
}

.buttons-container {
    display: flex;
    padding: 12rpx 32rpx 36rpx;
}

.btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 88rpx;
    box-sizing: border-box;
    border: 3rpx solid #2f2854;
    border-radius: 24rpx;
    transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.btn-cancel {
    width: 180rpx;
    margin-right: 18rpx;
    background: #ffffff;
    color: #2f2854;
}

.btn-create {
    flex: 1;
    background: #7657f6;
    box-shadow: 6rpx 7rpx 0 #2f2854;
    color: #ffffff;
}

.btn-text {
    font-size: 28rpx;
    font-weight: 700;
    color: inherit;
    line-height: 1;
}

.btn-arrow {
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
    line-height: 1;
}

.btn-pressed {
    transform: scale(0.97);
    background: #f2eff9;
}

.btn-create-pressed {
    transform: translate(4rpx, 5rpx);
    box-shadow: 2rpx 2rpx 0 #2f2854;
}
</style>
