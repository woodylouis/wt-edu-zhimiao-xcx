<template>
    <view class="radio-container">
        <p style="color: #3D464A;font-size: 18px;font-style: normal;font-weight: 600;line-height: 24px;">
            {{ content }}
        </p>
        <view class="radio-group">
            <view v-for="(option, index) in options" :key="index" class="radio-item" @click="selectOption(index)">
                <view class="radio-icon">
                    <image v-if="option.selected" src='/static/general/selected.png' class="selected-icon" />
                    <image v-else src='/static/general/unselected.png' class="unselected-icon" />
                </view>
                <text class="radio-text">{{ option.name }}</text>
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
    emit('change', newOptions[index]);
};
</script>

<style scoped>
.radio-container {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
}

.radio-group {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
}

.radio-item {
    display: flex;
    align-items: center;
    padding: 16rpx;
    border-radius: 8rpx;
    /* background-color: #f5f5f5; */
}

.radio-icon {
    width: 40rpx;
    height: 40rpx;
    margin-right: 16rpx;
}

.selected-icon,
.unselected-icon {
    width: 100%;
    height: 100%;
}

.radio-text {
    font-size: 28rpx;
    color: #333;
}
</style>