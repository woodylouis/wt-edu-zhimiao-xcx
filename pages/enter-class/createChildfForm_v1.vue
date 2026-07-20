<template>
  <view class="growth-assessment">
    <u-sticky>
      <custom-nav
        :needBack="true"
        :needBar="false"
        :xcxName="'创建学生'"
        :backHandler="handleNavBack"
        navCustomStyle="background: linear-gradient(135deg, #BDF4DC 0%, #74D9B5 48%, #FFD778 100%);height: calc(100vh / 8);"
      />
    </u-sticky>
    <dopamine-flow-header eyebrow="ADD A LITTLE STAR" title="添加成长档案" subtitle="填写孩子的基础信息，开始记录成长" badge="星" tone="mint" :step="1" :total-steps="1" />
    <view class="form-container">
      <student-profile-form
        ref="profileForm"
        v-model="formData"
        :class-name="formData.className"
        mode="create"
        @uploading="avatarUploading = $event"
      />
      <button
        class="submit-button"
        :disabled="loading || avatarUploading"
        hover-class="submit-button--pressed"
        @click="handleSubmit"
      >
        <text>{{ avatarUploading ? '正在上传头像' : '确认创建档案' }}</text>
        <text class="submit-arrow">→</text>
      </button>
    </view>
    <up-overlay :show="show" :opacity="0.52">
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
    <dopamine-loading :show="loading" text="正在创建成长档案" subtext="小芽正在保存孩子的信息" />
    <dopamine-modal
      :show="promptDialog.show"
      :eyebrow="promptDialog.eyebrow"
      :title="promptDialog.title"
      :content="promptDialog.content"
      :confirm-text="promptDialog.confirmText"
      :cancel-text="promptDialog.cancelText"
      :show-cancel="promptDialog.showCancel"
      @confirm="handlePromptConfirm"
      @cancel="handlePromptCancel"
    />
  </view>
</template>

