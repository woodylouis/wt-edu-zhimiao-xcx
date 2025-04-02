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
                        <u-form-item prop="code" :borderBottom="false">
                            <u--input v-model="formData.code" placeholder="输入班级码" border="false" :custom-style="inputStyle" type="number" @blur="handleCodeBlur" />
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
                <modal-box v-if="show" :items="confirmInfo" confirmText="确定" @cancel="show = false" @create="handleConfirm" />
            </view>
        </up-overlay>
    </view>
</template>

<script>
// 导入modlBox组件
import modalBox from '../../components/modalBox-v2/modalBox';
export default {
    components: {
        modalBox,
    },
    // 在data中修正show定义位置
    data() {
        return {
            show: false,
            formData: {  // 增加classInfo字段定义
                role: '',
                code: '',
                nickname: '',
                classInfo: null  // 初始化班级信息字段
            },
            confirmInfo: [
                {
                    label: "您正在申请加入：",
                    name: "【小班12班】",
                },
                {
                    label: "班级码：",
                    name: "329083",
                },
                {
                    label: "创建者：",
                    name: "丽丽妈妈",
                },
            ],
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
        handleCodeInput(value) {
            // 过滤非数字字符
            this.formData.code = value.replace(/\D/g, '');
        },
        // Add this method
        handleCodeBlur(e) {
            const filtered = e.value.replace(/\D/g, '')
            this.formData.code = filtered
            this.$forceUpdate()
        },

        // Remove the handleCodeInput method and @input binding
        async handleSubmit() {
            try {
                const valid = await this.$refs.uForm.validate()
                if (valid) {
                    // 添加加载提示
                    uni.showLoading({ title: '查询中...', mask: true });

                    const { result } = await uniCloud.callFunction({
                        name: 'wtdb-business-class-detail',
                        data: { code: this.formData.code }
                    });

                    // 关闭加载提示
                    uni.hideLoading();

                    // 统一更新班级信息
                    this.formData.nickname = result.data.nickname
                    this.formData.classInfo = result.code === 200 ? result.data : null

                    if (result.code === 200) {
                        this.show = true;
                        this.confirmInfo = [
                            { label: "您正在申请加入：", name: result.data.nickname },
                            { label: "班级码：", name: result.data.code },
                            { label: "创建者：", name: `${result.data.teacherName} 老师` }
                        ];
                    } else {
                        uni.showToast({
                            title: result.msg,
                            icon: "none"
                        });
                    }

                    this.updateLocalStorage();
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
            // 新增跳转逻辑
            uni.navigateTo({
                url: `/pages/enter-class/applyClassForm2`
            });
            this.show = false;
        },



        // 新增缓存更新方法
        updateLocalStorage() {
            uni.setStorageSync('tempFormData', {
                role: this.formData.role,
                code: this.formData.code,
                nickname: this.formData.nickname || '',  // 新增nickname存储
                classInfo: this.formData.classInfo || null
            });
        },

        handleHelp() {
            uni.navigateTo({
                url: "/pages/help/index",
            });
        }
    },  // methods结束
    watch: {
        'formData.code'(newVal) {  // 新增code字段监听
            this.updateLocalStorage();
        },
    },

    // 在script部分添加onLoad生命周期
    onLoad(options) {
        const cacheData = uni.getStorageSync('tempFormData') || {};
        this.formData = {
            role: '',
            code: '',
            nickname: '',
            classInfo: null,
            ...cacheData // 现在会合并nickname字段
        };

        if (options.role) {
            this.formData.role = options.role;
        }
        console.log('初始化表单数据:', this.formData);
    },
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