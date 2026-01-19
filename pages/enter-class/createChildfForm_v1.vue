<template>
  <view class="growth-assessment">
    <u-sticky>
      <custom-nav
        :needBack="true"
        :xcxName="'创建学生'"
        :backHandler="handleNavBack"
      />
    </u-sticky>
    <view class="form-container">
      <view class="form-description"
        >正在加入<span style="font-weight: bold"
          >【{{ formData.className }}】</span
        >，请填写以下信息</view
      >
      <u--form
        :model="formData"
        :rules="rules"
        ref="uForm"
        errorType="message"
        :borderBottom="false"
      >
        <view class="form-content">
          <view>
            <view class="input-group">
              <text class="input-label">孩子称呼</text>
              <u-form-item prop="name" :borderBottom="false">
                <u--input
                  v-model="formData.name"
                  placeholder="请输入孩子的真实名字"
                  border="false"
                  :custom-style="inputStyle"
                  clearable
                />
              </u-form-item>
            </view>
            <view class="input-group">
              <text class="input-label">孩子性别</text>
              <u-form-item prop="gender" :borderBottom="false">
                <view @click="onChooseGender">
                  <u--input
                    v-model="formData.gender"
                    placeholder="请选择孩子的性别"
                    border="false"
                    :custom-style="inputStyle"
                    disabled
                  />
                </view>
                <u--picker
                  :show="showGenderPicker"
                  :columns="genderColumns"
                  @confirm="onConfirmGender"
                  @cancel="onCancel"
                  :closeOnClickOverlay="true"
                  @close="onCancel"
                ></u--picker>
              </u-form-item>
            </view>
            <view class="input-group">
              <text class="input-label">出生年月</text>
              <u-form-item :borderBottom="false" prop="birthday">
                <view @click="onClickDatetime">
                  <u--input
                    v-model="showDateStr"
                    placeholder="请输入孩子的生日"
                    border="false"
                    :custom-style="inputStyle"
                    disabled
                    clearable
                  />
                </view>
                <u-datetime-picker
                  v-model="formData.birthdate"
                  :show="showDatetimePicker"
                  :closeOnClickOverlay="true"
                  @close="onCancel"
                  @cancel="onCancel"
                  @confirm="onConfirmDate"
                  @change="onChangeDatechange"
                  :minDate="minDate"
                  :maxDate="maxDate"
                  mode="date"
                ></u-datetime-picker>
              </u-form-item>
            </view>
          </view>
          <u-button @click="handleSubmit" :custom-style="buttonStyle"
            >下一步</u-button
          >

          <!-- <text class="help-link" @click="handleHelp">遇到问题？查看帮助</text> -->
        </view>
      </u--form>
    </view>
    <up-overlay :show="show">
      <view class="warp">
        <modal-box
          v-if="show"
          :items="confirmInfo"
          confirmText="确定"
          @cancel="show = false"
          @create="handleConfirm"
        />
      </view>
    </up-overlay>
  </view>
</template>

