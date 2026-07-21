<template>
  <view class="dashboard">
    <view class="dashboard-orb dashboard-orb--coral"></view>
    <view class="dashboard-orb dashboard-orb--purple"></view>
    <view class="dashboard-spark">✦</view>
    <u-sticky>
      <custom-nav
        :xcxName="'成长评估'"
        :navCustomStyle="navCustomStyle"
        :needBar="false"
      />
      <view class="user-profile">
        <view class="profile-confetti profile-confetti--one">+</view>
        <view class="profile-confetti profile-confetti--two">●</view>

        <!-- 左侧内容容器 -->
        <view class="profile-left" @click="onClickProfile">
          <view class="avatar-wrapper">
            <image class="avatar-image" :src="avatarUrl" mode="aspectFill" />
            <view class="avatar-badge">
              <text>✨</text>
            </view>
          </view>
          <view class="info">
            <view class="profile-name-row">
              <text class="name">{{ displayName }}</text>
              <view
                v-for="identity in identityLabels"
                :key="identity.key"
                class="identity-badge"
                :class="`identity-badge--${identity.key}`"
              >
                <view class="identity-dot"></view>
                <text>{{ identity.label }}</text>
              </view>
            </view>
            <view class="class-row">
              <view class="class-tag" @click.stop="onClickInvite">
                <text class="tag-text">{{ classDisplay }}</text>
                <text v-if="currentClass.code" class="copy-text">复制</text>
              </view>
              <button
                class="invite-btn"
                open-type="share"
                data-share-type="teacher"
                :disabled="!currentClass.code"
                hover-class="invite-btn--pressed"
                :hover-stay-time="80"
                @click.stop
              >
                <text class="share-mark">↗</text>
                <text class="btn-text">分享</text>
              </button>
              <button
                class="invite-btn invite-btn--parent"
                :disabled="!currentClass.code"
                hover-class="invite-btn--pressed"
                :hover-stay-time="80"
                @click.stop="openClassInvite"
              >
                <text class="share-mark">▣</text>
                <text class="btn-text">家长码</text>
              </button>
            </view>
          </view>
        </view>

        <!-- 右侧切换按钮 -->
        <view class="switch-btn" @click="onClickSwitch">
          <image class="switch-icon" :src="switchIconUrl" mode="aspectFit" />
        </view>
      </view>
    </u-sticky>
    
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrapper">
        <text class="search-icon">🔍</text>
        <input 
          class="search-input" 
          type="text" 
          v-model="searchKeyword" 
          placeholder="搜索学生姓名..." 
          placeholder-class="search-placeholder"
          @input="onSearchInput"
          @confirm="onSearchConfirm"
        />
        <text v-if="searchKeyword" class="clear-icon" @click="clearSearch">✖</text>
      </view>
    </view>
    
    <!-- 学生总数 -->
    <view class="list-header">
      <view class="student-count">
        <text class="count-label">共</text>
        <text class="count-num">{{ totalStudents }}</text>
        <text class="count-label">名学生</text>
      </view>
      <view class="list-header-actions">
        <view class="notification-entry" @click="openNotifications">
          <text>🔔</text>
          <view v-if="notificationUnread" class="notification-badge">
            {{ notificationUnread > 99 ? '99+' : notificationUnread }}
          </view>
        </view>
        <view class="class-teachers-entry" @click="openClassTeachers">
          <view class="class-teachers-icon">👩‍🏫</view>
          <text>本班老师</text>
          <text class="class-teachers-arrow">›</text>
        </view>
      </view>
    </view>
    
    <view class="student-list">
      <!-- 空状态：显眼的创建学生入口 -->
      <view v-if="!loading && filteredStudentList.length === 0" class="empty-state">
        <view class="empty-icon">👶</view>
        <text class="empty-title">还没有学生哦~</text>
        <text class="empty-desc">点击下方按钮添加第一个学生</text>
        <button class="create-student-btn" @click="handleHelp">
          <text class="btn-icon">➕</text>
          <text>创建学生</text>
        </button>
      </view>
      
      <StudentList
        v-if="!loading && filteredStudentList.length > 0"
        :studentList="filteredStudentList"
        @handleStudentClick="handleStudentClick"
        @handleAssessClick="handleAssessClick"
        @handleStudentEdit="handleStudentEdit"
      />
      
      <!-- 底部创建学生入口 -->
      <view v-if="!loading && filteredStudentList.length > 0" class="bottom-create">
        <text class="help-link" @click="handleHelp">找不到？点击创建新学生</text>
      </view>
    </view>

    <!-- 悬浮球：可拖拽并自动吸附到屏幕左/右侧 -->
    <QcSuspendBtn
      :mainBtn="btnConfig.suspen.mainBtn"
      :childSize="btnConfig.suspen.childSize"
      :childBtns="btnConfig.suspen.childBtns"
      :openType="btnConfig.suspen.openType"
      :padding="10"
      theme="dopamine"
      @childClick="btnConfig.childClick"
    />
    
    <!-- 评估列表弹窗 -->
    <AssessModal 
      :visible="showAssessModal" 
      :student="selectedStudent"
      @close="showAssessModal = false"
      @confirm="onAssessConfirm"
    />

    <ClassTeacherModal
      :visible="showClassTeacherModal"
      :classInfo="currentClass"
      @close="showClassTeacherModal = false"
    />

    <ClassInviteModal
      :visible="showClassInviteModal"
      :classInfo="currentClass"
      @close="showClassInviteModal = false"
    />

    <DopamineLoading
      :show="loading || actionLoading"
      :text="loading ? '正在召集小朋友' : '正在寻找成长报告'"
      :subtext="loading ? '小芽正在整理班级名单' : '马上就好，惊喜正在路上'"
    />
  </view>
