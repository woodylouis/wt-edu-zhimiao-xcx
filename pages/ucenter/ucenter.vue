<template>
  <view class="profile-page">
    <view class="page-orb page-orb--coral"></view>
    <view class="page-orb page-orb--purple"></view>
    <view class="page-spark page-spark--one">+</view>
    <view class="page-spark page-spark--two">✦</view>

    <view class="page-nav">
      <view class="brand-pill">
        <view class="brand-symbol">
          <view class="sprout-stem"></view>
          <view class="sprout-leaf sprout-leaf--left"></view>
          <view class="sprout-leaf sprout-leaf--right"></view>
        </view>
        <text>知苗成长</text>
      </view>
      <view class="nav-title-wrap">
        <text class="nav-eyebrow">MY GROWTH SPACE</text>
        <text class="nav-title">我的</text>
      </view>
    </view>

    <view
      class="profile-card"
      hover-class="card-pressed"
      :hover-stay-time="80"
      @click="openUserInfo"
    >
      <view class="profile-confetti profile-confetti--one">●</view>
      <view class="profile-confetti profile-confetti--two">+</view>
      <view class="avatar-wrap">
        <image
          v-if="avatarUrl"
          class="avatar-image"
          :src="avatarUrl"
          mode="aspectFill"
        />
        <view v-else class="avatar-default">
          <view class="avatar-face">
            <view class="avatar-eye"></view>
            <view class="avatar-eye"></view>
            <view class="avatar-smile"></view>
          </view>
        </view>
        <view v-if="hasLogin" class="avatar-badge">✨</view>
      </view>

      <view class="profile-copy">
        <text class="profile-greeting">{{ greetingText }}</text>
        <text class="profile-name">{{ profileName }}</text>
        <view v-if="hasLogin" class="nickname-pill">
          <view class="nickname-dot"></view>
          <text>昵称用于班级与报告</text>
        </view>
        <text v-else class="login-hint">登录后查看班级与成长记录</text>
      </view>
      <view class="profile-arrow">›</view>
    </view>

    <view v-if="hasLogin" class="summary-card">
      <view class="summary-item">
        <text class="summary-value">{{ classCount }}</text>
        <text class="summary-label">已加入班级</text>
      </view>
      <view class="summary-divider"></view>
      <view class="summary-item summary-item--wide">
        <text class="summary-value summary-value--text">{{ roleLabel }}</text>
        <text class="summary-label">当前身份</text>
      </view>
      <view class="summary-divider"></view>
      <view class="summary-item summary-item--wide">
        <text class="summary-value summary-value--text summary-class-name">
          {{ currentClassName }}
        </text>
        <text class="summary-label">当前班级</text>
      </view>
    </view>

    <view v-else class="login-card">
      <view class="login-art">
        <view class="login-sun"></view>
        <view class="login-book">
          <view class="book-line book-line--long"></view>
          <view class="book-line book-line--short"></view>
        </view>
      </view>
      <view class="login-copy">
        <text class="login-title">一起收集成长闪光点</text>
        <text class="login-subtitle">登录后，记录和查看每一次进步</text>
      </view>
      <button class="login-button" @click.stop="goLogin">去登录</button>
    </view>

    <view class="section-heading">
      <view>
        <text class="section-title">我的成长服务</text>
        <text class="section-subtitle">常用功能，一步到达</text>
      </view>
      <view class="section-mark">✦</view>
    </view>

    <view class="action-grid">
      <view
        class="action-card action-card--mint"
        hover-class="action-card--pressed"
        :hover-stay-time="80"
        @click="openClasses"
      >
        <view class="action-icon action-icon--mint">
          <text>班</text>
          <view class="icon-dot"></view>
        </view>
        <text class="action-title">我的班级</text>
        <text class="action-desc">切换或加入班级</text>
        <view class="action-arrow">↗</view>
      </view>

      <view
        class="action-card action-card--purple"
        hover-class="action-card--pressed"
        :hover-stay-time="80"
        @click="openAssessment"
      >
        <view class="action-icon action-icon--purple">
          <text>评</text>
          <view class="icon-star">✦</view>
        </view>
        <text class="action-title">{{ assessmentActionTitle }}</text>
        <text class="action-desc">{{ assessmentActionDesc }}</text>
        <view class="action-arrow">↗</view>
      </view>

      <view
        class="action-card action-card--yellow"
        hover-class="action-card--pressed"
        :hover-stay-time="80"
        @click="openUserInfo"
      >
        <view class="action-icon action-icon--yellow">
          <text>我</text>
          <view class="icon-ring"></view>
        </view>
        <text class="action-title">个人资料</text>
        <text class="action-desc">昵称、头像与手机号</text>
        <view class="action-arrow">↗</view>
      </view>

      <view
        class="action-card action-card--coral"
        hover-class="action-card--pressed"
        :hover-stay-time="80"
        @click="openFeedback"
      >
        <view class="action-icon action-icon--coral">
          <text>话</text>
          <view class="icon-tail"></view>
        </view>
        <text class="action-title">意见反馈</text>
        <text class="action-desc">告诉我们你的想法</text>
        <view class="action-arrow">↗</view>
      </view>
    </view>

    <view
      v-if="approvalSummary.canReview || teacherSummary.canManage"
      class="section-heading section-heading--manage"
    >
      <view>
        <text class="section-title">班级管理</text>
        <text class="section-subtitle">处理待办，管理团队</text>
      </view>
      <view v-if="approvalSummary.pending" class="pending-pill">
        {{ approvalSummary.pending > 99 ? "99+" : approvalSummary.pending }} 待办
      </view>
    </view>

    <view
      v-if="approvalSummary.canReview || teacherSummary.canManage"
      class="manage-card"
    >
      <view
        v-if="approvalSummary.canReview"
        class="manage-row"
        hover-class="manage-row--pressed"
        :hover-stay-time="80"
        @click="openApproval"
      >
        <view class="manage-icon manage-icon--coral">✓</view>
        <view class="manage-copy">
          <text class="manage-title">入班审批</text>
          <text class="manage-desc">
            {{ approvalSubtitle }}
          </text>
        </view>
        <view v-if="approvalSummary.pending" class="manage-badge">
          {{ approvalSummary.pending > 99 ? "99+" : approvalSummary.pending }}
        </view>
        <view class="manage-arrow">›</view>
      </view>

      <view
        v-if="teacherSummary.canManage"
        class="manage-row"
        :class="{ 'manage-row--border': approvalSummary.canReview }"
        hover-class="manage-row--pressed"
        :hover-stay-time="80"
        @click="openTeacherManagement"
      >
        <view class="manage-icon manage-icon--purple">师</view>
        <view class="manage-copy">
          <text class="manage-title">老师管理</text>
          <text class="manage-desc">{{ teacherSubtitle }}</text>
        </view>
        <view class="manage-arrow">›</view>
      </view>
    </view>

    <view class="settings-card">
      <view
        class="settings-row"
        hover-class="settings-row--pressed"
        :hover-stay-time="80"
        @click="openSettings"
      >
        <view class="settings-icon settings-icon--purple">
          <view class="gear-core"></view>
        </view>
        <view class="settings-copy">
          <text class="settings-title">设置</text>
          <text class="settings-desc">账号、隐私与应用设置</text>
        </view>
        <view class="settings-arrow">›</view>
      </view>
      <view
        v-if="hasLogin"
        class="settings-row settings-row--border"
        hover-class="settings-row--pressed"
        :hover-stay-time="80"
        @click="confirmLogout"
      >
        <view class="settings-icon settings-icon--coral">
          <text>→</text>
        </view>
        <view class="settings-copy">
          <text class="settings-title">退出登录</text>
          <text class="settings-desc">{{ maskedMobile || "安全退出当前账号" }}</text>
        </view>
        <view class="settings-arrow">›</view>
      </view>
    </view>

    <view class="page-footer">
      <view class="footer-sprout">
        <view class="footer-stem"></view>
        <view class="footer-leaf footer-leaf--left"></view>
        <view class="footer-leaf footer-leaf--right"></view>
      </view>
      <text>让每一次成长，都被温柔看见</text>
    </view>
  </view>
