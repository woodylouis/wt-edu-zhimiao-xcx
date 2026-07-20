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
    gap: 14rpx;
    margin-top: 24rpx;
    padding: 22rpx;
    border: 3rpx solid #e4deef;
    border-radius: 26rpx;
    background: #fff8dc;
}

.input-label {
    color: #2f2854;
    font-size: 27rpx;
    font-weight: 800;
    font-family: PingFang SC;
}

.input-field {
    border-radius: 22rpx;
    background-color: #fffdf8;
    border: 3rpx solid #2f2854;
    padding: 24rpx 28rpx;
    font-size: 27rpx;
    color: #8a839d;
    line-height: 48rpx;
    font-family: PingFang SC;
    box-shadow: 4rpx 5rpx 0 rgba(47, 40, 84, 0.15);
}
</style>
