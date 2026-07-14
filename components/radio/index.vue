<template>
    <view class="radio-container">
        <view class="question-prompt">
            <view class="question-badge">Q</view>
            <text class="question-text">{{ content }}</text>
        </view>
        <view class="radio-group">
            <view
                v-for="(option, index) in options"
                :key="index"
                class="radio-item"
                :class="{ 'radio-item--selected': option.selected }"
                @click="selectOption(index)"
            >
                <view class="radio-icon">
                    <view v-if="option.selected" class="radio-check">✓</view>
                    <view v-else class="radio-empty"></view>
                </view>
                <text class="radio-text">{{ option.name }}</text>
                <text v-if="option.selected" class="selected-spark">✦</text>
            </view>
        </view>
    </view>
</template>

<script setup>
const props = defineProps({
    content: {
        type: String,
        default: ''
    },
    options: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['change']);

const selectOption = (index) => {
    const newOptions = [...props.options]; // 创建新数组
    newOptions.forEach((opt, i) => {
        opt.selected = i === index; // 直接修改选项状态
    });
    // console.log("selectOption", newOptions[index])
    emit('change', newOptions[index]);
};
</script>

<style scoped lang="scss">
.radio-container {
    display: flex;
    flex-direction: column;
    gap: 20rpx;
}

.question-prompt {
    display: flex;
    align-items: flex-start;
    gap: 14rpx;
}

.question-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48rpx;
    height: 48rpx;
    flex: 0 0 auto;
    box-sizing: border-box;
    border: 3rpx solid #44365f;
    border-radius: 16rpx;
    color: #ffffff;
    background: #7c63e8;
    box-shadow: 3rpx 4rpx 0 #ffd447;
    font-size: 23rpx;
    font-weight: 950;
}

.question-text {
    padding-top: 3rpx;
    color: #3b3052;
    font-size: 30rpx;
    font-weight: 900;
    line-height: 1.5;
}

.radio-group {
    display: flex;
    flex-direction: column;
    gap: 15rpx;
}

.radio-item {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 80rpx;
    box-sizing: border-box;
    padding: 17rpx 18rpx;
    overflow: hidden;
    border: 2rpx solid #d9d0e1;
    border-radius: 23rpx;
    background: #faf8fc;
    box-shadow: 0 4rpx 0 rgba(68, 54, 95, 0.08);
    transition: transform 0.18s ease, background 0.18s ease;
}

.radio-item:active {
    transform: scale(0.985);
}

.radio-item--selected {
    border: 3rpx solid #44365f;
    background: linear-gradient(135deg, #fff0a9 0%, #ffe0ad 100%);
    box-shadow: 5rpx 5rpx 0 #ff8f82;
}

.radio-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44rpx;
    height: 44rpx;
    margin-right: 15rpx;
    flex-shrink: 0;
}

.radio-empty,
.radio-check {
    width: 40rpx;
    height: 40rpx;
    box-sizing: border-box;
    border: 3rpx solid #887a93;
    border-radius: 50%;
}

.radio-check {
    display: flex;
    align-items: center;
    justify-content: center;
    border-color: #44365f;
    color: #ffffff;
    background: #52c49e;
    box-shadow: 2rpx 3rpx 0 #44365f;
    font-size: 23rpx;
    font-weight: 950;
}

.radio-text {
    min-width: 0;
    flex: 1;
    color: #55485f;
    font-size: 26rpx;
    font-weight: 700;
    line-height: 1.48;
    word-break: break-word;
}

.radio-item--selected .radio-text {
    color: #3b3052;
    font-weight: 850;
}

.selected-spark {
    margin-left: 10rpx;
    color: #8b67e8;
    font-size: 26rpx;
    font-weight: 900;
}
</style>
