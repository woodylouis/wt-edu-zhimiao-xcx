<template>
    <view class="growth-assessment">
        <u-sticky>
            <custom-nav :needBack="true" :xcxName="'申请加入'" :backHandler="handleNavBack" />
        </u-sticky>
        <view class="form-container">
            <view class="form-description">您正在加入<span style="font-weight: bold;">【{{ formData.className }}】</span>，请填写以下信息</view>
            <u--form :model="formData" :rules="rules" ref="uForm" errorType="message" :borderBottom="false">
                <view class="form-content">
                    <view class="input-group">
                        <text class="input-label">我的身份</text>
                        <u-radio-group v-model="formData.role" activeColor="rgba(110, 221, 138, 1)" labelColor="#00214D">
                            <u-radio :customStyle="{ marginBottom: '8px' }" v-for="(item, index) in role" :key="index" :label="item.name" :name="item.role" @change="radioChange" />
                        </u-radio-group>
                    </view>
                    <view v-if="formData.role === 'parent'">

                        <view class="input-group">
                            <text class="input-label">孩子称呼</text>
                            <u-form-item prop="parentData.childName" :borderBottom="false">
                                <u--input v-model="formData.parentData.childName" placeholder="请输入孩子的真实名字" border="false" :custom-style="inputStyle" />
                            </u-form-item>
                        </view>
                        <view class="input-group">
                            <text class="input-label">孩子性别</text>
                            <u-form-item prop="parentData.gender" :borderBottom="false">
                                <view @click="onChooseGender"> <!-- 修改点击方法 -->
                                    <u--input v-model="formData.parentData.gender" placeholder="请选择孩子的性别" border="false" :custom-style="inputStyle" disabled />
                                </view>
                                <u--picker :show="showGenderPicker" :columns="genderColumns" @confirm="onConfirmGender" @cancel="onCancel" :closeOnClickOverlay="true" @close="onCancel"></u--picker> <!-- 使用新状态和列数据 -->
                            </u-form-item>
                        </view>

                        <view class="input-group">
                            <text class="input-label">出生年月</text>
                            <u-form-item prop="formData.parentData.birthdate" :borderBottom="false">
                                <view @click="onClickDatetime"><u--input v-model="showDateStr" placeholder="请输入孩子的生日" border="false" :custom-style="inputStyle" disabled /></view>
                                <u-datetime-picker v-model="formData.parentData.birthdate" :show="showDatetimePicker" :closeOnClickOverlay="true" @close="onCloseDate" @cancel="onCloseDate" @confirm="onConfirmDate" @change="onChangeDatechange" :minDate="minDate" :maxDate="maxDate" mode="date"></u-datetime-picker>
                            </u-form-item>
                        </view>

                        <view class="input-group">
                            <text class="input-label">我是孩子的</text>
                            <u-form-item prop="formData.parentData.relationship" :borderBottom="false">
                                <view @click="onChooseRelationship"><u--input v-model="formData.parentData.relationship" placeholder="请输入您和孩子的关系" border="false" :custom-style="inputStyle" disabled /></view>
                                <u--picker :show="showRelationship" :columns="columns" @confirm="onConfirmRelationship" @cancel="onCancel" :closeOnClickOverlay="true" @close="onCancel"></u--picker>
                            </u-form-item>
                        </view>
                    </view>
                    <view v-if="formData.role === 'teacher'">
                        <view class="input-group">
                            <text class="input-label">我的姓名</text>
                            <u-form-item prop="formData.teacherData.user_name" :borderBottom="false">
                                <u--input v-model="formData.teacherData.user_name" placeholder="请输入姓名" border="false" :custom-style="inputStyle" />
                            </u-form-item>
                        </view>
                    </view>

                    <view class="input-group">
                        <text class="input-label">我的手机号码</text>
                        <u-form-item prop="mobile" :borderBottom="false" @click="bindMobile">
                            <u--input v-model="userInfo.mobile" placeholder="绑定手机号码" border="false" :custom-style="inputStyle" disabled />
                        </u-form-item>
                    </view>

                    <u-button @click="handleSubmit" :custom-style="buttonStyle">下一步</u-button>

                    <text class="help-link" @click="handleHelp">遇到问题？查看帮助</text>
                </view>
            </u--form>
        </view>
        <up-overlay :show="show">
            <view class="warp">
                <modal-box v-if="show" :items="confirmInfo" confirmText="确定" @cancel="show = false" @create="handleConfirm" />
            </view>
        </up-overlay>

        <uni-id-pages-bind-mobile ref="bind-mobile-by-sms" @success="bindMobileSuccess"></uni-id-pages-bind-mobile>

    </view>
