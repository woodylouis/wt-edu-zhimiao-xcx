<template>
    <view class="growth-assessment">
        <u-sticky>
            <custom-nav :needBack="true" :xcxName="'申请加入'" :backHandler="handleNavBack" />
        </u-sticky>
        <view class="form-container">
            <view class="form-description">您正在加入<span style="font-weight: bold;">【{{ formData.className
            }}】</span>，请填写以下信息</view>
            <u--form :model="formData" :rules="rules" ref="uForm" errorType="message" :borderBottom="false">
                <view class="form-content">
                    <view class="input-group">
                        <text class="input-label">我的身份</text>
                        <u-radio-group v-model="formData.role" activeColor="rgba(110, 221, 138, 1)"
                            labelColor="#00214D">
                            <u-radio :customStyle="{ marginBottom: '8px' }" v-for="(item, index) in role" :key="index"
                                :label="item.name" :name="item.role" @change="radioChange" />
                        </u-radio-group>
                    </view>
                    <view>
                        <view class="input-group">
                            <text class="input-label">孩子称呼</text>
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
                            <text class="input-label">出生年月</text>
                            <u-form-item :borderBottom="false">
                                <view @click="onClickDatetime">
                                    <u--input v-model="showDateStr" placeholder="请输入孩子的生日" border="false"
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
                                <view @click="onChooseRelationship"><u--input v-model="formData.parentData.relationship"
                                        placeholder="请输入您和孩子的关系" border="false" :custom-style="inputStyle" disabled />
                                </view>
                                <u--picker :show="showRelationship" :columns="columns" @confirm="onConfirmRelationship"
                                    @cancel="onCancel" :closeOnClickOverlay="true" @close="onCancel"></u--picker>
                            </u-form-item>
                        </view>
                    </view>
                    <view v-if="formData.role === 'teacher'">
                        <view class="input-group">
                            <text class="input-label">我的姓名</text>
                            <u-form-item prop="teacherData.user_name" :borderBottom="false">
                                <u--input v-model="formData.teacherData.user_name" placeholder="请输入姓名" border="false"
                                    :custom-style="inputStyle" />
                            </u-form-item>
                        </view>
                    </view>

                    <view class="input-group">
                        <text class="input-label">我的手机号码</text>
                        <u-form-item prop="mobile" :borderBottom="false" @click="bindMobile">
                            <u--input v-model="formData.mobile" placeholder="绑定手机号码" border="false"
                                :custom-style="inputStyle" disabled />
                        </u-form-item>
                    </view>

                    <u-button @click="handleSubmit" :custom-style="buttonStyle">下一步</u-button>

                    <text class="help-link" @click="handleHelp">遇到问题？查看帮助</text>
                </view>
            </u--form>
        </view>
        <up-overlay :show="show">
            <view class="warp">
                <modal-box v-if="show" :items="confirmInfo" confirmText="确定" @cancel="show = false"
                    @create="handleConfirm" />
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
            // role: [{
            //     name: '家长',
            //     role: 'parent'
            // },
            // {
            //     name: '老师',
            //     role: 'teacher'
            // }],
            role: [
                {
                    name: '老师',
                    role: 'teacher'
                }],
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
                        message: "请输入您的名字",
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

        handleCodeBlur(e) {
            console.log('handleCodeBlur', e);
            this.$forceUpdate()
        },
        // 模态框确认按钮点击事件
        async handleConfirm() {
            const classId = uni.getStorageSync('tempFormData').classInfo._id;
            const classCode = uni.getStorageSync('tempFormData').code;

            if (this.formData.role === 'teacher') {
                // 老师身份直接加入班级
                const submitClassMemberData = {
                    class_id: classId,
                    role: 'teacher',
                    nickname: this.formData.teacherData.user_name,
                    code: classCode
                };

                const memberRes = await uniCloud.callFunction({
                    name: 'wtdb-business-class-enter',
                    data: submitClassMemberData
                });

                if (memberRes.result.code === 200) {
                    this.handleJoinSuccess();
                } else {
                    uni.showToast({
                        title: memberRes.result.msg || '加入班级失败',
                        icon: 'none'
                    });
                }
            } else {
                // 家长身份需要先创建学生
                const submitChildrenData = {
                    class_id: classId,
                    child_name: this.formData.parentData.childName,
                    gender: this.formData.parentData.gender,
                    birthdate: this.formData.parentData.birthdate,
                    avatar: 'https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/girl.png',
                };

                const childrenRes = await uniCloud.callFunction({
                    name: 'wtdb-business-children-edit',
                    data: { submitChildrenData }
                });

                if (childrenRes.result.code === 200) {
                    const submitClassMemberData = {
                        class_id: classId,
                        child_id: childrenRes.result.data.child_id,
                        role: 'parent',
                        nickname: this.formData.parentData.childName + this.formData.parentData.relationship,
                        relationship: this.formData.parentData.relationship,
                        code: classCode
                    };

                    const memberRes = await uniCloud.callFunction({
                        name: 'wtdb-business-class-enter',
                        data: submitClassMemberData
                    });

                    if (memberRes.result.code === 200) {
                        this.handleJoinSuccess();
                    } else {
                        uni.showToast({
                            title: memberRes.result.msg || '加入班级失败',
                            icon: 'none'
                        });
                    }
                }
            }
        },
        // 新增成功处理公共方法
        handleJoinSuccess() {
            this.show = false;
            uni.showToast({ title: '加入班级成功', icon: 'none' });

            uniCloud.callFunction({ name: 'wtdb-business-class-list' }).then(classRes => {
                if (classRes.result.code === 200 && classRes.result.data.length > 0) {
                    const newClass = classRes.result.data[classRes.result.data.length - 1];
                    uni.setStorageSync('currentClass', newClass);
                    uni.reLaunch({ url: '/pages/dashboard/teacher/teacher' });
                }
            });
        },
        async handleSubmit() {
            if (this.formData.role === 'parent') {
                console.log('parent');
                // 校验
                try {
                    const valid = await this.$refs.uForm.validate()
                    if (valid) {
                        console.log('表单数据校验 parent', valid);
                        this.show = true;
                        this.confirmInfo = [
                            { label: "您正在申请加入：", name: this.formData.className },
                            { label: "孩子称呼：", name: this.formData.parentData.childName },
                            { label: "孩子性别：", name: this.formData.parentData.gender },
                            { label: "出生年月：", name: this.showDateStr },
                            { label: "我是孩子的：", name: this.formData.parentData.relationship },
                            // 修正手机号绑定
                            { label: "我的手机号码：", name: this.formData.mobile }
                        ];
                    }
                } catch (error) {
                    // 处理数组类型的错误对象
                    console.log('error', error);
                    uni.showToast({
                        title: `请输入必要的信息1`,
                        icon: "none"
                    })
                }
            } else if (this.formData.role === 'teacher') {
                try {
                    const valid = await this.$refs.uForm.validate()
                    if (valid) {
                        console.log('表单数据校验 teacher', valid);
                        this.show = true;
                        this.confirmInfo = [
                            { label: "您正在申请加入：", name: this.formData.className },
                            { label: "我的姓名：", name: `${this.formData.teacherData.user_name}` },
                            { label: "我的手机号码：", name: this.userInfo.mobile }
                        ];
                    }
                } catch (error) {
                    // 处理数组类型的错误对象
                    uni.showToast({
                        title: `请输入必要的信息2`,
                        icon: "none"
                    })
                }

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
            this.formData.parentData.relationship = e.value[0];
            // 添加关系字段验证触发
            this.$refs.uForm.validateField('parentData.relationship');
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

    onLoad() {
        // 新增缓存读取逻辑
        const cacheData = uni.getStorageSync('tempFormData') || {};
        this.formData = {
            ...this.formData,
            className: cacheData.nickname || '',
            class_id: cacheData.classInfo._id,
            role: cacheData.role || 'parent'
        };
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
</style>