</template>

<script>
import {
  store,
  mutations,
} from "@/uni_modules/uni-id-pages/common/store.js";

export default {
  data() {
    return {
      sessionValid: false,
      memberships: [],
      membershipsLoaded: false,
      currentClass: {},
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
  computed: {
    userInfo() {
      return store.userInfo || {};
    },
    hasLogin() {
      return Boolean(store.hasLogin && this.sessionValid);
    },
    avatarUrl() {
      return this.userInfo.avatar_file && this.userInfo.avatar_file.url
        ? this.userInfo.avatar_file.url
        : "";
    },
    profileName() {
      if (!this.hasLogin) return "欢迎来到知苗成长";
      return (
        this.userInfo.nickname ||
        this.userInfo.username ||
        "未设置昵称"
      );
    },
    greetingText() {
      if (!this.hasLogin) return "HELLO, NEW FRIEND";
      const hour = new Date().getHours();
      if (hour < 11) return "早上好，今天也要闪闪发光";
      if (hour < 18) return "下午好，继续发现小小进步";
      return "晚上好，记得收藏今天的成长";
    },
    classCount() {
      return this.membershipsLoaded ? this.memberships.length : "—";
    },
    roleLabel() {
      const roles = this.memberships.map((item) => item.role);
      const isTeacher = roles.includes("teacher");
      const isParent = roles.includes("parent");
      if (isTeacher && isParent) return "老师·家长";
      if (isTeacher) return "老师";
      if (isParent) return "家长";
      return "待加入";
    },
    currentClassName() {
      if (this.currentClass.nickname) return this.currentClass.nickname;
      if (this.currentClass.grade && this.currentClass.class) {
        return `${this.currentClass.grade}${this.currentClass.class}班`;
      }
      return "暂无班级";
    },
    activeRole() {
      if (this.currentClass.memberRole) return this.currentClass.memberRole;
      const currentMembership = this.memberships.find((item) => {
        const classInfo = item.classInfo || {};
        return (
          (this.currentClass.code && classInfo.code === this.currentClass.code) ||
          (this.currentClass._id && classInfo._id === this.currentClass._id)
        );
      });
      return currentMembership ? currentMembership.role : "teacher";
    },
    assessmentActionTitle() {
      return this.activeRole === "parent" ? "成长报告" : "成长评估";
    },
    assessmentActionDesc() {
      return this.activeRole === "parent"
        ? "查看孩子的评估记录"
        : "开始或查看评估";
    },
    maskedMobile() {
      const mobile = String(this.userInfo.mobile || "");
      if (mobile.length < 7) return mobile;
      return `${mobile.slice(0, 3)}****${mobile.slice(-4)}`;
    },
    approvalSubtitle() {
      return this.approvalSummary.pending
        ? `有 ${this.approvalSummary.pending} 条老师申请待处理`
        : "查看老师入班申请与审批记录";
    },
    teacherSubtitle() {
      return `${this.teacherSummary.teacherCount || 0} 位老师 · ${
        this.teacherSummary.assignmentCount || 0
      } 条任教关系`;
    },
  },
  onShow() {
    this.refreshPage();
  },
  methods: {
    refreshPage() {
      const token = uni.getStorageSync("uni_id_token");
      const tokenExpired = uni.getStorageSync("uni_id_token_expired");
      const cachedUser = uni.getStorageSync("uni-id-pages-userInfo") || {};
      this.sessionValid = Boolean(
        token && cachedUser._id && tokenExpired > Date.now()
      );
      this.currentClass = uni.getStorageSync("currentClass") || {};

      if (!this.hasLogin) {
        this.memberships = [];
        this.membershipsLoaded = false;
        this.approvalSummary = { canReview: false, pending: 0 };
        this.teacherSummary = {
          canManage: false,
          teacherCount: 0,
          assignmentCount: 0,
        };
        return;
      }

      Promise.all([
        this.loadMemberships(),
        this.loadApprovalSummary(),
        this.loadTeacherSummary(),
      ]).catch((error) => {
        console.warn("我的页面数据加载未完全成功:", error);
      });
    },
    async loadMemberships() {
      this.membershipsLoaded = false;
      try {
        const { result } = await uniCloud.callFunction({
          name: "wtdb-business-member-class",
          data: {
            uniIdToken: uni.getStorageSync("uni_id_token"),
          },
        });
        if (result && result.code === 200) {
          this.memberships = result.data || [];
        }
      } catch (error) {
        console.warn("班级统计加载失败:", error);
      } finally {
        this.membershipsLoaded = true;
      }
    },
    async loadApprovalSummary() {
      try {
        const { result } = await uniCloud.callFunction({
          name: "wtdb-class-approval",
          data: {
            action: "summary",
            uniIdToken: uni.getStorageSync("uni_id_token"),
          },
        });
        if (result && result.code === 200) {
          this.approvalSummary =
            result.data || this.approvalSummary;
        }
      } catch (error) {
        console.warn("审批待办加载失败:", error);
      }
    },
    async loadTeacherSummary() {
      try {
        const { result } = await uniCloud.callFunction({
          name: "wtdb-teacher-management",
          data: {
            action: "summary",
            uniIdToken: uni.getStorageSync("uni_id_token"),
          },
        });
        if (result && result.code === 200) {
          this.teacherSummary = result.data || this.teacherSummary;
        }
      } catch (error) {
        console.warn("老师管理统计加载失败:", error);
      }
    },
    ensureLogin() {
      if (this.hasLogin) return true;
      this.goLogin();
      return false;
    },
    goLogin() {
      uni.navigateTo({
        url: "/uni_modules/uni-id-pages/pages/login/login-withoutpwd",
      });
    },
    openUserInfo() {
      if (!this.ensureLogin()) return;
      uni.navigateTo({
        url: "/uni_modules/uni-id-pages/pages/userinfo/userinfo",
      });
    },
    openClasses() {
      if (!this.ensureLogin()) return;
      if (this.membershipsLoaded && !this.memberships.length) {
        uni.switchTab({
          url: "/pages/enter-class/index",
          success: () => {
            uni.showToast({
              title: "先加入一个班级吧",
              icon: "none",
            });
          },
        });
        return;
      }
      uni.navigateTo({ url: "/pages/enter-class/switchClass" });
    },
    openAssessment() {
      if (!this.ensureLogin()) return;
      if (!this.currentClass._id && !this.currentClass.code) {
        this.openClasses();
        return;
      }
      uni.navigateTo({
        url: `/pages/assessment/list?role=${this.activeRole}`,
      });
    },
    openFeedback() {
      uni.navigateTo({
        url: "/uni_modules/uni-feedback/pages/opendb-feedback/opendb-feedback",
      });
    },
    openSettings() {
      uni.navigateTo({ url: "/pages/ucenter/settings/settings" });
    },
    openApproval() {
      uni.navigateTo({ url: "/pages/approval/list" });
    },
    openTeacherManagement() {
      uni.navigateTo({ url: "/pages/teacher-management/list" });
    },
    confirmLogout() {
      uni.showModal({
        title: "退出登录",
        content: "确定要退出当前账号吗？",
        confirmText: "退出",
        confirmColor: "#ff6f69",
        success: async (result) => {
          if (result.confirm) await mutations.logout();
        },
      });
    },
  },
};
</script>

<style lang="scss" scoped>
.profile-page {
  position: relative;
  min-height: 100vh;
  box-sizing: border-box;
  overflow: hidden;
  padding: 0 28rpx calc(52rpx + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, #fff9e9 0%, #fffdf7 45%, #f8f6ff 100%);
  color: #2f2854;
  font-family: "PingFang SC", "Helvetica Neue", sans-serif;
}

.page-orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.page-orb--coral {
  width: 250rpx;
  height: 250rpx;
  top: 470rpx;
  left: -170rpx;
  background: rgba(255, 111, 105, 0.12);
}

.page-orb--purple {
  width: 330rpx;
  height: 330rpx;
  right: -220rpx;
  bottom: 260rpx;
  background: rgba(118, 87, 246, 0.1);
}

.page-spark {
  position: absolute;
  z-index: 1;
  font-weight: 900;
  pointer-events: none;
}

.page-spark--one {
  top: 638rpx;
  right: 44rpx;
  color: #ff6f69;
  font-size: 38rpx;
  transform: rotate(12deg);
}

.page-spark--two {
  top: 930rpx;
  left: 16rpx;
  color: #ffcf46;
  font-size: 30rpx;
}

.page-nav {
  position: relative;
  z-index: 2;
  padding-top: calc(var(--status-bar-height) + 28rpx);
}

.brand-pill {
  display: inline-flex;
  align-items: center;
  height: 58rpx;
  box-sizing: border-box;
  padding: 6rpx 18rpx 6rpx 7rpx;
  border: 2rpx solid #ded7f5;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8rpx 22rpx rgba(69, 52, 125, 0.1);
  color: #45347d;
  font-size: 25rpx;
  font-weight: 800;
}

.brand-symbol {
  position: relative;
  width: 44rpx;
  height: 44rpx;
  margin-right: 9rpx;
  border: 2rpx solid #2f2854;
  border-radius: 50% 50% 50% 15rpx;
  background: #7657f6;
  transform: rotate(-4deg);
}

.sprout-stem {
  position: absolute;
  width: 4rpx;
  height: 18rpx;
  left: 20rpx;
  bottom: 7rpx;
  border-radius: 5rpx;
  background: #ffffff;
}

.sprout-leaf {
  position: absolute;
  width: 15rpx;
  height: 10rpx;
  border: 2rpx solid #2f2854;
}

.sprout-leaf--left {
  top: 12rpx;
  left: 7rpx;
  border-radius: 16rpx 4rpx 16rpx 4rpx;
  background: #8ee3c2;
  transform: rotate(28deg);
}

.sprout-leaf--right {
  top: 9rpx;
  right: 6rpx;
  border-radius: 4rpx 16rpx 4rpx 16rpx;
  background: #ffcf46;
  transform: rotate(-24deg);
}

.nav-title-wrap {
  display: flex;
  flex-direction: column;
  margin-top: 31rpx;
}

.nav-eyebrow {
  color: #7657f6;
  font-size: 22rpx;
  font-weight: 900;
  letter-spacing: 4rpx;
}

.nav-title {
  margin-top: 5rpx;
  color: #2f2854;
  font-size: 56rpx;
  font-weight: 900;
  letter-spacing: 2rpx;
}

.profile-card {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  min-height: 204rpx;
  box-sizing: border-box;
  margin-top: 24rpx;
  padding: 28rpx 26rpx;
  overflow: hidden;
  border: 3rpx solid #2f2854;
  border-radius: 34rpx;
  background: linear-gradient(135deg, #fff2b8 0%, #ffd778 52%, #ffb8ac 100%);
  box-shadow: 0 15rpx 0 rgba(47, 40, 84, 0.12);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.card-pressed {
  transform: translateY(5rpx);
  box-shadow: 0 8rpx 0 rgba(47, 40, 84, 0.12);
}

.profile-confetti {
  position: absolute;
  font-weight: 900;
  pointer-events: none;
}

.profile-confetti--one {
  top: 22rpx;
  right: 76rpx;
  color: #ff6f69;
  font-size: 18rpx;
}

.profile-confetti--two {
  right: 31rpx;
  bottom: 17rpx;
  color: #7657f6;
  font-size: 30rpx;
  transform: rotate(16deg);
}

.avatar-wrap {
  position: relative;
  width: 126rpx;
  height: 126rpx;
  flex-shrink: 0;
}

.avatar-image,
.avatar-default {
  width: 120rpx;
  height: 120rpx;
  box-sizing: border-box;
  border: 5rpx solid #ffffff;
  border-radius: 38rpx;
  box-shadow: 0 8rpx 18rpx rgba(69, 52, 125, 0.18);
}

.avatar-default {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #7657f6;
}

.avatar-face {
  position: relative;
  display: flex;
  justify-content: space-between;
  width: 53rpx;
  padding-top: 10rpx;
}

.avatar-eye {
  width: 8rpx;
  height: 11rpx;
  border-radius: 8rpx;
  background: #ffffff;
}

.avatar-smile {
  position: absolute;
  width: 28rpx;
  height: 15rpx;
  top: 28rpx;
  left: 12rpx;
  border-bottom: 5rpx solid #ffffff;
  border-radius: 0 0 30rpx 30rpx;
}

.avatar-badge {
  position: absolute;
  right: -2rpx;
  bottom: -2rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 47rpx;
  height: 47rpx;
  border: 4rpx solid #ffffff;
  border-radius: 50%;
  background: #8ee3c2;
  font-size: 22rpx;
}

.profile-copy {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  margin-left: 23rpx;
}

.profile-greeting {
  overflow: hidden;
  color: rgba(47, 40, 84, 0.72);
  font-size: 22rpx;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-name {
  max-width: 390rpx;
  margin-top: 7rpx;
  overflow: hidden;
  color: #2f2854;
  font-size: 40rpx;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nickname-pill {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  max-width: 360rpx;
  box-sizing: border-box;
  margin-top: 12rpx;
  padding: 7rpx 14rpx;
  border: 2rpx solid rgba(47, 40, 84, 0.18);
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.7);
  color: #45347d;
  font-size: 21rpx;
  font-weight: 700;
}

.nickname-pill text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nickname-dot {
  width: 11rpx;
  height: 11rpx;
  flex-shrink: 0;
  margin-right: 8rpx;
  border-radius: 50%;
  background: #42b88e;
}

.login-hint {
  margin-top: 12rpx;
  color: rgba(47, 40, 84, 0.66);
  font-size: 23rpx;
  line-height: 1.45;
}

.profile-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  flex-shrink: 0;
  border: 2rpx solid rgba(47, 40, 84, 0.22);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.76);
  color: #2f2854;
  font-size: 40rpx;
  font-weight: 700;
  line-height: 43rpx;
}

.summary-card {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  margin-top: 24rpx;
  padding: 25rpx 10rpx;
  border: 2rpx solid #e5def8;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 10rpx 26rpx rgba(69, 52, 125, 0.08);
}

.summary-item {
  display: flex;
  width: 30%;
  min-width: 0;
  flex-direction: column;
  align-items: center;
}

.summary-item--wide {
  width: 35%;
}

.summary-value {
  color: #7657f6;
  font-size: 38rpx;
  font-weight: 900;
  line-height: 1.15;
}

.summary-value--text {
  max-width: 100%;
  overflow: hidden;
  color: #2f2854;
  font-size: 26rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-class-name {
  padding: 0 8rpx;
}

.summary-label {
  margin-top: 8rpx;
  color: #8b84a6;
  font-size: 21rpx;
}

.summary-divider {
  width: 2rpx;
  height: 48rpx;
  background: #ece7f7;
}

.login-card {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  min-height: 146rpx;
  box-sizing: border-box;
  margin-top: 24rpx;
  padding: 20rpx 18rpx 20rpx 20rpx;
  border: 2rpx solid #d8cef8;
  border-radius: 28rpx;
  background: #eee8ff;
}

.login-art {
  position: relative;
  width: 88rpx;
  height: 88rpx;
  flex-shrink: 0;
}

.login-sun {
  position: absolute;
  width: 37rpx;
  height: 37rpx;
  top: 0;
  right: 1rpx;
  border: 3rpx solid #2f2854;
  border-radius: 50%;
  background: #ffcf46;
}

.login-book {
  position: absolute;
  width: 62rpx;
  height: 65rpx;
  left: 0;
  bottom: 0;
  box-sizing: border-box;
  padding: 21rpx 10rpx;
  border: 3rpx solid #2f2854;
  border-radius: 12rpx 12rpx 18rpx 8rpx;
  background: #ffffff;
  transform: rotate(-5deg);
}

.book-line {
  height: 5rpx;
  border-radius: 5rpx;
  background: #8ee3c2;
}

.book-line--short {
  width: 28rpx;
  margin-top: 8rpx;
  background: #ff8f86;
}

.login-copy {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  margin: 0 12rpx 0 16rpx;
}

.login-title {
  color: #2f2854;
  font-size: 25rpx;
  font-weight: 900;
}

.login-subtitle {
  margin-top: 7rpx;
  color: #7e769b;
  font-size: 20rpx;
  line-height: 1.4;
}

.login-button {
  height: 64rpx;
  margin: 0;
  padding: 0 23rpx;
  border: 0;
  border-radius: 32rpx;
  background: #7657f6;
  color: #ffffff;
  font-size: 23rpx;
  font-weight: 800;
  line-height: 64rpx;
}

.login-button::after {
  border: 0;
}

.section-heading {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin: 52rpx 4rpx 21rpx;
}

.section-heading--manage {
  margin-top: 48rpx;
}

.section-heading > view:first-child {
  display: flex;
  flex-direction: column;
}

.section-title {
  color: #2f2854;
  font-size: 32rpx;
  font-weight: 900;
}

.section-subtitle {
  margin-top: 7rpx;
  color: #8b84a6;
  font-size: 21rpx;
}

.section-mark {
  color: #ffcf46;
  font-size: 39rpx;
  transform: rotate(9deg);
}

.pending-pill {
  padding: 8rpx 15rpx;
  border-radius: 18rpx;
  background: #ffe2de;
  color: #b84943;
  font-size: 20rpx;
  font-weight: 800;
}

.action-grid {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20rpx;
}

.action-card {
  position: relative;
  display: flex;
  min-height: 238rpx;
  box-sizing: border-box;
  overflow: hidden;
  flex-direction: column;
  padding: 22rpx;
  border: 3rpx solid #2f2854;
  border-radius: 30rpx;
  box-shadow: 0 10rpx 0 rgba(47, 40, 84, 0.1);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.action-card--pressed {
  transform: translateY(4rpx) scale(0.99);
  box-shadow: 0 5rpx 0 rgba(47, 40, 84, 0.1);
}

.action-card--mint {
  background: #dff8ee;
}

.action-card--purple {
  background: #eee8ff;
}

.action-card--yellow {
  background: #fff3bf;
}

.action-card--coral {
  background: #ffe3df;
}

.action-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;
  box-sizing: border-box;
  border: 3rpx solid #2f2854;
  border-radius: 23rpx;
  color: #2f2854;
  font-size: 29rpx;
  font-weight: 900;
}

.action-icon--mint {
  background: #8ee3c2;
}

.action-icon--purple {
  background: #b7a5ff;
}

.action-icon--yellow {
  background: #ffcf46;
}

.action-icon--coral {
  background: #ff8f86;
}

.icon-dot {
  position: absolute;
  width: 12rpx;
  height: 12rpx;
  top: -7rpx;
  right: -6rpx;
  border: 3rpx solid #2f2854;
  border-radius: 50%;
  background: #ffcf46;
}

.icon-star {
  position: absolute;
  top: -13rpx;
  right: -9rpx;
  color: #ff6f69;
  font-size: 25rpx;
}

.icon-ring {
  position: absolute;
  width: 15rpx;
  height: 15rpx;
  right: -8rpx;
  bottom: -7rpx;
  border: 3rpx solid #2f2854;
  border-radius: 50%;
  background: #ffffff;
}

.icon-tail {
  position: absolute;
  width: 15rpx;
  height: 15rpx;
  right: 3rpx;
  bottom: -9rpx;
  border-right: 3rpx solid #2f2854;
  border-bottom: 3rpx solid #2f2854;
  background: #ff8f86;
  transform: rotate(40deg);
}

.action-title {
  margin-top: 20rpx;
  color: #2f2854;
  font-size: 29rpx;
  font-weight: 900;
}

.action-desc {
  margin-top: 8rpx;
  color: #746c91;
  font-size: 20rpx;
  line-height: 1.4;
}

.action-arrow {
  position: absolute;
  top: 25rpx;
  right: 23rpx;
  color: #2f2854;
  font-size: 30rpx;
  font-weight: 900;
}

.manage-card,
.settings-card {
  position: relative;
  z-index: 2;
  overflow: hidden;
  border: 2rpx solid #e3ddf3;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 10rpx 28rpx rgba(69, 52, 125, 0.08);
}

.manage-row,
.settings-row {
  display: flex;
  align-items: center;
  min-height: 124rpx;
  box-sizing: border-box;
  padding: 19rpx 22rpx;
  transition: background 0.16s ease;
}

.manage-row--pressed,
.settings-row--pressed {
  background: #faf8ff;
}

.manage-row--border,
.settings-row--border {
  border-top: 2rpx solid #eeeaf7;
}

.manage-icon,
.settings-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
  box-sizing: border-box;
  border: 3rpx solid #2f2854;
  border-radius: 22rpx;
  color: #2f2854;
  font-size: 27rpx;
  font-weight: 900;
}

.manage-icon--coral,
.settings-icon--coral {
  background: #ffb8ac;
}

.manage-icon--purple,
.settings-icon--purple {
  background: #c8bcff;
}

.manage-copy,
.settings-copy {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  margin-left: 19rpx;
}

.manage-title,
.settings-title {
  color: #2f2854;
  font-size: 27rpx;
  font-weight: 900;
}

.manage-desc,
.settings-desc {
  margin-top: 6rpx;
  overflow: hidden;
  color: #8b84a6;
  font-size: 20rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.manage-badge {
  min-width: 42rpx;
  height: 42rpx;
  box-sizing: border-box;
  margin-right: 12rpx;
  padding: 0 11rpx;
  border: 3rpx solid #2f2854;
  border-radius: 21rpx;
  background: #ff6f69;
  color: #ffffff;
  font-size: 19rpx;
  font-weight: 900;
  line-height: 36rpx;
  text-align: center;
}

.manage-arrow,
.settings-arrow {
  margin-left: 12rpx;
  color: #776f94;
  font-size: 40rpx;
  line-height: 1;
}

.settings-card {
  margin-top: 28rpx;
}

.gear-core {
  width: 24rpx;
  height: 24rpx;
  border: 5rpx dotted #2f2854;
  border-radius: 50%;
}

.page-footer {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 48rpx;
  color: #9a93b3;
  font-size: 20rpx;
}

.footer-sprout {
  position: relative;
  width: 37rpx;
  height: 37rpx;
  margin-right: 10rpx;
}

.footer-stem {
  position: absolute;
  width: 4rpx;
  height: 22rpx;
  left: 17rpx;
  bottom: 0;
  border-radius: 4rpx;
  background: #7657f6;
}

.footer-leaf {
  position: absolute;
  width: 15rpx;
  height: 10rpx;
  top: 5rpx;
  border-radius: 15rpx 3rpx 15rpx 3rpx;
}

.footer-leaf--left {
  left: 2rpx;
  background: #8ee3c2;
  transform: rotate(25deg);
}

.footer-leaf--right {
  right: 2rpx;
  background: #ffcf46;
  transform: scaleX(-1) rotate(25deg);
}
</style>
