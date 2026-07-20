<template>
    <view class="form-container">
        <text class="form-description">您正在创建班级，请填写以下信息</text>

        <FormInput label="所属班级" placeholder="请选择所属班级" />
        <FormInput label="班级昵称" placeholder="输入班级昵称" />
        <FormInput label="我的昵称" placeholder="使用个人资料中的昵称" />

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
            this.$emit("submit");
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
    background-color: #fffdf8;
    align-self: stretch;
    /* margin-top: 32rpx; */
    box-sizing: border-box;
    margin: 24rpx;
    padding: 30rpx;
    border: 4rpx solid #2f2854;
    border-radius: 38rpx;
    box-shadow: 8rpx 9rpx 0 rgba(47, 40, 84, 0.2);
    flex-direction: column;
    align-items: stretch;
    font-family: PingFang SC;
    font-size: 32rpx;
    color: #2f2854;
    font-weight: 400;
}

.form-description {
    box-sizing: border-box;
    padding: 17rpx 20rpx;
    border: 3rpx solid #2f2854;
    border-radius: 20rpx;
    background: #eee9ff;
    color: #2f2854;
    font-size: 23rpx;
    font-weight: 700;
    line-height: 1.4;
    align-self: flex-start;
}

.submit-button {
    border-radius: 24rpx;
    background-color: #7657f6;
    margin-top: 42rpx;
    padding: 26rpx 140rpx;
    font-weight: 800;
    border: 4rpx solid #2f2854;
    color: #ffffff;
    font-family: inherit;
    font-size: 32rpx;
    width: 100%;
    box-shadow: 7rpx 8rpx 0 #2f2854;
}

.help-link {
    color: #7657f6;
    font-size: 24rpx;
    font-weight: 700;
    line-height: 1;
    text-decoration: none;
    align-self: center;
    margin-top: 32rpx;
}
</style>