</template>

<script>
// 导入modlBox组件
import modalBox from '../../components/modalBox-v2/modalBox';
import {
    store,
    mutations
} from '@/uni_modules/uni-id-pages/common/store.js'
export default {
    computed: {
        userInfo() {
            return store.userInfo
        },
    },
    components: {
        modalBox,
    },
    // 在data中修正show定义位置
    data() {
        return {
            show: false,  // 移动到顶层
            showRelationship: false,  // 重命名为关系选择器状态
            showGenderPicker: false,   // 新增性别选择器状态
            showDatetimePicker: false,
            showDateStr: '',
            formData: {
                role: "parent",
                className: "小班三班",
                // 公共字段
                mobile: "",
                // 家长专属字段
                parentData: {
                    childName: "",
                    gender: "",
                    birthdate: Number(new Date().setFullYear(new Date().getFullYear() - 4)),
                    relationship: ""
                },
                // 老师专属字段
                teacherData: {
                    user_name: ""
                }
            },
            minDate: Number(
                new Date(new Date().setFullYear(new Date().getFullYear() - 10))
            ),
            maxDate: Number(
                new Date(new Date().setFullYear(new Date().getFullYear() - 1))
            ),
            role: [{
                name: '家长',
                role: 'parent'
            },
            {
                name: '老师',
                role: 'teacher'
            }],
            genderColumns: [
                ['男孩', '女孩']
            ],
            columns: [
                ['父亲', '母亲', '爷爷', '奶奶', '其他']
            ],
            rules: {
                childName: [
                    {
                        required: true,
                        message: "请输入孩子名字",
                        trigger: ["change", "blur"],
                    },
                    {
                        min: 2,
                        max: 10,
                        message: "姓名长度在2-10个字符之间",
                        trigger: ["change", "blur"],
                    },
                ],
                relationship: [
                    {
                        required: true,
                        message: "请输入你和孩子的关系",
                        trigger: ["change", "blur"],
                    },
                ],
                mobile: [
                    {
                        required: true,
                        message: "请输入你的手机号码",
                        trigger: ["change", "blur"],
                    },
                    {
                        pattern: /^1[3-9]\d{9}$/,
                        message: "请输入有效的手机号码",
                        trigger: ["change", "blur"],
                    }
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
        };
    },
    // 修正handleSubmit中的逻辑
    methods: {
        handleSubmit() {
            this.show = true;
            if (this.formData.role === 'parent') {
                this.confirmInfo = [
                    { label: "您正在申请加入：", name: this.formData.className },
                    { label: "孩子称呼：", name: this.formData.parentData.childName },
                    { label: "孩子性别：", name: this.formData.parentData.gender },
                    { label: "出生年月：", name: this.showDateStr },
                    { label: "我是孩子的：", name: this.formData.parentData.relationship },
                    { label: "我的手机号码：", name: this.userInfo.mobile }
                ];
            } else if (this.formData.role === 'teacher') {
                this.confirmInfo = [
                    { label: "您正在申请加入：", name: this.formData.className },
                    { label: "我的姓名：", name: `${this.formData.teacherData.user_name}` },
                    { label: "我的手机号码：", name: this.userInfo.mobile }
                ];
            }

        },
        bindMobile() {
            //#ifdef MP-WEIXIN
            this.$refs['bind-mobile-by-sms'].open()
            // #endif
        },
        bindMobileSuccess() {
            mutations.updateUserInfo()
        },
        handleNavBack() {
            // 需要提示如果返回需要重填
            uni.showModal({
                title: '您确定要返回吗？',
                content: '返回后需要重新填写信息。',
                success: (res) => {
                    if (res.confirm) {
                        uni.navigateBack();
                    }
                }
            });

        },
        onClickDatetime() {
            this.showDatetimePicker = true;
        },
        // 性别选择方法
        onChooseGender() {
            this.showGenderPicker = true;
        },
        onChooseRelationship() {
            // console.log('点击了选择关系');
            this.showRelationship = true;
        },
        // 性别确认回调
        onConfirmGender(e) {
            this.showGenderPicker = false;
            this.formData.parentData.gender = e.value[0];
        },
        onCancel() {
            this.showRelationship = false;
            this.showGenderPicker = false; // 关闭性别选择器
        },
        onConfirmRelationship(e) {
            this.showRelationship = false;
            this.formData.parentData.relationship = e.value[0];
            // 自动更新家长用户名
            this.formData.parentData.user_name = `${this.formData.parentData.childName}${e.value[0]}`;
        },
        radioChange(n) {
            // 保留已有数据
            const currentData = this.formData;
            const oldData = {
                ...currentData,
                teacherData: currentData.role === 'teacher'
                    ? currentData.teacherData
                    : this.formData.teacherData
            };

            // 重置表单结构
            this.formData = {
                role: n,
                className: oldData.className,
                mobile: oldData.mobile,
                parentData: n === 'parent' ? {
                    ...oldData.parentData,
                    user_name: `${oldData.parentData.childName}${oldData.parentData.relationship}`
                } : oldData.parentData,
                teacherData: n === 'teacher'
                    ? { ...oldData.teacherData }
                    : currentData.teacherData  // 使用当前老师数据
            };

            // 更新缓存
            const cacheData = uni.getStorageSync('tempFormData') || {};
            uni.setStorageSync('tempFormData', {
                ...cacheData,
                role: n,
                // 保留所有数据
                ...this.formData
            });
        },
        onCloseDate() {
            this.showDatetimePicker = false;
        },
        onConfirmDate(e) {
            console.log('onConfirmDate', e);
            this.showDatetimePicker = false;
            // 新增：手动更新birthdate值
            this.formData.parentData.birthdate = e.value;
            const date = new Date(this.formData.parentData.birthdate);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0'); // 补零
            const day = String(date.getDate()).padStart(2, '0');       // 补零
            this.showDateStr = `${year}-${month}-${day}`;
        },
    },

    onLoad() {
        // 新增缓存读取逻辑
        const cacheData = uni.getStorageSync('tempFormData') || {};
        console.log('缓存数据', cacheData);
        this.formData = {
            ...this.formData,
            className: cacheData.nickname || '',  // 将nickname映射为className
            role: cacheData.role || 'parent'      // 初始化身份选项
        };
    },  // methods结束
    watch: {
        // 这里需要监听formData的变化
        formData: {
            handler(newVal, oldVal) {
                console.log('formData变化, 新值', newVal);
                console.log('formData变化, 旧值', oldVal);

                // 需要检查birthdate是否有没有改动
                if (newVal.birthdate !== oldVal.birthdate) {
                    // 修改日期格式化逻辑
                    const date = new Date(newVal.birthdate);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0'); // 补零
                    const day = String(date.getDate()).padStart(2, '0');       // 补零
                    this.showDateStr = `${year}-${month}-${day}`;
                    // console.log('showDateStr', this.showDateStr);
                }
            },
            deep: true
        },


    },
    // 删除重复的methods声明块
    onShow() {

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
    margin-bottom: 10rpx;
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
    color: rgba(111, 115, 116, 1);
    font-size: 28rpx;
    text-decoration: underline;
    text-align: center;
    margin-top: 32rpx;
}
</style>