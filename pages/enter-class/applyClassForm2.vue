<template>
    <view class="growth-assessment">
        <u-sticky>
            <custom-nav :needBack="true" :needBar="false" :xcxName="'申请加入'" :backHandler="handleNavBack"
                navCustomStyle="background: linear-gradient(135deg, #D8CDFF 0%, #A98CFF 48%, #FFB8AC 100%);height: calc(100vh / 8);" />
        </u-sticky>
        <dopamine-flow-header eyebrow="JOIN THE GROWTH CLASS" title="确认加入资料" subtitle="申请资料只用于班级身份确认" badge="02" tone="mint" :step="2" :total-steps="2" />
        <view class="form-container">
            <view class="form-description">您正在加入<span style="font-weight: bold;">【{{ formData.className
            }}】</span>，请填写以下信息</view>
            <u--form :model="formData" :rules="rules" ref="uForm" errorType="message" :borderBottom="false">
                <view class="form-content">
                    <view class="input-group">
                        <text class="input-label">我的身份</text>
                        <view class="role-choice-card" :class="{ 'role-choice-card--parent': formData.role === 'parent' }">
                            <view class="role-choice-icon">{{ selectedRoleInfo.icon }}</view>
                            <view class="role-choice-copy">
                                <text class="role-choice-title">{{ selectedRoleInfo.name }}</text>
                                <text class="role-choice-desc">{{ selectedRoleInfo.description }}</text>
                            </view>
                            <view class="role-choice-check">✓</view>
                        </view>
                    </view>
                    <view v-if="formData.role === 'parent'">
                        <view class="input-group">
                            <text class="input-label">孩子姓名</text>
                            <u-form-item prop="parentData.childName" :borderBottom="false">
                                <u--input v-model="formData.parentData.childName" placeholder="请输入孩子的真实名字"
                                    border="false" :custom-style="inputStyle" clearable />
                            </u-form-item>
                        </view>
                        <view class="input-group">
                            <text class="input-label">孩子性别</text>
                            <u-form-item prop="parentData.gender" :borderBottom="false">
                                <view @click="onChooseGender">
                                    <u--input v-model="formData.parentData.gender" placeholder="请选择孩子的性别" border="false"
                                        :custom-style="inputStyle" disabled />
                                </view>
                                <u--picker :show="showGenderPicker" :columns="genderColumns" @confirm="onConfirmGender"
                                    @cancel="onCancel" :closeOnClickOverlay="true" @close="onCancel"></u--picker>
                            </u-form-item>
                        </view>

                        <view class="input-group">
                            <text class="input-label">出生日期</text>
                            <u-form-item prop="parentData.birthdate" :borderBottom="false">
                                <view @click="onClickDatetime">
                                    <u--input v-model="showDateStr" placeholder="请选择孩子的生日" border="false"
                                        :custom-style="inputStyle" disabled clearable />
                                </view>
                                <u-datetime-picker v-model="formData.parentData.birthdate" :show="showDatetimePicker"
                                    :closeOnClickOverlay="true" @close="onCancel" @cancel="onCancel"
                                    @confirm="onConfirmDate" @change="onChangeDatechange" :minDate="minDate"
                                    :maxDate="maxDate" mode="date"></u-datetime-picker>
                            </u-form-item>
                        </view>

                        <view class="input-group">
                            <text class="input-label">我是孩子的</text>
                            <u-form-item prop="parentData.relationship" :borderBottom="false">
                                <view @click="onChooseRelationship"><u--input v-model="formData.parentData.relationshipLabel"
                                        placeholder="请选择您和孩子的关系" border="false" :custom-style="inputStyle" disabled />
                                </view>
                                <u--picker :show="showRelationship" :columns="columns" @confirm="onConfirmRelationship"
                                    @cancel="onCancel" :closeOnClickOverlay="true" @close="onCancel"></u--picker>
                            </u-form-item>
                        </view>
                    </view>
                    <view v-if="formData.role === 'teacher'">
                        <view class="input-group">
                            <text class="input-label">昵称</text>
                            <u-form-item prop="teacherData.user_name" :borderBottom="false">
                                <u--input v-model="formData.teacherData.user_name" placeholder="请先在个人资料中设置昵称" border="false"
                                    :custom-style="{ ...inputStyle, backgroundColor: '#EEE9FF', color: '#6F6880' }" disabled />
                            </u-form-item>
                        </view>
                    </view>

                    <view class="input-group">
                        <text class="input-label">我的手机号码</text>
                        <u-form-item prop="mobile" :borderBottom="false" @click="bindMobile">
                            <u--input v-model="formData.mobile" placeholder="绑定手机号码" border="false"
                                :custom-style="{ ...inputStyle, backgroundColor: '#E2F8EE', color: '#5E756B' }" disabled />
                        </u-form-item>
                    </view>

                    <u-button @click="handleSubmit" :custom-style="buttonStyle">提交入班申请</u-button>

                    <text class="help-link" @click="handleHelp">遇到问题？查看帮助</text>
                </view>
            </u--form>
        </view>
        <up-overlay :show="show" :opacity="0.52">
            <view class="warp">
                <modal-box v-if="show" :items="confirmInfo" confirmText="确定" @cancel="show = false"
                    @create="handleConfirm" />
            </view>
        </up-overlay>

        <uni-id-pages-bind-mobile ref="bind-mobile-by-sms" @success="bindMobileSuccess"></uni-id-pages-bind-mobile>
        <dopamine-loading :show="submitting" text="正在提交入班申请" subtext="小芽正在把申请送给班主任" />
        <dopamine-modal
            :show="promptDialog.show"
            :eyebrow="promptDialog.eyebrow"
            :title="promptDialog.title"
            :content="promptDialog.content"
            :confirm-text="promptDialog.confirmText"
            cancel-text="继续填写"
            :show-cancel="promptDialog.showCancel"
            @confirm="handlePromptConfirm"
            @cancel="promptDialog.show = false"
        />
    </view>
