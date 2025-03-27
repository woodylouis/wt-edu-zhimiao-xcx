<template>
    <view class="growth-assessment">
        <u-sticky>
            <custom-nav :needBack="true" />
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
                    <view class="input-group">
                        <text class="input-label">孩子称呼</text>
                        <u-form-item prop="childName" :borderBottom="false">
                            <u--input placeholder="请输入孩子名称" border="false" :custom-style="inputStyle" />
                        </u-form-item>
                    </view>
                    <view class="input-group">
                        <text class="input-label">出生年月</text>
                        <u-form-item prop="childName" :borderBottom="false">
                            <view @click="onClickRelationship"><u--input v-model="formData.relationship" placeholder="请输入孩子的生日" border="false" :custom-style="inputStyle" disabled /></view>
                            <u-datetime-picker :show="showDatetimePickeer" closeOnClickOverlay v-model="formData.birthdate" @confirm="onConfirmDate" mode="date"></u-datetime-picker>
                        </u-form-item>
                    </view>

                    <view class="input-group">
                        <text class="input-label">我是孩子的</text>
                        <u-form-item prop="relationship" :borderBottom="false">
                            <view @click="onClickRelationship"><u--input v-model="formData.relationship" placeholder="请输入您和孩子的关系" border="false" :custom-style="inputStyle" disabled /></view>
                            <u--picker :show="showRelationship" :columns="columns" @confirm="confirm"></u--picker>
                        </u-form-item>
                    </view>


                    <view class="input-group">
                        <text class="input-label">我的手机号码</text>
                        <u-form-item prop="mobile" :borderBottom="false">
                            <u--input v-model="formData.mobile" placeholder="请输入手机号码" border="false" :custom-style="inputStyle" />
                        </u-form-item>
                    </view>

                    <u-button @click="handleSubmit" :custom-style="buttonStyle">创建新班级</u-button>

                    <text class="help-link" @click="handleHelp">遇到问题？查看帮助</text>
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
            showRelationship: false,
            showDatetimePickeer: false,
            formData: {
                role: "parent",
                className: "小班三班",
                childName: "",
                mobile: "",
                birthdate: ""
            },
            role: [{
                name: '家长',
                role: 'parent'
            },
            {
                name: '老师',
                role: 'teacher'
            },
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
        };
    },
    // 修正handleSubmit中的逻辑
    methods: {
        onClickRelationship() {
            console.log('点击了关系');
            this.showRelationship = true;
        },
        confirm(e) {
            console.log('选择了关系', e.value[0]);
            this.showRelationship = false;
            this.formData.relationship = e.value[0];
        },
        radioChange(n) {
            console.log('radioChange', n);
        },
        onCloseDate() {

        },
        onCancelDate() {
        },
        onConfirmDate(e) {

        },
        onChangeDatechange(e) {
            // console.log('change', e)
        },
    },  // methods结束
    watch: {

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