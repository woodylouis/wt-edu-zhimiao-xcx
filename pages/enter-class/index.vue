<template>
  <view class="enter-class">
    <view class="page-decoration decoration-coral"></view>
    <view class="page-decoration decoration-blue"></view>
    <view class="page-decoration decoration-yellow"></view>

    <!-- 导航 -->
    <view class="navigation">
      <view class="title" :style="xcxNameMarginTopStyle">
        <view class="brand-symbol">
          <view class="sprout-stem"></view>
          <view class="sprout-leaf brand-leaf-left"></view>
          <view class="sprout-leaf brand-leaf-right"></view>
        </view>
        <text class="brand-name">{{ $t("xcxName") }}</text>
        <view class="brand-accent"></view>
      </view>
      <view class="hero-stage">
        <view class="growth-illustration">
          <view class="hero-copy">
            <view v-if="bannerLoggedIn" class="hero-user-chip">
              <view class="hero-user-spark">✦</view>
              <text class="hero-user-greeting">{{ bannerGreeting }}，</text>
              <text class="hero-user-name">{{ bannerNickname }}</text>
            </view>
            <text v-else class="hero-kicker">GROW UP HAPPY</text>
            <text class="hero-title">看见每一次</text>
            <text class="hero-title hero-title-last">小小成长</text>
            <text class="hero-subtitle">用科学评估，发现孩子的闪光点</text>
          </view>

          <view class="hero-art">
            <view class="art-sun"></view>
            <view class="art-spark spark-one">+</view>
            <view class="art-spark spark-two">✦</view>
            <view class="report-card">
              <view class="report-clip"></view>
              <view class="report-face">
                <view class="face-eye"></view>
                <view class="face-eye"></view>
                <view class="face-smile"></view>
              </view>
              <view class="report-line line-long"></view>
              <view class="report-line line-short"></view>
            </view>
            <view class="growth-badge">+1</view>
          </view>
        </view>

        <view class="hero-sticker">快乐成长</view>
        <view class="hero-dot dot-left"></view>
        <view class="hero-dot dot-right"></view>
      </view>
    </view>

    <view class="enter-class-option">
      <view class="section-heading">
        <view class="section-icon">
          <view class="section-icon-dot"></view>
        </view>
        <view class="section-copy">
          <text class="section-title">开启成长旅程</text>
          <text class="section-subtitle">选择一种方式，马上开始吧</text>
        </view>
      </view>

      <view
        v-if="approvalSummary.canReview"
        class="approval-entry"
        hover-class="approval-entry--pressed"
        :hover-stay-time="80"
        @click="openApproval"
      >
        <view class="approval-entry-icon">
          <text>✓</text>
          <view v-if="approvalSummary.pending" class="approval-entry-count">
            {{ approvalSummary.pending > 99 ? '99+' : approvalSummary.pending }}
          </view>
        </view>
        <view class="approval-entry-copy">
          <text class="approval-entry-title">入班审批</text>
          <text class="approval-entry-subtitle">
            {{ approvalEntrySubtitle }}
          </text>
        </view>
        <view class="approval-entry-arrow">›</view>
      </view>

      <view
        v-if="teacherSummary.canManage"
        class="approval-entry teacher-entry"
        hover-class="approval-entry--pressed"
        :hover-stay-time="80"
        @click="openTeacherManagement"
      >
        <view class="approval-entry-icon teacher-entry-icon">
          <text>师</text>
        </view>
        <view class="approval-entry-copy">
          <text class="approval-entry-title">老师管理</text>
          <text class="approval-entry-subtitle">
            {{ teacherManagementSubtitle }}
          </text>
        </view>
        <view class="approval-entry-arrow">›</view>
      </view>

      <!-- <view class="option" @click="onClickButton(0)">
        <view class="title">{{ $t("enterClassMethod.create") }}</view>
        <image class="image" src="../../static/enter-class/create.svg" />
      </view> -->
      <view
        class="option"
        hover-class="option-pressed"
        :hover-stay-time="80"
        @click="onClickButton(1)"
      >
        <view class="option-copy">
          <view class="option-tag">推荐</view>
          <text class="option-title">{{ $t("enterClassMethod.apply") }}</text>
          <text class="option-subtitle">找到孩子的班级，一起记录成长</text>
          <view class="option-action">
            <text>现在加入</text>
            <view class="action-arrow">→</view>
          </view>
        </view>
        <view class="option-visual">
          <view class="visual-orbit orbit-large"></view>
          <view class="visual-orbit orbit-small"></view>
          <image class="image" src="../../static/enter-class/apply.svg" />
        </view>
      </view>

      <view
        class="help-container"
        hover-class="help-pressed"
        :hover-stay-time="80"
        @click="onClickEnter"
      >
        <view class="help-icon">
          <view class="help-person person-back"></view>
          <view class="help-person person-front"></view>
        </view>
        <view class="help-copy">
          <text class="help-label">已经加入过班级？</text>
          <text class="help-link">进入现有班级</text>
        </view>
        <view class="help-arrow">›</view>
      </view>

      <view class="promise-row">
        <view class="promise-item">
          <view class="promise-dot dot-purple"></view>
          <text>科学量表</text>
        </view>
        <view class="promise-divider"></view>
        <view class="promise-item">
          <view class="promise-dot dot-coral"></view>
          <text>温暖陪伴</text>
        </view>
        <view class="promise-divider"></view>
        <view class="promise-item">
          <view class="promise-dot dot-green"></view>
          <text>持续成长</text>
        </view>
      </view>
    </view>

    <up-overlay :show="show" :opacity="0.52">
      <view class="warp">
        <modal-box-mcq
          :tips="tips"
          :confirmText="confirmText"
          :list="modalOptionsList"
          @cancel="onInitModal"
          @create="onConfirm($event)"
        />
        <!-- 传递选中值 -->
      </view>
    </up-overlay>

    <dopamine-modal
      :show="showLoginPrompt"
      eyebrow="开启成长旅程"
      title="登录后再进入班级吧"
      content="登录后就能加入班级，与老师一起记录孩子的每一个闪光瞬间。"
      confirm-text="去登录"
      cancel-text="稍后再说"
      @confirm="handleLoginConfirm"
      @cancel="handleLoginCancel"
    />
    <dopamine-modal
      :show="infoPrompt.show"
      :eyebrow="infoPrompt.eyebrow"
      :title="infoPrompt.title"
      :content="infoPrompt.content"
      confirm-text="我知道了"
      :show-cancel="false"
      @confirm="infoPrompt.show = false"
    />
    <dopamine-loading
      :show="loadingVisible"
      :text="loadingText"
      subtext="小芽正在整理班级信息"
    />
  </view>