</template>

<script>
// 导入modlBox组件
import modalBox from '../../components/modalBox-v2/modalBox';
import DopamineFlowHeader from './components/dopamineFlowHeader.vue';
import DopamineLoading from '../../components/dopamine-loading/index.vue';
import DopamineModal from '../../components/dopamine-modal/index.vue';
import {
    store,
    mutations
} from '@/uni_modules/uni-id-pages/common/store.js'
export default {
    computed: {
        userInfo() {
            return store.userInfo
        },
        selectedRoleInfo() {
            return this.formData.role === 'parent'
                ? { name: '家长', icon: '家', description: '关联孩子，查看已完成的成长报告' }
                : { name: '老师', icon: '师', description: '参与班级管理与成长评估' }
        },
    },
    components: {
        modalBox,
        DopamineFlowHeader,
        DopamineLoading,
        DopamineModal,
    },
    // 在data中修正show定义位置
    data() {
        return {
            show: false,  // 移动到顶层
            submitting: false,
            promptDialog: {
                show: false,
                type: '',
                eyebrow: '温馨提示',
                title: '',
                content: '',
                confirmText: '确定',
                showCancel: true
            },
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
                    relationship: "",
                    relationshipLabel: ""
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
            genderColumns: [
                ['男孩', '女孩']
            ],
            columns: [
                ['爸爸', '妈妈', '爷爷', '奶奶', '其他']
            ],
            rules: {
                'teacherData.user_name': [
                    {
                        required: true,
                        message: "请先设置昵称",
                        trigger: ["change", "blur"],
                    },
                ],
                'parentData.childName': [
                    {
                        required: true,
                        message: "请输入孩子名字",
                        trigger: ["change", "blur"],
                    },
                    {
                        min: 1,
                        max: 10,
                        message: "姓名长度在1-10个字符之间",
                        trigger: ["change", "blur"],
                    },
                    {
                        pattern: /^(?!.*(老师|小朋友|儿童|学生)).+$/,
                        message: "姓名不能包含老师、小朋友、儿童、学生等词语",
                        trigger: ["change", "blur"],
                    }
                ],
                'parentData.gender': [
                    {
                        required: true,
                        message: "请选择孩子性别",
                        trigger: ["change", "blur"],
                    }
                ],
                'parentData.relationship': [
                    {
                        required: true,
                        message: "请输入你和孩子的关系",
                        trigger: ["change", "blur"],
                    },
                ],
                'parentData.birthdate': [
                    {
                        required: true,
                        message: "请选择孩子出生日期",
                        trigger: ["change", "blur"],
                    },
                ],
                mobile: [
                    {
                        required: true,
                        message: "请绑定你的手机号码",
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
        handleCodeBlur(e) {
            console.log('handleCodeBlur', e);
            this.$forceUpdate()
        },
        // 模态框确认按钮点击事件
        async handleConfirm() {
            if (this.submitting) return;
            const cacheData = uni.getStorageSync('tempFormData') || {};
            const classInfo = cacheData.classInfo || {};
            if (!classInfo._id || !cacheData.code) {
                uni.showToast({ title: '班级信息已失效，请重新查找', icon: 'none' });
                return;
            }
            this.submitting = true;
            try {
                const requestData = {
                    action: 'submit',
                    classId: classInfo._id,
                    classCode: cacheData.code,
                    requestedRole: this.formData.role,
                    uniIdToken: uni.getStorageSync('uni_id_token')
                };
                if (this.formData.role === 'parent') {
                    Object.assign(requestData, {
                        childName: this.formData.parentData.childName,
                        childGender: this.formData.parentData.gender,
                        childBirthdate: this.formData.parentData.birthdate,
                        relationship: this.formData.parentData.relationship
                    });
                }
                const { result } = await uniCloud.callFunction({
                    name: 'wtdb-class-approval',
                    data: requestData
                });

                if (result.code !== 200) {
                    throw new Error(result.msg || '申请提交失败');
                }
                this.handleApplySuccess(result.data?.existing);
            } catch (error) {
                uni.showToast({
                    title: error.message || '申请提交失败',
                    icon: 'none'
                });
            } finally {
                this.submitting = false;
            }
        },
        // 申请提交后不直接入班，审批通过后才会创建对应的成员关系
        handleApplySuccess(existing) {
            this.show = false;
            uni.removeStorageSync('tempFormData');
            this.promptDialog = {
                show: true,
                type: 'success',
                eyebrow: '申请已送达',
                title: existing ? '申请正在审批中' : '申请提交成功',
                content: this.formData.role === 'parent'
                    ? '审批通过后会建立孩子档案与亲子班级关系，随后即可查看已完成的成长报告。'
                    : '通过后，该班级会自动出现在您的班级列表中。',
                confirmText: '我知道了',
                showCancel: false
            };
        },
        async handleSubmit() {
            try {
                const valid = await this.$refs.uForm.validate()
                if (!valid) return
                this.confirmInfo = this.formData.role === 'parent'
                    ? [
                        { label: "您正在申请加入：", name: this.formData.className },
                        { label: "孩子姓名：", name: this.formData.parentData.childName },
                        { label: "孩子性别：", name: this.formData.parentData.gender },
                        { label: "出生日期：", name: this.showDateStr },
                        { label: "我是孩子的：", name: this.formData.parentData.relationshipLabel },
                        { label: "我的手机号码：", name: this.formData.mobile }
                    ]
                    : [
                        { label: "您正在申请加入：", name: this.formData.className },
                        { label: "我的昵称：", name: `${this.formData.teacherData.user_name}` },
                        { label: "我的手机号码：", name: this.formData.mobile }
                    ];
                this.show = true;
            } catch (error) {
                const firstError = Array.isArray(error) ? error[0]?.message : error?.message;
                uni.showToast({
                    title: firstError || '请完善申请资料',
                    icon: "none"
                })
            }
        },
        bindMobile() {
            //#ifdef MP-WEIXIN
            this.$refs['bind-mobile-by-sms'].open()
            this.$refs.uForm.validateField('mobile');
            // #endif
        },
        bindMobileSuccess() {
            mutations.updateUserInfo()
            this.$refs.uForm.validateField('mobile');
        },
        handleNavBack() {
            this.promptDialog = {
                show: true,
                type: 'back',
                eyebrow: '再确认一下',
                title: '确定返回上一步吗？',
                content: '当前填写的信息会保留，您可以稍后继续。',
                confirmText: '返回上一步',
                showCancel: true
            };

        },
        handlePromptConfirm() {
            const type = this.promptDialog.type;
            this.promptDialog.show = false;
            if (type === 'success') {
                uni.reLaunch({ url: '/pages/enter-class/index' });
            } else if (type === 'back') {
                uni.navigateBack();
            }
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
            // 新增性别字段验证触发
            this.$refs.uForm.validateField('parentData.gender');
        },
        onCancel() {
            this.showRelationship = false;
            this.showDatetimePicker = false;
            this.showGenderPicker = false; // 关闭性别选择器
            this.$refs.uForm.validateField('parentData.gender');
            this.$refs.uForm.validateField('parentData.relationship');
        },
        onConfirmRelationship(e) {
            this.showRelationship = false;
            const label = e.value[0];
            const relationshipMap = {
                '爸爸': 'father',
                '妈妈': 'mother',
                '爷爷': 'grandfather',
                '奶奶': 'grandmother',
                '其他': 'other'
            };
            this.formData.parentData.relationshipLabel = label;
            this.formData.parentData.relationship = relationshipMap[label] || '';
            // 添加关系字段验证触发
            this.$refs.uForm.validateField('parentData.relationship');
        },
        // onCloseDate() {
        //     this.showDatetimePicker = false;
        // },
        onConfirmDate(e) {
            this.showDatetimePicker = false;
            this.formData.parentData.birthdate = e.value;
            const date = new Date(this.formData.parentData.birthdate);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            this.showDateStr = `${year}-${month}-${day}`;
            // 新增验证触发
        },
        onChangeDatechange(e) {
            console.log('onChangeDatechange', e);
            this.formData.parentData.birthdate = e.value;
        },
    },

    async onLoad() {
        // 新增缓存读取逻辑
        const cacheData = uni.getStorageSync('tempFormData') || {};
        const classInfo = cacheData.classInfo || {};
        if (!classInfo._id) {
            uni.showToast({ title: '班级信息已失效，请重新查找', icon: 'none' });
            setTimeout(() => uni.navigateBack(), 800);
            return;
        }
        const selectedRole = ['teacher', 'parent'].includes(cacheData.role)
            ? cacheData.role
            : 'parent';
        this.formData = {
            ...this.formData,
            className: cacheData.nickname || '',
            class_id: classInfo._id,
            role: selectedRole
        };
		const accountInfo = uni.getStorageSync('uni-id-pages-userInfo') || {};
		this.formData.teacherData.user_name = accountInfo.nickname || '';
        console.log('初始化表单数据:', this.formData);

        // 新增：初始化时立即格式化日期
        const initDate = new Date(this.formData.parentData.birthdate);
        const year = initDate.getFullYear();
        const month = String(initDate.getMonth() + 1).padStart(2, '0');
        const day = String(initDate.getDate()).padStart(2, '0');
        this.showDateStr = `${year}-${month}-${day}`;
    },  // methods结束
    watch: {
        // 这里需要监听formData的变化
        formData: {
            handler(newVal) {
                // 确保每次birthdate变化都更新showDateStr
                const date = new Date(newVal.parentData.birthdate);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                this.showDateStr = `${year}-${month}-${day}`;
            },
            deep: true,
            immediate: true
        },
        userInfo: {
            handler(newVal) {
                if (newVal.mobile) {
                    this.formData.mobile = newVal.mobile
                }
            },
            immediate: true,
            deep: true
        }
    },
    onReady() {
        //如果需要兼容微信小程序，并且校验规则中含有方法等，只能通过setRules方法设置规则。
        this.$refs.uForm.setRules(this.rules)
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

@import "./dopamine-flow.scss";

.role-choice-card {
    display: flex;
    min-height: 98rpx;
    box-sizing: border-box;
    align-items: center;
    padding: 18rpx 20rpx;
    border: 3rpx solid #2f2854;
    border-radius: 23rpx;
    background: #fffdf8;
    box-shadow: 4rpx 5rpx 0 rgba(47, 40, 84, 0.16);
}

.role-choice-card--parent {
    background: #eee9ff;
    box-shadow: 5rpx 6rpx 0 #2f2854;
}

.role-choice-icon {
    display: flex;
    width: 60rpx;
    height: 60rpx;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border: 3rpx solid #2f2854;
    border-radius: 19rpx 19rpx 19rpx 7rpx;
    background: #8ee3c2;
    color: #2f2854;
    font-size: 23rpx;
    font-weight: 900;
}

.role-choice-copy {
    display: flex;
    flex: 1;
    flex-direction: column;
    margin-left: 17rpx;
}

.role-choice-title { color: #2f2854; font-size: 25rpx; font-weight: 800; }
.role-choice-desc { margin-top: 5rpx; color: #8a839d; font-size: 19rpx; }
.role-choice-check {
    display: flex;
    width: 38rpx;
    height: 38rpx;
    align-items: center;
    justify-content: center;
    border: 3rpx solid #2f2854;
    border-radius: 50%;
    background: #7657f6;
    color: #ffffff;
    font-size: 20rpx;
    font-weight: 900;
}
</style>