<script>
  import modalBox from "../../components/modalBox-v2/modalBox";
  import DopamineFlowHeader from "./components/dopamineFlowHeader.vue";
  import DopamineLoading from "../../components/dopamine-loading/index.vue";
  import DopamineModal from "../../components/dopamine-modal/index.vue";
  import StudentProfileForm from "@/components/student-profile-form/student-profile-form.vue";
  import {
    CURRENT_CLASS,
    DEFAULT_AVATAR_BOY,
    DEFAULT_AVATAR_GIRL,
  } from "@/lib/types/local_storage.js";

  let currentClass = uni.getStorageSync(CURRENT_CLASS) || {};
  export default {
    components: {
      modalBox,
      DopamineFlowHeader,
      DopamineLoading,
      DopamineModal,
      StudentProfileForm,
    },
    data() {
      return {
        show: false,
        loading: false,
        avatarUploading: false,
        assessmentRedirectUrl: "",
        promptDialog: {
          show: false,
          type: "",
          eyebrow: "温馨提示",
          title: "",
          content: "",
          confirmText: "确定",
          cancelText: "取消",
          showCancel: true,
        },
        formData: {
          className: currentClass.nickname || "",
          name: "",
          gender: "",
          avatar: "",
          birthdate: Number(
            new Date().setFullYear(new Date().getFullYear() - 4)
          ),
        },
        assessmentId: "",
        assessmentTitle: "",
        confirmInfo: [],
      };
    },
    methods: {
      // 模态框确认按钮点击事件
      async handleConfirm() {
        if (this.loading) return;
        this.show = false;
        this.loading = true;

        // 1. 计算并添加年龄相关信息
        const birthDate = new Date(this.formData.birthdate);
        const today = new Date();
        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();
        if (today.getDate() < birthDate.getDate()) months--;
        if (months < 0) {
          years--;
          months += 12;
        }
        const ageStr = `${years}岁${months}个月`;
        const ageInt = years;

        this.formData.class_id = currentClass._id;
        this.formData.age = ageStr;
        this.formData.ageInt = ageInt;

        if (!this.formData.avatar) {
          this.formData.avatar = this.formData.gender === "女孩"
            ? DEFAULT_AVATAR_GIRL
            : DEFAULT_AVATAR_BOY;
        }

        try {
          const childrenRes = await uniCloud.callFunction({
            name: "wtdb-business-children-edit",
            data: {
              submitChildrenData: this.formData,
              uniIdToken: uni.getStorageSync("uni_id_token"),
            },
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

            if (this.assessmentId && this.assessmentTitle) {
              const assessmentParams = {
                classId: currentClass._id,
                className: currentClass.nickname,
                childId: childrenRes.result.data.child_id,
                avatar: this.formData.avatar,
                childName: this.formData.name,
                childAge: ageStr,
                ageInt,
                assessmentId: this.assessmentId,
                assessmentTitle: this.assessmentTitle,
              };
              const assessmentQuery = Object.entries(assessmentParams)
                .map(([key, value]) => `${key}=${encodeURIComponent(value || "")}`)
                .join("&");
              this.assessmentRedirectUrl = `/pages/assessment/listMoudules?${assessmentQuery}`;
              this.promptDialog = {
                show: true,
                type: "assessment",
                eyebrow: "成长档案创建成功",
                title: "现在开始评估吗？",
                content: "孩子的档案已经准备好，可以直接进入 ABLLS 评估。",
                confirmText: "开始评估",
                cancelText: "稍后再说",
                showCancel: true,
              };
            } else {
              uni.redirectTo({ url: "/pages/dashboard/teacher/teacher" });
            }
          } else {
            uni.showToast({
              title: childrenRes.result.message || `创建失败，请重试`,
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
        }
      },
      async handleSubmit() {
        const value = await this.$refs.profileForm.validate();
        if (!value) return;
        this.formData = { ...this.formData, ...value };
        this.show = true;
        this.confirmInfo = [
          { label: "正在加入：", name: this.formData.className },
          { label: "学生名字：", name: this.formData.name },
          { label: "学生性别：", name: this.formData.gender },
          {
            label: "出生日期：",
            name: this.$refs.profileForm.formatBirthday(this.formData.birthdate),
          },
        ];
      },
      handleNavBack() {
        this.promptDialog = {
          show: true,
          type: "back",
          eyebrow: "再确认一下",
          title: "确定返回吗？",
          content: "返回后需要重新填写孩子的信息。",
          confirmText: "确定返回",
          cancelText: "继续填写",
          showCancel: true,
        };
      },
      handlePromptConfirm() {
        const type = this.promptDialog.type;
        this.promptDialog.show = false;
        if (type === "back") {
          uni.navigateBack();
        } else if (type === "assessment" && this.assessmentRedirectUrl) {
          uni.redirectTo({ url: this.assessmentRedirectUrl });
        }
      },
      handlePromptCancel() {
        const type = this.promptDialog.type;
        this.promptDialog.show = false;
        if (type === "assessment") {
          uni.redirectTo({ url: "/pages/dashboard/teacher/teacher" });
        }
      },
    },

    onLoad(options) {
      this.assessmentId = options.assessmentId || "";
      this.assessmentTitle = options.assessmentTitle || "";
      currentClass = uni.getStorageSync(CURRENT_CLASS) || {};
      this.formData.className = currentClass.nickname || "";
    },
  };
</script>

<style lang="scss" scoped>
  .form-container {
    position: relative;
    min-height: 80vh;
    padding: 34rpx 32rpx 90rpx;
    display: flex;
    flex-direction: column;
    background:
      radial-gradient(circle at 94% 14%, rgba(165, 139, 255, 0.2) 0 92rpx, transparent 94rpx),
      linear-gradient(180deg, #fff8df 0%, #fff4ed 48%, #f4efff 100%);
  }

  .warp {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }

  .submit-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16rpx;
    width: 100%;
    height: 96rpx;
    margin: 42rpx 0 0;
    padding: 0;
    color: #fff;
    border: 4rpx solid #392f59;
    border-radius: 28rpx;
    background: #7c63e8;
    box-shadow: 8rpx 8rpx 0 #ffd447;
    font-size: 31rpx;
    font-weight: 900;

    &::after {
      border: 0;
    }

    &[disabled] {
      color: #827b94;
      border-color: #827b94;
      background: #ded9e9;
      box-shadow: 6rpx 6rpx 0 #c7c0d5;
    }
  }

  .submit-button--pressed {
    transform: translate(4rpx, 4rpx);
    box-shadow: 3rpx 3rpx 0 #ffd447;
  }

  .submit-arrow {
    font-size: 38rpx;
    font-weight: 900;
  }

  @import "./dopamine-flow.scss";
</style>