<script>
  // 导入modlBox组件
  import modalBox from "../../components/modalBox-v2/modalBox";
  import {
    CURRENT_CLASS,
    DEFAULT_AVATAR_BOY,
    DEFAULT_AVATAR_GIRL,
  } from "@/lib/types/local_storage.js";

  let currentClass = uni.getStorageSync(CURRENT_CLASS) || {};
  import { store, mutations } from "@/uni_modules/uni-id-pages/common/store.js";
  export default {
    computed: {
      userInfo() {
        return store.userInfo;
      },
    },
    components: {
      modalBox,
    },
    // 在data中修正show定义位置
    data() {
      return {
        show: false, // 移动到顶层
        loading: false, // 提交状态锁
        showRelationship: false, // 重命名为关系选择器状态
        showGenderPicker: false, // 新增性别选择器状态
        showDatetimePicker: false,
        showDateStr: "",
        formData: {
          className: currentClass.nickname || "",
          name: "",
          gender: "",
          birthdate: Number(
            new Date().setFullYear(new Date().getFullYear() - 4)
          ),
        },
        minDate: Number(
          new Date(new Date().setFullYear(new Date().getFullYear() - 10))
        ),
        maxDate: Number(
          new Date(new Date().setFullYear(new Date().getFullYear() - 1))
        ),
        assessmentId: "",
        assessmentTitle: "",
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
            name: "老师",
            role: "teacher",
          },
        ],
        genderColumns: [["男孩", "女孩"]],
        columns: [["老师"]],
        rules: {
          "teacherData.user_name": [
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
            },
          ],
          name: [
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
            },
          ],
          gender: [
            {
              required: true,
              message: "请选择孩子性别",
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
          marginTop: "40rpx",
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
        console.log("handleCodeBlur", e);
        this.$forceUpdate();
      },
      // 模态框确认按钮点击事件
      async handleConfirm() {
        if (this.loading) return;
        this.loading = true;
        uni.showLoading({
          title: "提交中...",
          mask: true,
        });

        this.formData.class_id = currentClass._id;
        if (this.formData.gender === "男孩") {
          this.formData.avatar = DEFAULT_AVATAR_BOY;
        } else {
          this.formData.avatar = DEFAULT_AVATAR_GIRL;
        }
        try {
          const childrenRes = await uniCloud.callFunction({
            name: "wtdb-business-children-edit",
            data: { submitChildrenData: this.formData },
          });

        if (childrenRes.result.code === 200) {
          // 记录新创建的学生ID，优先在教师端显示
          const app = getApp();
          if (app && app.globalData) {
            if (!app.globalData.newlyCreatedStudentIds) {
              app.globalData.newlyCreatedStudentIds = [];
            }
            app.globalData.newlyCreatedStudentIds.push(
              childrenRes.result.data.child_id
            );
          }

          const birthDate = new Date(this.formData.birthdate);
          const today = new Date();
          let years = today.getFullYear() - birthDate.getFullYear();
          let months = today.getMonth() - birthDate.getMonth();
          if (today.getDate() < birthDate.getDate()) months--;
          if (months < 0) {
            years--;
            months += 12;
          }
          const age = `${years}岁${months}个月`;
          const ageInt = years;

          if (this.assessmentId && this.assessmentTitle) {
            uni.showModal({
              title: "创建成功",
              content: "是否直接进入ABLLS评估？",
              success: (res) => {
                if (res.confirm) {
                  uni.redirectTo({
                    url:
                      `/pages/assessment/listMoudules?classId=${currentClass._id}` +
                      `&className=${currentClass.nickname}` +
                      `&childId=${childrenRes.result.data.child_id}` +
                      `&avatar=${this.formData.avatar}` +
                      `&childName=${this.formData.name}` +
                      `&childAge=${age}` +
                      `&ageInt=${ageInt}` +
                      `&assessmentId=${this.assessmentId}` +
                      `&assessmentTitle=${this.assessmentTitle}`,
                  });
                } else if (res.cancel) {
                  uni.redirectTo({ url: "/pages/dashboard/teacher/teacher" });
                }
              },
            });
          } else {
            uni.redirectTo({ url: "/pages/dashboard/teacher/teacher" });
          }
        } else {
          uni.showToast({
            title: `创建失败，请重试`,
            icon: "none",
          });
        }
      } catch (error) {
        uni.showToast({
          title: `系统错误，请重试`,
          icon: "none",
        });
      } finally {
        this.loading = false;
        uni.hideLoading();
      }
    },
      async handleSubmit() {
        try {
          const valid = await this.$refs.uForm.validate();
          if (valid) {
            console.log("表单数据校验 teacher", valid);
            this.show = true;
            this.confirmInfo = [
              { label: "正在加入：", name: this.formData.className },
              { label: "学生名字：", name: this.formData.name },
              { label: "学生性别：", name: this.formData.gender },
              { label: "学生出生年月：", name: this.showDateStr },
            ];
          }
        } catch (error) {
          // 处理数组类型的错误对象
          console.log("error", error);
          uni.showToast({
            title: `请输入必要的信息2`,
            icon: "none",
          });
        }
      },
      handleNavBack() {
        // 需要提示如果返回需要重填
        uni.showModal({
          title: "您确定要返回吗？",
          content: "返回后需要重新填写信息。",
          success: (res) => {
            if (res.confirm) {
              uni.navigateBack();
            }
          },
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
        this.formData.gender = e.value[0];
        // 新增性别字段验证触发
        this.$refs.uForm.validateField("gender");
      },
      onCancel() {
        this.showRelationship = false;
        this.showDatetimePicker = false;
        this.showGenderPicker = false; // 关闭性别选择器
        this.$refs.uForm.validateField("gender");
        this.$refs.uForm.validateField("relationship");
      },

      // onCloseDate() {
      //     this.showDatetimePicker = false;
      // },
      onConfirmDate(e) {
        this.showDatetimePicker = false;
        this.formData.birthdate = e.value;
        const date = new Date(this.formData.birthdate);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        this.showDateStr = `${year}-${month}-${day}`;
        this.$refs.uForm.validateField("birthdate");
        // 新增验证触发
      },
      onChangeDatechange(e) {
        console.log("onChangeDatechange", e);
        this.formData.birthdate = e.value;
      },
    },

    onLoad(options) {
      console.log(options);
      // 新增：初始化时立即格式化日期
      const initDate = new Date(this.formData.birthdate);
      const year = initDate.getFullYear();
      const month = String(initDate.getMonth() + 1).padStart(2, "0");
      const day = String(initDate.getDate()).padStart(2, "0");
      this.assessmentId = options.assessmentId;
      this.assessmentTitle = options.assessmentTitle;
      this.showDateStr = `${year}-${month}-${day}`;
      currentClass = uni.getStorageSync(CURRENT_CLASS);
      this.formData.className = currentClass.nickname || "";
    }, // methods结束
    watch: {
      // 这里需要监听formData的变化
      formData: {
        handler(newVal) {
          // 确保每次birthdate变化都更新showDateStr
          const date = new Date(newVal.birthdate);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          this.showDateStr = `${year}-${month}-${day}`;
        },
        deep: true,
        immediate: true,
      },
    },
    onReady() {
      //如果需要兼容微信小程序，并且校验规则中含有方法等，只能通过setRules方法设置规则。
      this.$refs.uForm.setRules(this.rules);
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
    color: #3d464a;
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