</template>

<script setup>
  import customNav from "@/components/customNav";
  import { ref, onMounted, computed, reactive } from "vue";
  import {
    onShow,
    onLoad,
    onUnload,
    onShareAppMessage,
  } from "@dcloudio/uni-app";
  import { CURRENT_STUDENT } from "@/lib/types/local_storage.js";

  import QcSuspendBtn from "@/components/qc-suspendBtn/qc-suspendBtn.vue";
  import StudentList from "./components/student-list.vue";
  import AssessModal from "./components/assess-modal.vue";
  import ClassTeacherModal from "./components/class-teacher-modal.vue";
  import ClassInviteModal from "./components/class-invite-modal.vue";
  import DopamineLoading from "@/components/dopamine-loading/index.vue";
  import btnConfig from "@/common/suspen-btn/config.js";

  const navCustomStyle =
    "background: linear-gradient(135deg, #FFF2B8 0%, #FFD778 48%, #FFB8AC 100%);height: calc(100vh / 8);";
  const defaultAvatarUrl = ref(
    "https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/profile.png"
  );
  const switchIconUrl = "../../../static/general/switch.png";
  const loading = ref(true);
  const actionLoading = ref(false);
  const totalStudents = ref(0); // 学生总数
  const lastLoadedClassId = ref(''); // 记录上次加载的班级ID

  const studentList = ref([]);
  const searchKeyword = ref('');
  
  // 评估弹窗相关
  const showAssessModal = ref(false);
  const selectedStudent = ref({});
  const showClassTeacherModal = ref(false);
  const showClassInviteModal = ref(false);
  const notificationUnread = ref(0);
    
  // 计算属性：过滤后的学生列表
  const filteredStudentList = computed(() => {
    let list = studentList.value;

    // 搜索过滤
    if (searchKeyword.value.trim()) {
      const keyword = searchKeyword.value.trim().toLowerCase();
      list = list.filter(
        (student) =>
          student.name && student.name.toLowerCase().includes(keyword)
      );
    }

    // 刚刚创建的学生优先显示
    const app = getApp();
    const newIds =
      (app && app.globalData && app.globalData.newlyCreatedStudentIds) || [];

    if (newIds.length > 0) {
      // 标记新创建的学生并排序
      list = list.map((student) => ({
        ...student,
        isNew: newIds.includes(student._id),
      }));

      list.sort((a, b) => {
        if (a.isNew && !b.isNew) return -1;
        if (!a.isNew && b.isNew) return 1;
        return 0;
      });
    }

    return list;
  });
    
  // 搜索相关方法
  const onSearchInput = () => {};
  const onSearchConfirm = () => {};
  const clearSearch = () => {
    searchKeyword.value = '';
  };
  // 新增用户信息获取
  const userInfo = ref(uni.getStorageSync("uni-id-pages-userInfo") || {});
  const currentClass = ref(uni.getStorageSync("currentClass") || {});
  const currentMembership = ref(null);
  const role = ref("teacher"); // 默认值设为teacher
  // 修改用户信息显示部分
  let userNickname = ref("");
  const displayName = computed(() => {
    return userNickname.value || userInfo.value.nickname ||
      currentClass.value.memberNickname || "未设置昵称";
  });
  const identityLabels = computed(() => {
    const membership = currentMembership.value || {};
    const hasMembership = Boolean(currentMembership.value);
    const classRole = membership.role || currentClass.value.memberRole || role.value;
    const isHeadTeacher = hasMembership
      ? Boolean(membership.isHeadTeacher || membership.classInfo?.isHeadTeacher)
      : Boolean(currentClass.value.isHeadTeacher);
    const isSchoolDirector = hasMembership
      ? Boolean(membership.isSchoolDirector || membership.schoolInfo?.isSchoolDirector)
      : Boolean(currentClass.value.isSchoolDirector);
    const labels = [];

    if (classRole === "parent") {
      labels.push({ key: "parent", label: "家长" });
    } else if (isHeadTeacher) {
      labels.push({ key: "head-teacher", label: "班主任" });
    } else {
      labels.push({ key: "teacher", label: "老师" });
    }

    if (isSchoolDirector) {
      labels.push({ key: "director", label: "学校负责人" });
    }

    return labels;
  });
  const navigateToLogin = () => {
    uni.reLaunch({
      url: "/uni_modules/uni-id-pages/pages/login/login-withoutpwd",
    });
  };

  const handleHelp = () => {
    uni.navigateTo({
      url: `/pages/enter-class/createChildfForm_v1`,
    });
  };

  const avatarUrl = computed(() => {
    // 添加双重保护逻辑
    return userInfo.value.avatar_file && userInfo.value.avatar_file.url
      ? userInfo.value.avatar_file.url
      : defaultAvatarUrl.value;
  });

  // 新增检查报告函数
  const checkStudentReport = async (childId) => {
    try {
      const res = await uniCloud.callFunction({
        name: "wt-fetch-child-report-history",
        data: {
          childId,
          uniIdToken: uni.getStorageSync("uni_id_token"),
        },
      });
      if (res.result.data.length > 0) {
        return true;
      }
      return false;
    } catch (e) {
      console.error("检查报告失败:", e);
      return false;
    }
  };

  const handleStudentClick = async (student) => {
    console.log("查看报告 - 学生:", student);
    actionLoading.value = true;
    
    try {
      // 检查学生是否有报告
      const hasReport = await checkStudentReport(student._id);

      if (!hasReport) {
        uni.showToast({
          title: "该学生暂无评估报告",
          icon: "none",
        });
        return;
      }

      uni.setStorageSync(CURRENT_STUDENT, {
        ...student,
      });
      uni.navigateTo({
        url: `/pages/assessment/report-v2?isHistory=true`,
      });
    } catch (e) {
      console.error("查看报告失败:", e);
    } finally {
      actionLoading.value = false;
    }
  };
  
      // 开始评估入口 - 显示评估列表弹窗
  const handleAssessClick = (student) => {
    console.log("开始评估 - 学生:", student);
    selectedStudent.value = student;
    showAssessModal.value = true;
  };

  const handleStudentEdit = (student) => {
    const childId = student?._id || student?.id;
    if (!childId) {
      uni.showToast({ title: "暂无学生资料", icon: "none" });
      return;
    }
    uni.navigateTo({
      url: `/pages/dashboard/teacher/student-profile?childId=${encodeURIComponent(childId)}`,
    });
  };
  
  // 评估确认回调
  const onAssessConfirm = (data) => {
    console.log("评估确认:", data);
  };

  const openClassTeachers = () => {
    if (!currentClass.value?._id && !currentClass.value?.id) {
      uni.showToast({ title: "暂无当前班级信息", icon: "none" });
      return;
    }
    showClassTeacherModal.value = true;
  };

  const openNotifications = () => {
    uni.navigateTo({ url: "/pages/notification/list" });
  };

  const loadNotificationSummary = async () => {
    const token = uni.getStorageSync("uni_id_token");
    if (!token) return;
    try {
      const { result } = await uniCloud.callFunction({
        name: "wtdb-notification-center",
        data: { action: "summary", uniIdToken: token },
      });
      if (result?.code === 200) notificationUnread.value = Number(result.data?.unread) || 0;
    } catch (error) {
      console.warn("通知未读数加载失败:", error);
    }
  };

  const onClickInvite = () => {
    if (!currentClass.value?.code) {
      uni.showToast({ title: "暂无班级码", icon: "none" });
      return;
    }

    // 复制班级码到剪贴板
    uni.setClipboardData({
      data: currentClass.value.code,
      success: () => {
        uni.showToast({ title: "班级码已复制", icon: "success" });
      },
      fail: () => {
        uni.showToast({ title: "复制失败", icon: "none" });
      },
    });
  };

  const openClassInvite = () => {
    if (!currentClass.value?.code || !(currentClass.value?._id || currentClass.value?.id)) {
      uni.showToast({ title: "暂无班级邀请信息", icon: "none" });
      return;
    }
    showClassInviteModal.value = true;
  };
  // 修改班级显示逻辑
  const classDisplay = computed(() => {
    if (currentClass.value.grade && currentClass.value.class) {
      return `${currentClass.value.grade}${currentClass.value.class}班`;
    }
    return "暂无班级信息";
  });

  const normalizeIdentifier = (value) => {
    if (!value) return "";
    if (typeof value === "object") {
      return normalizeIdentifier(value.$oid || value._id || value.id);
    }
    return String(value);
  };

  const getClassIdentifiers = (classInfo = {}) =>
    [classInfo.code, classInfo._id, classInfo.id]
      .map(normalizeIdentifier)
      .filter(Boolean);

  const loadCurrentMembership = async () => {
    const token = uni.getStorageSync("uni_id_token");
    const requestedIdentifiers = getClassIdentifiers(currentClass.value);
    const requestKey = requestedIdentifiers.join("|");
    currentMembership.value = null;

    if (!token || !requestKey) return;

    try {
      const { result } = await uniCloud.callFunction({
        name: "wtdb-business-member-class",
        data: { uniIdToken: token },
      });
      if (result?.code !== 200 || !Array.isArray(result.data)) return;

      const membership = result.data.find((item) =>
        getClassIdentifiers(item.classInfo).some((identifier) =>
          requestedIdentifiers.includes(identifier)
        )
      );

      // 防止切换班级时，较早返回的请求覆盖新班级身份。
      if (requestKey === getClassIdentifiers(currentClass.value).join("|")) {
        currentMembership.value = membership || null;
      }
    } catch (error) {
      console.warn("加载当前班级身份失败:", error);
    }
  };

  const onClickSwitch = () => {
    uni
      .navigateTo({
        url: "/pages/enter-class/switchClass",
      })
      .then(() => {
        // 新增返回后强制更新
        userInfo.value = uni.getStorageSync("uni-id-pages-userInfo") || {};
        currentClass.value = uni.getStorageSync("currentClass") || {};
      });
  };

  const onClickProfile = () => {
    uni
      .navigateTo({
        url: "/uni_modules/uni-id-pages/pages/userinfo/userinfo",
        // url:'/pages/assessment/listMoudules'
      })
      .then(() => {
        // 新增返回后强制更新
        userInfo.value = uni.getStorageSync("uni-id-pages-userInfo") || {};
        currentClass.value = uni.getStorageSync("currentClass") || {};
      });
  };

    const loadStudentsWithData = async (classId) => {
    try {
      loading.value = true;

      const res = await uniCloud.callFunction({
        name: "wt-fetch-report-history",
        data: {
          classId,
          uniIdToken: uni.getStorageSync("uni_id_token"),
        },
      });

      if (res.result.code === 0) {
        studentList.value = res.result.data.list;
        // 更新学生总数
        totalStudents.value = res.result.data.total || studentList.value.length;
        // 记录当前加载的班级ID
        lastLoadedClassId.value = classId;
      }
    } catch (e) {
      console.error("加载失败:", e);
      uni.showToast({ title: "加载失败", icon: "none" });
    } finally {
      loading.value = false;
    }
  };

  // 在切换班级或需要刷新数据时清除缓存
  const clearStudentsCache = (classId) => {
    const cacheKey = `class_${classId}_students`;
    uni.removeStorageSync(cacheKey);
  };

  // 检查是否有班级
  const checkIfAnyClass = async () => {
    try {
      const classRes = await uniCloud.callFunction({
        name: "wtdb-business-class-list",
        data: {
          uniIdToken: uni.getStorageSync("uni_id_token"),
        },
      });

      if (classRes.result.code == 200 && classRes.result.data.length == 0) {
        uni.reLaunch({
          url: "/pages/enter-class/index",
        });
        return false;
      }
      return true;
    } catch (e) {
      console.error("班级查询失败:", e);
      return true;
    }
  };

  onShow(() => {
    // 更新用户信息
    userInfo.value = uni.getStorageSync("uni-id-pages-userInfo") || {};
    const newClass = uni.getStorageSync("currentClass") || {};
    
    // 每次回到页面都刷新，以同步最新评估进度。
    const classId = newClass._id || newClass.id;
    if (classId) {
      const classChanged = classId !== lastLoadedClassId.value;
      currentClass.value = newClass;
      if (classChanged) {
        studentList.value = [];
      }
      loadStudentsWithData(classId);
    } else {
      currentClass.value = newClass;
    }
    
    if (checkLoginStatus()) {
      loadCurrentMembership();
      loadNotificationSummary();
    }
  });

  onLoad(async (options) => {
    // #ifdef MP-WEIXIN
    uni.showShareMenu({ menus: ["shareAppMessage"] });
    // #endif

    // 检查是否有班级
    const hasClass = await checkIfAnyClass();
    if (!hasClass) return;

    // 读取传递的参数
    if (options.userNickname) {
      userNickname.value = options.userNickname;
    }
    if (options.role) {
      role.value = options.role;
    }

    // 获取用户和班级信息
    userInfo.value = uni.getStorageSync("uni-id-pages-userInfo") || {};
    currentClass.value = uni.getStorageSync("currentClass") || {};

  });

  onUnload(() => {
    // 页面卸载时的清理工作
  });

  onShareAppMessage((event) => {
    const classCode = currentClass.value?.code || "";
    const isParentInvite = event?.target?.dataset?.shareType === "parent";
    const query = classCode ? `?classCode=${encodeURIComponent(classCode)}` : "";

    return {
      title: classCode
        ? isParentInvite
          ? `邀请家长加入${classDisplay.value}，查看孩子的成长`
          : `邀请你加入${classDisplay.value}，一起记录成长`
        : "知苗成长｜看见孩子的每一次进步",
      path: isParentInvite
        ? `/pages/guardian/join${query}`
        : `/pages/enter-class/applyClassForm1${query}${query ? '&role=teacher' : '?role=teacher'}`,
    };
  });

  const checkLoginStatus = () => {
    try {
      // 获取本地存储的登录信息
      const token = uni.getStorageSync("uni_id_token");
      const userInfo = uni.getStorageSync("uni-id-pages-userInfo");
      const tokenExpired = uni.getStorageSync("uni_id_token_expired");

      // 三重校验条件
      const isValid = token && userInfo?._id && tokenExpired > Date.now();

      if (!isValid) {
        navigateToLogin();
        return false;
      }
      return true;
    } catch (e) {
      console.error("登录状态检查失败:", e);
      navigateToLogin();
      return false;
    }
  };

  onMounted(() => {
    userInfo.value = uni.getStorageSync("uni-id-pages-userInfo") || {};
    currentClass.value = uni.getStorageSync("currentClass") || {};
  });
