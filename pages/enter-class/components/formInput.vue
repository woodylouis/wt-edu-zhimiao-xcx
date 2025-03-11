<template>
    <view class="input-group">
        <text v-if="label" class="input-label">{{ label }}</text>
        <view class="input-field">{{ placeholder }}</view>
    </view>
</template>

<script>
export default {
    name: "FormInput",
    props: {
        label: {
            type: String,
            required: false,
        },
        placeholder: {
            type: String,
            required: true,
        },
    },
};
</script>

<style scoped>
.input-group {
    display: flex;
    flex-direction: column;
    gap: 24rpx;
    margin-top: 32rpx;
}

.input-label {
    color: rgba(0, 33, 77, 1);
    font-size: 32rpx;
    font-weight: 600;
    font-family: PingFang SC;
}

.input-field {
    border-radius: 16rpx;
    background-color: rgba(255, 255, 255, 1);
    border: 2rpx solid rgba(206, 213, 218, 1);
    padding: 24rpx 32rpx;
    font-size: 28rpx;
    color: rgba(111, 115, 116, 1);
    line-height: 48rpx;
    font-family: PingFang SC;
}
</style>