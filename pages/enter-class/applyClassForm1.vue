<template>
    <view class="growth-assessment">
        <u-sticky>
            <custom-nav :xcxName="'申请加入'" :needBack="true" />
        </u-sticky>
        <view class="form-container">
            <u--form :model="formData" :rules="rules" ref="uForm" errorType="message" :borderBottom="false">
                <view class="form-content">
                    <view class="input-group">
                        <text class="input-label">班级码</text>
                        <u-form-item prop="nickname" :borderBottom="false">
                            <u--input v-model="formData.code" placeholder="输入班级码" border="false" :custom-style="inputStyle" />
                        </u-form-item>
                    </view>
                    <text class="help-link">*如何获得班级码？</text>
                    <view class="help-tips">
                        <view>1、通过家长或老师分享到微信、朋友圈的班级信息可以获得班级代码；</view>
                        <view>2、已经加入班级的其他家长或老师可在班级首页查看班级代码。</view>
                    </view>

                    <u-button @click="handleSubmit" :custom-style="buttonStyle">下一步</u-button>
                </view>
            </u--form>
        </view>
        <up-overlay :show="show">
            <view class="warp">
                <modal-box v-if="show" :className="formData.className" :nickname="formData.nickname" :teacherName="formData.teacherName" confirmText="立即创建" @cancel="show = false" @create="handleConfirm" />
            </view>
        </up-overlay>
    </view>
</template>

<script>
// 导入modlBox组件
import modalBox from '../../components/modalBox/modalBox';
export default {
    components: {
        modalBox,
    },
    // 在data中修正show定义位置
    data() {
        return {
            show: false,  // 移动到顶层
            formData: {
                code: ''
            },
            rules: {
                code: [
                    {
                        required: true,
                        message: "请输入班级码",
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
    // 修正handleSubmit中的逻辑
    methods: {
        async handleSubmit() {
            try {
                const valid = await this.$refs.uForm.validate()
                if (valid) {
                    this.updateLocalStorage()
                    // 添加强制更新确保DOM刷新
                    this.$nextTick(() => {
                        this.show = true
                    })
                }
            } catch (error) {
                // 处理数组类型的错误对象
                const errorMessages = error?.map(e => e.message) || ['未知错误']
                uni.showToast({
                    title: `请完善以下信息：${errorMessages.join('，')}`,
                    icon: "none"
                })
            }
        },  // 注意这里需要逗号分隔

        async handleConfirm() {
            uni.showLoading({ title: "提交中..." });
            try {
                const cacheData = uni.getStorageSync('classFormData') || {};
                // 新增用户信息获取
                const userInfo = uni.getStorageSync('uni-id-pages-userInfo') || {};

                const postData = {
                    grade: cacheData.grade,
                    class: cacheData.class,
                    nickname: this.formData.nickname,
                    teacherName: this.formData.teacherName,
                    section: cacheData.section || '小学',
                    userId: userInfo._id // 添加用户ID字段
                };

                // 调用云函数
                const { result } = await uniCloud.callFunction({
                    name: 'wtdb-business-class-create',
                    data: postData
                });

                if (result.code === 200) {
                    // 第一步：缓存完整班级信息
                    uni.setStorageSync('currentClass', {
                        id: result.data.classId,
                        code: result.data.classCode,
                        grade: cacheData.grade,
                        class: cacheData.class,
                        nickname: this.formData.nickname
                    });

                    uni.showToast({
                        title: `创建成功！班级码：${result.data.classCode}`,
                        icon: "none",
                        duration: 3000
                    });
                    uni.removeStorageSync('classFormData');
                    setTimeout(() => {
                        uni.reLaunch({
                            url: "/pages/dashboard/teacher/teacher"
                        });
                    }, 1500);
                } else {
                    throw new Error(result.msg);
                }
            } catch (error) {
                uni.showToast({
                    title: `创建失败: ${error.errMsg || error.message}`,
                    icon: "none"
                });
            } finally {
                uni.hideLoading();
            }
        },  // 注意这里需要逗号分隔

        updateLocalStorage() {
            const cacheData = uni.getStorageSync('classFormData') || {};
            const newData = {
                ...cacheData,
                nickname: this.formData.nickname,
                teacherName: this.formData.teacherName
            };
            uni.setStorageSync('classFormData', newData);
        },

        handleHelp() {
            uni.navigateTo({
                url: "/pages/help/index",
            });
        }
    },  // methods结束
    watch: {
        'formData.nickname'(newVal) {
            this.updateLocalStorage();
        },
        'formData.teacherName'(newVal) {
            this.updateLocalStorage();
        }
    },
    // 删除重复的methods声明块
    onShow() {
        const cacheData = uni.getStorageSync('classFormData');
        if (cacheData) {
            // 仅初始化本页字段
            this.formData.className = `${cacheData.grade}${cacheData.class}班`;
            this.formData.nickname = this.formData.className;
            this.formData.teacherName = cacheData.teacherName || "";
        }
    }
}
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

.warp {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
}

.help-link {
    color: #8696A3;
    font-family: "PingFang SC";
    font-size: 12px;
    font-style: normal;
    font-weight: 400;
    line-height: 20px;
}

.help-tips {
    color: #3D464A;
    font-family: "PingFang SC";
    font-size: 11px;
    font-style: normal;
    font-weight: 400;
    line-height: 20px;
    /* 181.818% */
}
</style>