</script>

<style lang="scss" scoped>
  .dashboard {
    min-height: 100vh;
    background: linear-gradient(180deg, 
      #F5FDF8 0%,      // 与头部左侧衔接
      #F1FCF5 5%,      // 与头部中间衔接
      #FFF9F0 15%,     // 过渡到暖色
      #FFFCF8 30%,     // 柔和的暖色过渡
      #FEFEFE 50%      // 内容区域背景
    );
    
    .user-profile {
      height: calc(100vh / 12);
      min-height: 100rpx;
      background: linear-gradient(to right, #f5fdf8, #f1fcf5, #f9fcef);
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 32rpx;
      position: relative;
      overflow: hidden;
      
      // 装饰圆点
      .deco-dots {
        position: absolute;
        width: 100%;
        height: 100%;
        pointer-events: none;
        
        .dot {
          position: absolute;
          border-radius: 50%;
          opacity: 0.5;
        }
        
        .dot-1 {
          width: 80rpx;
          height: 80rpx;
          background: linear-gradient(135deg, #FFD54F 0%, #FFB74D 100%);
          top: -20rpx;
          right: 120rpx;
        }
        
        .dot-2 {
          width: 50rpx;
          height: 50rpx;
          background: linear-gradient(135deg, #81C784 0%, #66BB6A 100%);
          bottom: 20rpx;
          right: 200rpx;
        }
        
        .dot-3 {
          width: 30rpx;
          height: 30rpx;
          background: linear-gradient(135deg, #64B5F6 0%, #42A5F5 100%);
          top: 30rpx;
          left: 280rpx;
        }
      }

      .profile-left {
        display: flex;
        flex: 1;
        gap: 20rpx;
        align-items: center;
        min-width: 0;
        z-index: 2;
      }
      
      .avatar-wrapper {
        position: relative;
        flex-shrink: 0;
        
        .avatar-image {
          width: 100rpx;
          height: 100rpx;
          border-radius: 50%;
          border: 4rpx solid #fff;
          box-shadow: 0 2rpx 12rpx rgba(255, 138, 101, 0.25);
        }
        
        .avatar-badge {
          position: absolute;
          bottom: -2rpx;
          right: -6rpx;
          width: 32rpx;
          height: 32rpx;
          background: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.1);
          
          text {
            font-size: 18rpx;
          }
        }
      }

      .info {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 6rpx;
        min-width: 0;

        .profile-name-row {
          display: flex;
          align-items: center;
          min-width: 0;
          flex-wrap: wrap;
          gap: 8rpx;
        }

        .name {
          color: #3D3D3D;
          font-size: 34rpx;
          font-weight: 700;
          line-height: 1.3;
          min-width: 0;
          max-width: 220rpx;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .identity-badge {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 7rpx;
          height: 34rpx;
          padding: 0 13rpx;
          color: #4f4570;
          font-size: 20rpx;
          font-weight: 800;
          line-height: 34rpx;
          border-radius: 999rpx;
          background: #e9e3ff;

          .identity-dot {
            width: 10rpx;
            height: 10rpx;
            border-radius: 50%;
            background: #7c63e8;
          }

          &.identity-badge--head-teacher {
            color: #735519;
            background: #fff0a8;

            .identity-dot {
              background: #e3aa14;
            }
          }

          &.identity-badge--director {
            color: #25684f;
            background: #d9f5e9;

            .identity-dot {
              background: #42b88e;
            }
          }

          &.identity-badge--parent {
            color: #7a3f38;
            background: #ffe5df;

            .identity-dot {
              background: #ff765f;
            }
          }

        }

        .class-row {
          display: flex;
          align-items: center;
          gap: 12rpx;
          
          .class-tag {
            height: 40rpx;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #FFFFFF;
            padding: 0 16rpx;
            border-radius: 20rpx;
            box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.05);
            
            .tag-text {
              font-size: 22rpx;
              color: #666;
              line-height: 40rpx;
            }

            .copy-text {
              margin-left: 9rpx;
              padding-left: 9rpx;
              color: #7c63e8;
              border-left: 1rpx solid rgba(57, 47, 89, 0.18);
              font-size: 18rpx;
              font-weight: 700;
              line-height: 1;
            }
          }
          
          .invite-btn {
            height: 40rpx;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #81C784 0%, #66BB6A 100%);
            padding: 0 20rpx;
            margin: 0;
            border: 0;
            border-radius: 20rpx;
            box-shadow: 0 2rpx 6rpx rgba(102, 187, 106, 0.25);
            transition: all 0.2s ease;
            line-height: 40rpx;

            &::after {
              border: 0;
            }

            &.invite-btn--parent {
              background: linear-gradient(135deg, #a58bff 0%, #7c63e8 100%);
              box-shadow: 0 2rpx 6rpx rgba(124, 99, 232, 0.28);
            }

            &[disabled] {
              opacity: 0.5;
            }
            
            &.invite-btn--pressed {
              transform: scale(0.95);
            }

            .share-mark {
              margin-right: 6rpx;
              color: #fff;
              font-size: 20rpx;
              font-weight: 900;
              line-height: 40rpx;
            }
            
            .btn-text {
              font-size: 22rpx;
              color: #FFFFFF;
              font-weight: 600;
              line-height: 40rpx;
            }
          }
        }

        .school {
          color: #3d464a;
          font-family: "PingFang SC";
          font-size: 24rpx;
          font-style: normal;
          font-weight: 400;
        }
      }
      
      .switch-btn {
        width: 68rpx;
        height: 68rpx;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2rpx 12rpx rgba(255, 138, 101, 0.2);
        z-index: 2;
        transition: all 0.2s ease;
        flex-shrink: 0;
        
        &:active {
          transform: scale(0.92);
        }
        
        .switch-icon {
          width: 38rpx;
          height: 38rpx;
        }
      }
    }
    
    // 列表头部：学生总数和下拉提示
    .list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8rpx 40rpx 16rpx;
      
      .student-count {
        display: flex;
        align-items: center;
        
        .count-label {
          font-size: 26rpx;
          color: #888;
        }
        
        .count-num {
          font-size: 32rpx;
          font-weight: 700;
          color: #66BB6A;
          margin: 0 6rpx;
        }
      }
      
      .pull-hint {
        font-size: 22rpx;
        color: #aaa;
        display: flex;
        align-items: center;
        animation: bounce 1.5s infinite;
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6rpx); }
        }
      }
    }
    
    // 空状态样式
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 100rpx 40rpx;
      
      .empty-icon {
        font-size: 120rpx;
        margin-bottom: 24rpx;
      }
      
      .empty-title {
        font-size: 34rpx;
        font-weight: 600;
        color: #333;
        margin-bottom: 12rpx;
      }
      
      .empty-desc {
        font-size: 26rpx;
        color: #888;
        margin-bottom: 40rpx;
      }
      
      .create-student-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12rpx;
        width: 360rpx;
        height: 88rpx;
        background: linear-gradient(135deg, #81C784 0%, #66BB6A 100%);
        border-radius: 44rpx;
        color: #fff;
        font-size: 32rpx;
        font-weight: 600;
        box-shadow: 0 8rpx 24rpx rgba(102, 187, 106, 0.35);
        border: none;
        margin: 0;
        padding: 0;
        
        &::after {
          border: none;
        }
        
        .btn-icon {
          font-size: 28rpx;
        }
      }
    }
    
    // 底部创建入口
    .bottom-create {
      padding: 32rpx 0 48rpx;
      text-align: center;
      
      .help-link {
        font-size: 28rpx;
        color: #888;
        text-decoration: underline;
      }
    }
    
    // 搜索栏样式
    .search-bar {
      padding: 16rpx 32rpx;
      background: transparent;
      
      .search-input-wrapper {
        display: flex;
        align-items: center;
        background: #FFFFFF;
        border-radius: 40rpx;
        padding: 0 24rpx;
        height: 72rpx;
        box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
        
        .search-icon {
          font-size: 28rpx;
          margin-right: 12rpx;
        }
        
        .search-input {
          flex: 1;
          font-size: 28rpx;
          color: #333;
          height: 72rpx;
        }
        
        .search-placeholder {
          color: #999;
          font-size: 28rpx;
        }
        
        .clear-icon {
          font-size: 24rpx;
          color: #999;
          padding: 8rpx;
        }
      }
    }

    .student-list {
      padding: 5rpx 40rpx;
    }

    .assessment-option {
      margin: 0 40rpx 0 40rpx;
      border-radius: 12px;

      .option {
        border: 1px solid #100d40;
        width: calc(100vw - 80rpx);
        height: 118px;
        flex-shrink: 0;
        border-radius: 12px;
        background: #fff;
        box-shadow: 0px 0px 1px 0px rgba(193, 197, 210, 0.2);
        margin-bottom: 32rpx;
        display: flex;
        align-items: center;
        justify-content: space-between;

        .title {
          color: #100d40;
          font-family: "PingFang SC";
          font-size: 20px;
          font-style: normal;
          font-weight: 600;
          line-height: normal;
          margin-left: 80rpx;
          margin-right: 90rpx;
        }

        .image {
          width: 170rpx;
          height: 170rpx;
          margin-right: 40rpx;
        }
      }
    }
  }

  .no-data {
    margin-top: 100rpx;
    width: 100%;
    text-align: center;
    color: #6f7374;
    font-size: 32rpx;
    padding: 60rpx 0;
    font-family: "PingFang SC";
  }

  .help-container {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-top: 58rpx;
  }

  .help-link {
    color: #6f7374;
    font-size: 32rpx;
    // text-decoration: underline;
  }

