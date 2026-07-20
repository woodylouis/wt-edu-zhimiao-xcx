<template>
    <view class="growth-assessment">
        <u-sticky>
            <custom-nav :xcxName="'申请加入'" :needBack="true" :needBar="false" :backHandler="handleNavBack"
                navCustomStyle="background: linear-gradient(135deg, #D8CDFF 0%, #A98CFF 48%, #FFB8AC 100%);height: calc(100vh / 8);" />
        </u-sticky>
        <dopamine-flow-header eyebrow="JOIN THE GROWTH CLASS" title="找到你的班级" subtitle="输入老师分享的 6 位班级码" badge="码" tone="purple" :step="1" :total-steps="2" />
        <view class="form-container">
            <u--form :model="formData" :rules="rules" ref="uForm" errorType="message" :borderBottom="false">
                <view class="form-content">
                    <view class="input-group">
                        <text class="input-label">班级码</text>
                        <u-form-item prop="code" :borderBottom="false">
                            <u--input v-model="formData.code" placeholder="输入班级码" border="false"
                                :custom-style="inputStyle" type="number" @blur="handleCodeBlur" />
                        </u-form-item>
                    </view>
                    <view v-if="isSharedInvite" class="invite-notice">
                        <view class="notice-check">✓</view>
                        <view class="notice-copy">
                            <text class="notice-title">班级码已自动填写</text>
                            <text class="notice-hint">确认无误后，点击下一步即可申请加入</text>
                        </view>
                    </view>
                    <text class="help-link">*如何获得班级码？</text>
                    <view class="help-tips">
                        <view>好友分享的小程序卡片会自动带入班级码，也可以向班级老师获取。</view>
                    </view>

                    <u-button @click="handleSubmit" :custom-style="buttonStyle">查找班级</u-button>
                </view>
            </u--form>
        </view>
        <up-overlay :show="show" :opacity="0.52">
            <view class="warp">
                <modal-box v-if="show" :items="confirmInfo" confirmText="确定" @cancel="show = false"
                    @create="handleConfirm" />
            </view>
        </up-overlay>
        <dopamine-loading :show="loadingVisible" text="正在寻找班级" subtext="小芽正在核对班级码" />
    </view>
</template>

<script>
// 导入modlBox组件
import modalBox from '../../components/modalBox-v2/modalBox';
import DopamineFlowHeader from './components/dopamineFlowHeader.vue';
import DopamineLoading from '../../components/dopamine-loading/index.vue';
export default {
    components: {
        modalBox,
        DopamineFlowHeader,
        DopamineLoading,
    },
    // 在data中修正show定义位置
    data() {
        return {
            show: false,
            loadingVisible: false,
            isSharedInvite: false,
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
                backgroundColor: "#FFFDF8",
                borderRadius: "24rpx",
                border: "3rpx solid #2F2854",
                padding: "26rpx 28rpx",
                fontSize: "28rpx",
                color: "#2F2854",
            },
            buttonStyle: {
                backgroundColor: "#7657F6",
                color: "#FFFFFF",
                borderRadius: "26rpx",
                border: "4rpx solid #2F2854",
                boxShadow: "7rpx 8rpx 0 #2F2854",
                fontWeight: "800",
                fontSize: "32rpx",
                padding: "26rpx 0",
                height: "48px",
                marginTop: "40rpx"
            },
        };
    },
    // 修正handleSubmit中的逻辑
    methods: {
        handleNavBack() {
            uni.navigateBack({
                delta: 1
            });
            uni.removeStorageSync('tempFormData');
        },
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
                    this.loadingVisible = true;

                    const { result } = await uniCloud.callFunction({
                        name: 'wtdb-business-class-detail',
                        data: {
                            code: this.formData.code,
                            uniIdToken: uni.getStorageSync('uni_id_token')
                        }
                    });

                    if (result.code === 200) {
                        this.formData.nickname = result.data.nickname
                        this.formData.classInfo = result.data
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
                        this.formData.classInfo = null
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
            } finally {
                this.loadingVisible = false;
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
        if (options.classCode) {
            this.formData.code = String(options.classCode).replace(/\D/g, '');
            this.isSharedInvite = true;
            this.updateLocalStorage();
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

.invite-notice {
    display: flex;
    align-items: center;
    margin-top: -8rpx;
    padding: 20rpx 22rpx;
    border: 2rpx solid #392f59;
    border-radius: 22rpx;
    background: linear-gradient(135deg, #d8f7eb 0%, #fff5cb 100%);
    box-shadow: 5rpx 5rpx 0 #79dfc2;
}

.notice-check {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 48rpx;
    height: 48rpx;
    margin-right: 16rpx;
    color: #fff;
    border: 2rpx solid #392f59;
    border-radius: 50%;
    background: #7c63e8;
    font-size: 24rpx;
    font-weight: 900;
}

.notice-copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
}

.notice-title {
    color: #392f59;
    font-size: 25rpx;
    font-weight: 800;
}

.notice-hint {
    margin-top: 5rpx;
    color: #6f6880;
    font-size: 21rpx;
    line-height: 1.35;
}

@import "./dopamine-flow.scss";
</style>