</template>

<script>
  // 导入modlBox组件
  import modalBoxMcq from "../../components/modalBox-MCQ";
  import DopamineModal from "../../components/dopamine-modal";
  import DopamineLoading from "../../components/dopamine-loading";

  export default {
    components: {
      modalBoxMcq,
      DopamineModal,
      DopamineLoading,
    },
    computed: {
      approvalEntrySubtitle() {
        return this.approvalSummary.pending
          ? `有 ${this.approvalSummary.pending} 条老师申请待处理`
          : "查看老师入班申请与审批记录";
      },
      teacherManagementSubtitle() {
        return `${this.teacherSummary.teacherCount || 0} 位老师 · ${this.teacherSummary.assignmentCount || 0} 条任教关系`;
      },
      bannerNickname() {
        return (
          this.bannerUserInfo.nickname ||
          this.bannerUserInfo.username ||
          "新朋友"
        );
      },
      bannerGreeting() {
        const hour = new Date().getHours();
        if (hour < 11) return "早上好";
        if (hour < 18) return "下午好";
        return "晚上好";
      },
    },
    data() {
      return {
        xcxNameMarginTopStyle: "",
        show: false,
        modalOptionsList: ["我是老师"],
        tips: "创建班级",
        confirmText: "立即创建",
        isJoinClass: false,
        showLoginPrompt: false,
        loadingVisible: false,
        loadingText: "正在查找班级",
        bannerLoggedIn: false,
        bannerUserInfo: {},
        infoPrompt: {
          show: false,
          eyebrow: "温馨提示",
          title: "还没有班级",
          content: "先申请加入一个班级，再回来开启成长旅程吧。",
        },
        approvalSummary: {
          canReview: false,
          pending: 0,
        },
        teacherSummary: {
          canManage: false,
          teacherCount: 0,
          assignmentCount: 0,
        },
      };
    },
    onLoad() {
      // #ifdef MP-WEIXIN
      uni.showShareMenu({ menus: ["shareAppMessage"] });
      // #endif

      const menuButtonInfo = uni.getMenuButtonBoundingClientRect();
      this.xcxNameMarginTopStyle = `top:${
        menuButtonInfo.top + menuButtonInfo.height / 2
      }px;`;
    },
    onShareAppMessage() {
      return {
        title: "知苗成长｜看见孩子的每一次进步",
        path: "/pages/enter-class/index",
      };
    },
    onShow() {
      this.refreshBannerUser();
      this.loadApprovalSummary();
      this.loadTeacherSummary();
    },
    methods: {
      refreshBannerUser() {
        const token = uni.getStorageSync("uni_id_token");
        const tokenExpired = uni.getStorageSync("uni_id_token_expired");
        const userInfo = uni.getStorageSync("uni-id-pages-userInfo") || {};
        this.bannerUserInfo = userInfo;
        this.bannerLoggedIn = Boolean(
          token && userInfo._id && tokenExpired > Date.now()
        );
      },
      async loadApprovalSummary() {
        const token = uni.getStorageSync("uni_id_token");
        const tokenExpired = uni.getStorageSync("uni_id_token_expired");
        if (!token || tokenExpired <= Date.now()) {
          this.approvalSummary = { canReview: false, pending: 0 };
          return;
        }
        try {
          const { result } = await uniCloud.callFunction({
            name: "wtdb-class-approval",
            data: {
              action: "summary",
              uniIdToken: token,
            },
          });
          if (result.code === 200) {
            this.approvalSummary = result.data || { canReview: false, pending: 0 };
          }
        } catch (error) {
          console.error("审批待办加载失败:", error);
        }
      },
      openApproval() {
        uni.navigateTo({ url: "/pages/approval/list" });
      },
      async loadTeacherSummary() {
        const token = uni.getStorageSync("uni_id_token");
        const tokenExpired = uni.getStorageSync("uni_id_token_expired");
        if (!token || tokenExpired <= Date.now()) {
          this.teacherSummary = { canManage: false, teacherCount: 0, assignmentCount: 0 };
          return;
        }
        try {
          const { result } = await uniCloud.callFunction({
            name: "wtdb-teacher-management",
            data: {
              action: "summary",
              uniIdToken: token,
            },
          });
          if (result.code === 200) {
            this.teacherSummary = result.data || this.teacherSummary;
          }
        } catch (error) {
          console.error("老师管理统计加载失败:", error);
        }
      },
      openTeacherManagement() {
        uni.navigateTo({ url: "/pages/teacher-management/list" });
      },
      onClickEnter() {
        this.checkLoginStatus().then(async (valid) => {
          // 改为 async
          if (valid) {
            this.loadingText = "正在查找已加入的班级";
            this.loadingVisible = true;
            try {
              const res = await uniCloud.callFunction({
                name: "wtdb-business-member-class",
                data: {
                  uniIdToken: uni.getStorageSync("uni_id_token"),
                },
              });
              if (res.result.code === 200) {
                if (res.result.data.length > 0) {
                  uni.navigateTo({
                    url: "/pages/enter-class/switchClass",
                  });
                } else {
                  this.infoPrompt = {
                    show: true,
                    eyebrow: "等待第一次相遇",
                    title: "还没有加入班级",
                    content: "先用班级码提交申请，通过后班级会出现在这里。",
                  };
                }
              }
            } finally {
              this.loadingVisible = false;
            }
          }
        });
      },
      onInitModal() {
        this.show = false;
        this.tips = "创建班级";
        this.modalOptionsList = ["我是老师"];
        this.confirmText = "立即创建";
        this.isJoinClass = false;
      },
      async onConfirm(selectedRole) {
        const role = selectedRole === 0 ? "teacher" : "parent";
        console.log("role: ", role);
        if (selectedRole !== 0) {
          uni.showToast({
            title: "请家长敬请期待",
            duration: 2000,
            icon: "none",
          });
          return;
        }
        if (this.isJoinClass) {
          this.show = false;
          this.onInitModal();
          try {
            uni.navigateTo({
              url: `/pages/enter-class/applyClassForm1?role=${role}`,
            });
          } catch (e) {
            uni.showToast({ title: "跳转失败，请重试", icon: "none" });
          }
        } else {
          uni.navigateTo({
            url: "/pages/enter-class/createClassForm1",
          });
        }
      },
      async checkLoginStatus() {
        try {
          // 获取本地存储的登录信息
          const token = uni.getStorageSync("uni_id_token");
          const userInfo = uni.getStorageSync("uni-id-pages-userInfo");
          const tokenExpired = uni.getStorageSync("uni_id_token_expired");

          // 三重校验条件
          const isValid = token && userInfo?._id && tokenExpired > Date.now();

          if (!isValid) {
            this.showLoginPrompt = true;
            return false;
          }
          return true;
        } catch (e) {
          console.error("登录状态检查失败:", e);
          this.navigateToLogin();
          return false;
        }
      },
      navigateToLogin() {
        uni.navigateTo({
          url: "/uni_modules/uni-id-pages/pages/login/login-withoutpwd",
        });
      },
      handleLoginConfirm() {
        this.showLoginPrompt = false;
        this.navigateToLogin();
      },
      handleLoginCancel() {
        this.showLoginPrompt = false;
        uni.showToast({
          title: "您已取消登录",
          icon: "none",
        });
      },
      onClickButton(item) {
        console.log(item);
        this.checkLoginStatus().then(async (valid) => {
          // 改为 async
          if (valid) {
            if (item === 0) {
              this.loadingText = "正在确认创建权限";
              this.loadingVisible = true;
              let res;
              try {
                res = await uniCloud.callFunction({ name: "wt-fetch-admin-user" });
              } finally {
                this.loadingVisible = false;
              }

              if (!res || res.result.code !== 200) {
                this.infoPrompt = {
                  show: true,
                  eyebrow: "权限提示",
                  title: "暂时不能创建班级",
                  content: "请联系学校负责人开通权限后再试。",
                };
                return;
              }
            }
            if (item === 1) {
              this.isJoinClass = true;
              this.tips = "加入班级";
              this.modalOptionsList = ["我是老师", "我是家长"];
              this.confirmText = "立即加入";
            }
            this.show = true;
          }
        });
      },
    },
  };
