<template>
    <view class="growth-assessment">
        <u-sticky>
            <custom-nav :needBack="true" />
        </u-sticky>
        <view class="form-container">
            <text class="form-description">您正在创建班级，请填写以下信息</text>
            <u--form :model="formData" :rules="rules" ref="uForm" errorType="message" :borderBottom="false">
                <view class="form-content">
                    <view class="input-group">
                        <text class="input-label">所属班级</text>
                        <u-form-item prop="className" :borderBottom="false">
                            <u--input v-model="formData.className" placeholder="请选择所属班级" border="false" :custom-style="{ ...inputStyle, backgroundColor: '#F5F5F5', color: '#999999' }" disabled />
                        </u-form-item>
                    </view>

                    <view class="input-group">
                        <text class="input-label">班级昵称</text>
                        <u-form-item prop="nickname" :borderBottom="false">
                            <u--input v-model="formData.nickname" placeholder="输入班级昵称" border="false" :custom-style="inputStyle" />
                        </u-form-item>
                    </view>

                    <view class="input-group">
                        <text class="input-label">我的姓名</text>
                        <u-form-item prop="teacherName" :borderBottom="false">
                            <u--input v-model="formData.teacherName" placeholder="请输入我的姓名" border="false" :custom-style="inputStyle" />
                        </u-form-item>
                    </view>

                    <u-button @click="handleSubmit" :custom-style="buttonStyle">创建新班级</u-button>

                    <text class="help-link" @click="handleHelp">遇到问题？查看帮助</text>
                </view>
            </u--form>

        </view>
    </view>
</template>

<script>
import FormSection from "./components/formSection.vue";
export default {
    components: {
        FormSection,
    },
    data() {
        return {
            formData: {
                className: "",
                nickname: "",
                teacherName: "",
            },
            rules: {
                className: [
                    {
                        required: true,
                        message: "请选择所属班级",
                        trigger: ["change", "blur"],
                    },
                ],
                nickname: [
                    {
                        required: true,
                        message: "请输入班级昵称",
                        trigger: ["change", "blur"],
                    },
                    {
                        min: 2,
                        max: 20,
                        message: "班级昵称长度在2-20个字符之间",
                        trigger: ["change", "blur"],
                    },
                ],
                teacherName: [
                    {
                        required: true,
                        message: "请输入教师姓名",
                        trigger: ["change", "blur"],
                    },
                    {
                        min: 2,
                        max: 10,
                        message: "姓名长度在2-10个字符之间",
                        trigger: ["change", "blur"],
                    },
                ],
            },
            inputStyle: {
                backgroundColor: "#FFFFFF",
                borderRadius: "16rpx",
                border: "2rpx solid rgba(206, 213, 218, 1)",
                padding: "24rpx 32rpx",
                fontSize: "28rpx",
                color: "rgba(111, 115, 116, 1)",
            },
            buttonStyle: {
                backgroundColor: "rgba(110, 221, 138, 1)",
                color: "rgba(0, 33, 77, 1)",
                borderRadius: "48rpx",
                fontWeight: "500",
                fontSize: "32rpx",
                padding: "26rpx 0",
                height: "48px",
                marginTop: "40rpx"
            },
        };
    },
    methods: {
        async handleSubmit() {
            const valid = await this.$refs.uForm.validate()
            if (!valid) {
                uni.showToast({ title: "请完善表单信息", icon: "none" })
                return
            }

            uni.showLoading({ title: "提交中..." })

            try {
                // 获取完整班级数据
                const cacheData = uni.getStorageSync('classFormData') || {}
                const postData = {
                    ...cacheData,
                    nickname: this.formData.nickname,
                    teacherName: this.formData.teacherName
                }

                // 调用真实接口（替换示例代码）
                // const res = await uni.request({
                //     url: '你的接口地址',
                //     method: 'POST',
                //     data: postData
                // })

                // 接口调用成功处理
                uni.hideLoading()
                uni.showToast({ title: "创建成功", icon: "success" })

                // 清除本页使用的缓存
                uni.removeStorageSync('classFormData')

                // 跳转到成功页面或返回
                uni.navigateBack()
            } catch (error) {
                uni.hideLoading()
                uni.showToast({
                    title: `创建失败: ${error.errMsg || '未知错误'}`,
                    icon: "none"
                })
            }
        },
        handleHelp() {
            uni.navigateTo({
                url: "/pages/help/index",
            });
        },
    },

    onShow() {
        // 新增缓存数据初始化
        const cacheData = uni.getStorageSync('classFormData');
        console.log("cacheData", cacheData);
        if (cacheData) {
            this.formData.className = `${cacheData.grade}${cacheData.class}班`;
            this.formData.nickname = `${cacheData.grade}${cacheData.class}班`;
        }
    },
};
</script>

<style lang="scss" scoped>
.form-container {
    background-color: #ffffff;
    border-radius: 48rpx 48rpx 0 0;
    min-height: 80vh;
    padding: 32rpx 40rpx;
    display: flex;
    flex-direction: column;
}

.form-description {
    color: #3D464A;
    font-size: 24rpx;
    line-height: 1;
    margin-bottom: 32rpx;
}

.form-content {
    display: flex;
    flex-direction: column;
    gap: 32rpx;
}

.input-group {
    display: flex;
    flex-direction: column;
    gap: 24rpx;
}

.input-label {
    color: rgba(0, 33, 77, 1);
    font-size: 32rpx;
    font-weight: 600;
    font-family: PingFang SC;
}

.help-link {
    color: rgba(111, 115, 116, 1);
    font-size: 28rpx;
    text-decoration: underline;
    text-align: center;
    margin-top: 32rpx;
}
</style>