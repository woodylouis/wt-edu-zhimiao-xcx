<template>
    <view class="form-container">
        <text class="form-description">您正在创建班级，请填写以下信息</text>

        <FormInput label="所属班级" placeholder="请选择所属班级" />
        <FormInput label="班级昵称" placeholder="输入班级昵称" />
        <FormInput label="我的姓名" placeholder="请输入我的姓名" />

        <button class="submit-button" @tap="handleSubmit">创建新班级</button>
        <text class="help-link" @tap="handleHelp">遇到问题？查看帮助</text>
    </view>
</template>

<script>
import FormInput from "./formInput.vue";

export default {
    name: "FormSection",
    components: {
        FormInput,
    },
    methods: {
        handleSubmit() {
            uni.showLoading({
                title: "提交中...",
            });
            // Add your submission logic here
        },
        handleHelp() {
            uni.navigateTo({
                url: "/pages/help/index",
            });
        },
    },
};
</script>

<style scoped>
.form-container {
    background-color: rgba(255, 255, 255, 1);
    /* background-color: red; */
    align-self: stretch;
    /* margin-top: 32rpx; */
    padding: 0 40rpx 14rpx;
    flex-direction: column;
    align-items: stretch;
    font-family: PingFang SC;
    font-size: 32rpx;
    color: rgba(0, 33, 77, 1);
    font-weight: 400;
}

.form-description {
    color: rgba(61, 70, 74, 1);
    font-size: 24rpx;
    line-height: 1;
    align-self: flex-start;
}

.submit-button {
    border-radius: 48rpx;
    background-color: rgba(110, 221, 138, 1);
    margin-top: 80rpx;
    padding: 26rpx 140rpx;
    font-weight: 500;
    border: none;
    color: rgba(0, 33, 77, 1);
    font-family: inherit;
    font-size: 32rpx;
    width: 100%;
}

.help-link {
    color: rgba(111, 115, 116, 1);
    font-size: 28rpx;
    line-height: 1;
    text-decoration: underline;
    align-self: center;
    margin-top: 32rpx;
}
</style>