</style>

<style scoped lang="scss">
.dashboard {
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
  color: #31284f;
  background:
    radial-gradient(circle at 8% 32%, rgba(255, 212, 71, 0.3) 0 86rpx, transparent 88rpx),
    radial-gradient(circle at 95% 56%, rgba(165, 139, 255, 0.2) 0 126rpx, transparent 128rpx),
    linear-gradient(180deg, #fff7d9 0%, #fff4ed 42%, #f4efff 100%);
}

.dashboard-orb {
  position: fixed;
  z-index: 0;
  pointer-events: none;
  border: 4rpx solid #392f59;
}

.dashboard-orb--coral {
  top: 36%;
  left: -48rpx;
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
  background: #ff8f82;
  box-shadow: 10rpx 10rpx 0 #ffd447;
}

.dashboard-orb--purple {
  right: -44rpx;
  bottom: 22%;
  width: 92rpx;
  height: 138rpx;
  border-radius: 48rpx;
  background: #a58bff;
  transform: rotate(-14deg);
}

.dashboard-spark {
  position: fixed;
  z-index: 0;
  top: 51%;
  left: 22rpx;
  color: #ff765f;
  font-size: 54rpx;
  font-weight: 900;
  transform: rotate(15deg);
}

.dashboard .user-profile {
  position: relative;
  z-index: 2;
  overflow: hidden;
  min-height: 154rpx;
  height: auto;
  margin: -2rpx 26rpx 14rpx;
  padding: 24rpx 26rpx;
  border: 4rpx solid #392f59;
  border-radius: 34rpx;
  background: linear-gradient(135deg, #fff 0%, #fff1ac 100%);
  box-shadow: 9rpx 9rpx 0 #ff8f82;
}

.dashboard .user-profile .profile-confetti {
  position: absolute;
  z-index: 0;
  color: #7c63e8;
  font-weight: 900;
  pointer-events: none;
}

.dashboard .user-profile .profile-confetti--one {
  top: 10rpx;
  right: 112rpx;
  font-size: 44rpx;
  transform: rotate(18deg);
}

.dashboard .user-profile .profile-confetti--two {
  right: 168rpx;
  bottom: 14rpx;
  color: #ff765f;
  font-size: 18rpx;
}

.dashboard .user-profile .profile-left,
.dashboard .user-profile .switch-btn {
  position: relative;
  z-index: 1;
}

.dashboard .user-profile .avatar-wrapper {
  width: 98rpx;
  height: 98rpx;
  border: 4rpx solid #392f59;
  border-radius: 50%;
  background: #fff;
  box-shadow: 5rpx 5rpx 0 #a58bff;
}

.dashboard .user-profile .avatar-wrapper .avatar-image {
  width: 100%;
  height: 100%;
  border: 4rpx solid #fff;
  box-sizing: border-box;
}

.dashboard .user-profile .avatar-wrapper .avatar-badge {
  right: -8rpx;
  bottom: -6rpx;
  width: 38rpx;
  height: 38rpx;
  border: 3rpx solid #392f59;
  background: #79dfc2;
  box-shadow: none;
}

.dashboard .user-profile .info .name {
  color: #31284f;
  font-size: 33rpx;
  font-weight: 900;
}

.dashboard .user-profile .info .class-row .class-tag {
  padding: 7rpx 14rpx;
  border: 2rpx solid #392f59;
  border-radius: 999rpx;
  background: #fff;
}

.dashboard .user-profile .info .class-row .class-tag .tag-text {
  color: #615878;
  font-weight: 700;
}

.dashboard .user-profile .info .class-row .invite-btn {
  padding: 7rpx 16rpx;
  border: 2rpx solid #392f59;
  border-radius: 999rpx;
  background: #a58bff;
}

.dashboard .user-profile .info .class-row .invite-btn .btn-text {
  color: #fff;
  font-weight: 900;
}

.dashboard .user-profile .switch-btn {
  width: 70rpx;
  height: 70rpx;
  border: 4rpx solid #392f59;
  border-radius: 22rpx;
  background: #79dfc2;
  box-shadow: 5rpx 5rpx 0 #ffd447;

  &:active {
    transform: translate(3rpx, 3rpx);
    box-shadow: 2rpx 2rpx 0 #ffd447;
  }
}

.dashboard .user-profile .switch-btn .switch-icon {
  width: 38rpx;
  height: 38rpx;
}

.dashboard .search-bar {
  position: relative;
  z-index: 1;
  padding: 26rpx 28rpx 14rpx;
  background: transparent;
}

.dashboard .search-bar .search-input-wrapper {
  height: 92rpx;
  padding: 0 24rpx;
  border: 4rpx solid #392f59;
  border-radius: 28rpx;
  background: #fff;
  box-shadow: 7rpx 7rpx 0 #ffd447;
}

.dashboard .search-bar .search-input-wrapper .search-icon {
  font-size: 34rpx;
}

.dashboard .search-bar .search-input-wrapper .search-input {
  color: #31284f;
  font-size: 28rpx;
  font-weight: 700;
}

.dashboard .list-header {
  position: relative;
  z-index: 1;
  padding: 20rpx 30rpx 12rpx;
  background: transparent;
}

.dashboard .list-header .student-count {
  display: inline-flex;
  align-items: baseline;
  padding: 10rpx 20rpx;
  border: 3rpx solid #392f59;
  border-radius: 999rpx;
  background: #eee9ff;
  box-shadow: 4rpx 4rpx 0 #79dfc2;
}

.dashboard .list-header .student-count .count-label {
  color: #615878;
  font-weight: 700;
}

.dashboard .list-header .student-count .count-num {
  margin: 0 8rpx;
  color: #7c63e8;
  font-size: 38rpx;
  font-weight: 900;
}

.dashboard .list-header .list-header-actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.dashboard .list-header .notification-entry {
  position: relative;
  display: flex;
  width: 58rpx;
  height: 58rpx;
  align-items: center;
  justify-content: center;
  border: 3rpx solid #392f59;
  border-radius: 50%;
  background: #ffd447;
  box-shadow: 4rpx 4rpx 0 #79dfc2;
  font-size: 25rpx;

  &:active {
    transform: translate(3rpx, 3rpx);
    box-shadow: 1rpx 1rpx 0 #79dfc2;
  }
}

.dashboard .list-header .notification-badge {
  position: absolute;
  top: -13rpx;
  right: -13rpx;
  min-width: 30rpx;
  height: 30rpx;
  padding: 0 5rpx;
  color: #fff;
  border: 3rpx solid #392f59;
  border-radius: 999rpx;
  background: #ff5260;
  font-size: 16rpx;
  font-weight: 900;
  line-height: 30rpx;
  text-align: center;
  box-sizing: border-box;
}

.dashboard .list-header .class-teachers-entry {
  display: inline-flex;
  align-items: center;
  min-height: 58rpx;
  padding: 0 15rpx 0 10rpx;
  color: #392f59;
  border: 3rpx solid #392f59;
  border-radius: 999rpx;
  background: #ffb6ad;
  box-shadow: 4rpx 4rpx 0 #a58bff;
  font-size: 23rpx;
  font-weight: 900;

  &:active {
    transform: translate(3rpx, 3rpx);
    box-shadow: 1rpx 1rpx 0 #a58bff;
  }
}

.dashboard .list-header .class-teachers-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40rpx;
  height: 40rpx;
  margin-right: 7rpx;
  border: 2rpx solid #392f59;
  border-radius: 50%;
  background: #fff;
  font-size: 21rpx;
}

.dashboard .list-header .class-teachers-arrow {
  margin-left: 7rpx;
  font-size: 31rpx;
  font-weight: 900;
  line-height: 1;
}

.dashboard > .student-list {
  position: relative;
  z-index: 1;
  padding: 12rpx 28rpx 200rpx;
}

.dashboard .empty-state {
  min-height: 410rpx;
  margin-top: 12rpx;
  padding: 46rpx 34rpx;
  border: 4rpx solid #392f59;
  border-radius: 36rpx;
  background: #fff;
  box-shadow: 10rpx 10rpx 0 #79dfc2;
}

.dashboard .empty-state .empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 128rpx;
  height: 128rpx;
  margin-bottom: 22rpx;
  border: 3rpx solid #392f59;
  border-radius: 45% 55% 48% 52%;
  background: #ffd447;
  font-size: 66rpx;
  transform: rotate(-4deg);
}

.dashboard .empty-state .empty-title {
  color: #31284f;
  font-size: 34rpx;
  font-weight: 900;
}

.dashboard .empty-state .empty-desc {
  color: #746d88;
  font-weight: 600;
}

.dashboard .empty-state .create-student-btn {
  margin-top: 30rpx;
  border: 4rpx solid #392f59;
  border-radius: 24rpx;
  color: #fff;
  background: #7c63e8;
  box-shadow: 6rpx 6rpx 0 #ffd447;
  font-weight: 900;

  &::after {
    border: none;
  }

  &:active {
    transform: translate(4rpx, 4rpx);
    box-shadow: 2rpx 2rpx 0 #ffd447;
  }
}

.dashboard .bottom-create {
  padding: 32rpx 0 0;
}

.dashboard .bottom-create .help-link {
  display: inline-flex;
  padding: 12rpx 22rpx;
  color: #392f59;
  border: 3rpx solid #392f59;
  border-radius: 999rpx;
  background: #ffb6ad;
  font-size: 25rpx;
  font-weight: 800;
}
</style>