</script>

<style scoped lang="scss">
  .enter-class {
    position: relative;
    min-height: 100vh;
    box-sizing: border-box;
    overflow: hidden;
    background:
      linear-gradient(180deg, #fff9e9 0%, #fffdf7 46%, #f8f6ff 100%);
    color: #2f2854;
    font-family: "PingFang SC", "Helvetica Neue", sans-serif;
    padding-bottom: calc(36rpx + env(safe-area-inset-bottom));
  }

  .page-decoration {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
  }

  .decoration-coral {
    width: 220rpx;
    height: 220rpx;
    top: 510rpx;
    left: -138rpx;
    background: rgba(255, 111, 105, 0.13);
  }

  .decoration-blue {
    width: 280rpx;
    height: 280rpx;
    right: -190rpx;
    bottom: 150rpx;
    background: rgba(91, 143, 249, 0.11);
  }

  .decoration-yellow {
    width: 24rpx;
    height: 24rpx;
    right: 52rpx;
    top: 696rpx;
    background: #ffcf46;
    box-shadow: 32rpx 24rpx 0 rgba(255, 111, 105, 0.58);
  }

  .navigation {
    position: relative;
    height: 640rpx;

    .title {
      position: absolute;
      left: 50%;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 62rpx;
      box-sizing: border-box;
      padding: 7rpx 20rpx 7rpx 9rpx;
      border: 2rpx solid #ded7f5;
      border-radius: 36rpx;
      background: rgba(255, 255, 255, 0.9);
      box-shadow: 0 8rpx 22rpx rgba(69, 52, 125, 0.12);
      transform: translate(-50%, -50%);
      white-space: nowrap;
    }

    .brand-symbol {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48rpx;
      height: 48rpx;
      flex-shrink: 0;
      border: 2rpx solid #2f2854;
      border-radius: 50% 50% 50% 18rpx;
      background: #7657f6;
      transform: rotate(-4deg);
    }

    .sprout-stem {
      position: absolute;
      width: 4rpx;
      height: 20rpx;
      left: 21rpx;
      bottom: 8rpx;
      border-radius: 5rpx;
      background: #ffffff;
      transform: rotate(2deg);
    }

    .sprout-leaf {
      position: absolute;
      width: 18rpx;
      height: 12rpx;
      border: 2rpx solid #2f2854;
    }

    .brand-leaf-left {
      top: 13rpx;
      left: 7rpx;
      border-radius: 18rpx 4rpx 18rpx 4rpx;
      background: #8ee3c2;
      transform: rotate(28deg);
    }

    .brand-leaf-right {
      top: 8rpx;
      right: 6rpx;
      border-radius: 4rpx 18rpx 4rpx 18rpx;
      background: #ffcf46;
      transform: rotate(-25deg);
    }

    .brand-name {
      margin-left: 13rpx;
      color: #2f2854;
      font-size: 31rpx;
      font-weight: 800;
      letter-spacing: 3rpx;
      line-height: 1;
    }

    .brand-accent {
      width: 9rpx;
      height: 9rpx;
      align-self: flex-start;
      margin-top: 9rpx;
      margin-left: 5rpx;
      border-radius: 50%;
      background: #ff7d6b;
      box-shadow: 7rpx 7rpx 0 #ffcf46;
    }

    .hero-stage {
      position: absolute;
      top: calc(var(--status-bar-height) + 88rpx);
      right: 28rpx;
      bottom: 24rpx;
      left: 28rpx;
      border: 5rpx solid #2f2854;
      border-radius: 40rpx;
      background: #7b61ff;
      box-shadow: 12rpx 14rpx 0 #ffcf46;
    }

    .growth-illustration {
      position: relative;
      display: flex;
      width: 100%;
      height: 100%;
      overflow: hidden;
      border-radius: 34rpx;
      background: linear-gradient(135deg, #7657f6 0%, #986cfb 56%, #f479b4 100%);
    }

    .growth-illustration::before {
      content: "";
      position: absolute;
      width: 230rpx;
      height: 230rpx;
      top: -126rpx;
      left: 240rpx;
      border: 30rpx solid rgba(255, 255, 255, 0.12);
      border-radius: 50%;
    }

    .hero-copy {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      justify-content: center;
      width: 58%;
      box-sizing: border-box;
      padding: 24rpx 0 20rpx 36rpx;
    }

    .hero-kicker {
      align-self: flex-start;
      margin-bottom: 14rpx;
      padding: 7rpx 14rpx;
      border: 2rpx solid rgba(255, 255, 255, 0.68);
      border-radius: 20rpx;
      background: rgba(255, 255, 255, 0.16);
      color: #ffffff;
      font-size: 17rpx;
      font-weight: 700;
      letter-spacing: 2rpx;
      line-height: 1;
    }

    .hero-user-chip {
      display: flex;
      align-self: flex-start;
      align-items: center;
      max-width: 302rpx;
      height: 52rpx;
      box-sizing: border-box;
      margin-bottom: 14rpx;
      padding: 5rpx 15rpx 5rpx 6rpx;
      overflow: hidden;
      border: 2rpx solid #2f2854;
      border-radius: 25rpx 25rpx 25rpx 9rpx;
      background: rgba(255, 255, 255, 0.94);
      box-shadow: 4rpx 5rpx 0 #ffcf46;
      color: #3d3266;
      transform: rotate(-1deg);
    }

    .hero-user-spark {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36rpx;
      height: 36rpx;
      flex-shrink: 0;
      margin-right: 8rpx;
      border-radius: 50%;
      background: #8ee3c2;
      color: #2f2854;
      font-size: 19rpx;
      font-weight: 900;
    }

    .hero-user-greeting {
      flex-shrink: 0;
      font-size: 19rpx;
      font-weight: 700;
      white-space: nowrap;
    }

    .hero-user-name {
      min-width: 0;
      overflow: hidden;
      color: #7657f6;
      font-size: 20rpx;
      font-weight: 900;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .hero-title {
      color: #ffffff;
      font-size: 48rpx;
      font-weight: 800;
      line-height: 1.16;
      letter-spacing: 1rpx;
      text-shadow: 3rpx 4rpx 0 rgba(47, 40, 84, 0.25);
    }

    .hero-title-last {
      margin-top: 2rpx;
    }

    .hero-subtitle {
      margin-top: 15rpx;
      color: rgba(255, 255, 255, 0.9);
      font-size: 21rpx;
      font-weight: 500;
      line-height: 1.5;
      white-space: nowrap;
    }

    .hero-art {
      position: relative;
      flex: 1;
      height: 100%;
    }

    .art-sun {
      position: absolute;
      width: 180rpx;
      height: 180rpx;
      top: 50%;
      right: 15rpx;
      transform: translateY(-48%);
      border-radius: 50%;
      background: #ffcf46;
      box-shadow: inset -14rpx -12rpx 0 rgba(255, 145, 63, 0.22);
    }

    .report-card {
      position: absolute;
      top: 50%;
      right: 38rpx;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 144rpx;
      height: 172rpx;
      box-sizing: border-box;
      padding-top: 28rpx;
      transform: translateY(-51%) rotate(6deg);
      border: 4rpx solid #2f2854;
      border-radius: 22rpx;
      background: #fffdf7;
      box-shadow: 8rpx 9rpx 0 rgba(47, 40, 84, 0.28);
    }

    .report-clip {
      position: absolute;
      width: 64rpx;
      height: 20rpx;
      top: -13rpx;
      left: 38rpx;
      border: 4rpx solid #2f2854;
      border-radius: 12rpx;
      background: #ff7d6b;
    }

    .report-face {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-around;
      width: 68rpx;
      height: 62rpx;
      box-sizing: border-box;
      padding: 0 13rpx 10rpx;
      border-radius: 50%;
      background: #8ee3c2;
    }

    .face-eye {
      width: 7rpx;
      height: 10rpx;
      border-radius: 50%;
      background: #2f2854;
    }

    .face-smile {
      position: absolute;
      width: 25rpx;
      height: 12rpx;
      left: 20rpx;
      bottom: 11rpx;
      border-bottom: 4rpx solid #2f2854;
      border-radius: 0 0 22rpx 22rpx;
    }

    .report-line {
      height: 8rpx;
      margin-top: 12rpx;
      border-radius: 8rpx;
      background: #ded8ff;
    }

    .line-long {
      width: 90rpx;
    }

    .line-short {
      width: 62rpx;
      margin-top: 8rpx;
      background: #ffb4a8;
    }

    .growth-badge {
      position: absolute;
      right: 12rpx;
      bottom: 40rpx;
      z-index: 3;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56rpx;
      height: 56rpx;
      border: 3rpx solid #2f2854;
      border-radius: 50%;
      background: #8ee3c2;
      color: #2f2854;
      font-size: 23rpx;
      font-weight: 800;
      transform: rotate(-9deg);
    }

    .art-spark {
      position: absolute;
      z-index: 3;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 800;
      animation: sparkle 2.8s ease-in-out infinite;
    }

    .spark-one {
      top: 34rpx;
      right: 22rpx;
      font-size: 34rpx;
    }

    .spark-two {
      left: 6rpx;
      bottom: 38rpx;
      color: #ffcf46;
      font-size: 32rpx;
      animation-delay: 0.8s;
    }

    .hero-sticker {
      position: absolute;
      top: -20rpx;
      left: 34rpx;
      z-index: 8;
      padding: 9rpx 22rpx;
      border: 3rpx solid #2f2854;
      border-radius: 24rpx 24rpx 24rpx 8rpx;
      background: #8ee3c2;
      color: #2f2854;
      font-size: 20rpx;
      font-weight: 800;
      letter-spacing: 1rpx;
      transform: rotate(-3deg);
    }

    .hero-dot {
      position: absolute;
      z-index: 8;
      width: 18rpx;
      height: 18rpx;
      border: 3rpx solid #2f2854;
      border-radius: 50%;
    }

    .dot-left {
      left: -12rpx;
      bottom: 42rpx;
      background: #ff7d6b;
    }

    .dot-right {
      right: -13rpx;
      top: 58rpx;
      background: #8ee3c2;
    }

  }

  .enter-class-option {
    position: relative;
    z-index: 2;
    margin: 4rpx 28rpx 0;

    .section-heading {
      display: flex;
      align-items: center;
      margin: 0 6rpx 24rpx;
    }

    .section-icon {
      position: relative;
      width: 48rpx;
      height: 48rpx;
      margin-right: 18rpx;
      border: 3rpx solid #2f2854;
      border-radius: 17rpx;
      background: #ffcf46;
      transform: rotate(-7deg);
    }

    .section-icon::before,
    .section-icon::after {
      content: "";
      position: absolute;
      background: #2f2854;
      border-radius: 6rpx;
    }

    .section-icon::before {
      width: 23rpx;
      height: 5rpx;
      top: 20rpx;
      left: 11rpx;
    }

    .section-icon::after {
      width: 5rpx;
      height: 23rpx;
      top: 11rpx;
      left: 20rpx;
    }

    .section-icon-dot {
      position: absolute;
      width: 8rpx;
      height: 8rpx;
      top: -8rpx;
      right: -7rpx;
      border-radius: 50%;
      background: #ff7d6b;
    }

    .section-copy {
      display: flex;
      flex-direction: column;
    }

    .section-title {
      color: #2f2854;
      font-size: 32rpx;
      font-weight: 800;
      line-height: 1.2;
    }

    .section-subtitle {
      margin-top: 7rpx;
      color: #827a9d;
      font-size: 22rpx;
      line-height: 1.2;
    }

    .approval-entry {
      display: flex;
      align-items: center;
      min-height: 116rpx;
      box-sizing: border-box;
      margin-bottom: 25rpx;
      padding: 20rpx 24rpx;
      border: 3rpx solid #2f2854;
      border-radius: 27rpx;
      background: linear-gradient(135deg, #d9f7e9 0%, #eefbe5 52%, #fff1ba 100%);
      box-shadow: 7rpx 8rpx 0 #79dcb4;
      transition: transform 0.16s ease, box-shadow 0.16s ease;
    }

    .approval-entry--pressed {
      transform: translate(4rpx, 5rpx);
      box-shadow: 3rpx 3rpx 0 #79dcb4;
    }

    .approval-entry-icon {
      position: relative;
      display: flex;
      width: 70rpx;
      height: 70rpx;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      border: 3rpx solid #2f2854;
      border-radius: 22rpx;
      background: #7b61ff;
      color: #fff;
      font-size: 34rpx;
      font-weight: 900;
      transform: rotate(-4deg);
    }

    .approval-entry-count {
      position: absolute;
      top: -17rpx;
      right: -18rpx;
      min-width: 31rpx;
      padding: 3rpx 8rpx;
      border: 2rpx solid #2f2854;
      border-radius: 18rpx;
      background: #ff706b;
      color: #fff;
      font-size: 17rpx;
      line-height: 1.25;
      text-align: center;
      transform: rotate(4deg);
    }

    .approval-entry-copy {
      display: flex;
      min-width: 0;
      flex: 1;
      flex-direction: column;
      margin-left: 21rpx;
    }

    .approval-entry-title {
      color: #2f2854;
      font-size: 29rpx;
      font-weight: 800;
    }

    .approval-entry-subtitle {
      margin-top: 7rpx;
      overflow: hidden;
      color: #6e687c;
      font-size: 21rpx;
      line-height: 1.35;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .approval-entry-arrow {
      margin-left: 14rpx;
      color: #2f2854;
      font-size: 48rpx;
      font-weight: 600;
      line-height: 1;
    }

    .teacher-entry {
      background: linear-gradient(135deg, #e6efff 0%, #eff5ff 52%, #e4f9f0 100%);
      box-shadow: 7rpx 8rpx 0 #8cb8f4;
    }

    .teacher-entry.approval-entry--pressed {
      box-shadow: 3rpx 3rpx 0 #8cb8f4;
    }

    .teacher-entry-icon {
      background: #4e87e8;
      font-size: 26rpx;
      transform: rotate(3deg);
    }

    .option {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      height: 250rpx;
      box-sizing: border-box;
      overflow: hidden;
      border: 4rpx solid #2f2854;
      border-radius: 34rpx;
      background: linear-gradient(135deg, #fff0a8 0%, #ffdb65 100%);
      box-shadow: 10rpx 11rpx 0 #2f2854;
      transition: transform 0.16s ease, box-shadow 0.16s ease;
    }

    .option-pressed {
      transform: translate(6rpx, 7rpx);
      box-shadow: 4rpx 4rpx 0 #2f2854;
    }

    .option-copy {
      position: relative;
      z-index: 3;
      display: flex;
      flex-direction: column;
      width: 62%;
      box-sizing: border-box;
      padding-left: 34rpx;
    }

    .option-tag {
      align-self: flex-start;
      padding: 6rpx 15rpx;
      border: 2rpx solid #2f2854;
      border-radius: 18rpx 18rpx 18rpx 5rpx;
      background: #ff7d6b;
      color: #ffffff;
      font-size: 18rpx;
      font-weight: 700;
      line-height: 1;
      transform: rotate(-2deg);
    }

    .option-title {
      margin-top: 13rpx;
      color: #2f2854;
      font-size: 39rpx;
      font-weight: 800;
      line-height: 1.2;
    }

    .option-subtitle {
      margin-top: 7rpx;
      color: #6e6144;
      font-size: 21rpx;
      font-weight: 500;
      line-height: 1.45;
      white-space: nowrap;
    }

    .option-action {
      display: flex;
      align-items: center;
      margin-top: 15rpx;
      color: #2f2854;
      font-size: 22rpx;
      font-weight: 700;
    }

    .action-arrow {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32rpx;
      height: 32rpx;
      margin-left: 10rpx;
      border: 2rpx solid #2f2854;
      border-radius: 50%;
      background: #ffffff;
      font-size: 22rpx;
      line-height: 1;
    }

    .option-visual {
      position: relative;
      align-self: stretch;
      flex: 1;
    }

    .visual-orbit {
      position: absolute;
      border: 3rpx solid #2f2854;
      border-radius: 50%;
    }

    .orbit-large {
      width: 188rpx;
      height: 188rpx;
      top: 30rpx;
      right: -10rpx;
      background: #8ee3c2;
      box-shadow: inset -12rpx -12rpx 0 rgba(66, 174, 142, 0.15);
    }

    .orbit-small {
      width: 45rpx;
      height: 45rpx;
      top: 22rpx;
      right: 35rpx;
      background: #9f83ff;
    }

    .image {
      position: absolute;
      z-index: 2;
      width: 142rpx;
      height: 142rpx;
      top: 61rpx;
      right: 17rpx;
      transform: rotate(3deg);
    }
  }

  .warp {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    box-sizing: border-box;
    padding: 36rpx;
  }

  .help-container {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    height: 108rpx;
    box-sizing: border-box;
    margin-top: 30rpx;
    padding: 0 28rpx;
    border: 3rpx solid #d9d1f4;
    border-radius: 28rpx;
    background: rgba(255, 255, 255, 0.88);
    box-shadow: 0 9rpx 22rpx rgba(80, 61, 134, 0.08);
    transition: transform 0.16s ease, background 0.16s ease;
  }

  .help-pressed {
    transform: scale(0.985);
    background: #f4f0ff;
  }

  .help-icon {
    position: relative;
    width: 62rpx;
    height: 62rpx;
    flex-shrink: 0;
    margin-right: 20rpx;
    border-radius: 20rpx;
    background: #e7e0ff;
  }

  .help-person {
    position: absolute;
    border: 3rpx solid #2f2854;
  }

  .person-back {
    width: 22rpx;
    height: 31rpx;
    top: 12rpx;
    right: 10rpx;
    border-radius: 50% 50% 10rpx 10rpx;
    background: #ffcf46;
  }

  .person-front {
    width: 25rpx;
    height: 36rpx;
    left: 11rpx;
    bottom: 10rpx;
    border-radius: 50% 50% 10rpx 10rpx;
    background: #8ee3c2;
  }

  .help-copy {
    display: flex;
    flex: 1;
    flex-direction: column;
  }

  .help-label {
    color: #918aa5;
    font-size: 21rpx;
    line-height: 1.2;
  }

  .help-link {
    margin-top: 7rpx;
    color: #4c3b91;
    font-size: 27rpx;
    font-weight: 700;
    line-height: 1.2;
  }

  .help-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 46rpx;
    height: 46rpx;
    border-radius: 50%;
    background: #7657f6;
    color: #ffffff;
    font-size: 36rpx;
    font-weight: 500;
    line-height: 1;
  }

  .promise-row {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 31rpx;
  }

  .promise-item {
    display: flex;
    align-items: center;
    color: #8c85a0;
    font-size: 20rpx;
    font-weight: 500;
  }

  .promise-dot {
    width: 10rpx;
    height: 10rpx;
    margin-right: 8rpx;
    border-radius: 50%;
  }

  .dot-purple {
    background: #7657f6;
  }

  .dot-coral {
    background: #ff7d6b;
  }

  .dot-green {
    background: #3ec99a;
  }

  .promise-divider {
    width: 1rpx;
    height: 18rpx;
    margin: 0 22rpx;
    background: #d9d3e7;
  }

  @keyframes sparkle {
    0%,
    100% {
      transform: scale(0.9) rotate(0deg);
      opacity: 0.72;
    }

    50% {
      transform: scale(1.16) rotate(12deg);
      opacity: 1;
    }
  }

  @media screen and (max-height: 700px) {
    .navigation {
      height: 570rpx;
    }

    .enter-class-option .option {
      height: 226rpx;
    }

    .enter-class-option .image {
      top: 50rpx;
    }

    .help-container {
      margin-top: 24rpx;
    }

    .promise-row {
      margin-top: 24rpx;
    }
  }
</style>
