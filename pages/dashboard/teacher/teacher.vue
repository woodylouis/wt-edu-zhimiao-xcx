<template>
  <view class="dashboard">
    <u-sticky>
      <custom-nav
        :xcxName="'成长评估'"
        :navCustomStyle="navCustomStyle"
        :needBar="false"
      />
      <view class="user-profile">

        <!-- 左侧内容容器 -->
        <view class="profile-left" @click="onClickProfile">
          <view class="avatar-wrapper">
            <image class="avatar-image" :src="avatarUrl" mode="aspectFill" />
            <view class="avatar-badge">
              <text>✨</text>
            </view>
          </view>
          <view class="info">
            <text class="name">{{ displayName }}</text>
            <view class="class-row">
              <view class="class-tag">
                <text class="tag-text">{{ classDisplay }}</text>
              </view>
              <view class="invite-btn" @click.stop="onClickInvite">
                <text class="btn-text">邀请</text>
              </view>
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
    
    <!-- 学生总数和下拉提示 -->
    <view class="list-header">
      <view class="student-count">
        <text class="count-label">共</text>
        <text class="count-num">{{ totalStudents }}</text>
        <text class="count-label">名学生</text>
      </view>
      <view class="pull-hint" v-if="!noMoreData && studentList.length > 0">
        <text>↓ 下拉加载更多</text>
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
      
      <view v-if="loading" class="u-demo-block">
        <view class="u-demo-block__content">
          <u-skeleton
            rows="6"
            :title="false"
            :rowsWidth="['100%', '100%', '100%', '100%', '100%', '100%']"
            :rowsHeight="[
              '160rpx',
              '160rpx',
              '160rpx',
              '160rpx',
              '160rpx',
              '160rpx',
            ]"
            loading
            :animate="true"
          ></u-skeleton>
        </view>
      </view>
      <StudentList
        v-if="!loading && filteredStudentList.length > 0"
        :studentList="filteredStudentList"
        @handleStudentClick="handleStudentClick"
        @handleAssessClick="handleAssessClick"
      />
      
      <!-- 底部创建学生入口 -->
      <view v-if="!loading && filteredStudentList.length > 0" class="bottom-create">
        <text class="help-link" @click="handleHelp">找不到？点击创建新学生</text>
      </view>
    </view>

    <view v-if="loadingMore">
      <view class="u-page__loading-item">
        <u-loading-icon mode="circle" timingFunction="linear"></u-loading-icon>
      </view>
    </view>

    <!-- 悬浮球：可拖拽并自动吸附到屏幕左/右侧 -->
    <QcSuspendBtn
      :mainBtn="btnConfig.suspen.mainBtn"
      :childSize="btnConfig.suspen.childSize"
      :childBtns="btnConfig.suspen.childBtns"
      :openType="btnConfig.suspen.openType"
      :padding="10"
      @childClick="btnConfig.childClick"
    />
    
    <!-- 评估列表弹窗 -->
    <AssessModal 
      :visible="showAssessModal" 
      :student="selectedStudent"
      @close="showAssessModal = false"
      @confirm="onAssessConfirm"
    />
  </view>
</template>

<script setup>
  import customNav from "@/components/customNav";
  import { ref, onMounted, computed, reactive } from "vue";
  import { onShow, onLoad, onUnload, onReachBottom } from "@dcloudio/uni-app";
  import { CURRENT_STUDENT } from "@/lib/types/local_storage.js";

  import QcSuspendBtn from "@/components/qc-suspendBtn/qc-suspendBtn.vue";
  import StudentList from "./components/student-list.vue";
  import AssessModal from "./components/assess-modal.vue";
  import btnConfig from "@/common/suspen-btn/config.js";

  const navCustomStyle =
    "background: linear-gradient(to right, #F5FDF8, #F1FCF5, #F9FCEF);height: calc(100vh / 8);";
  const defaultAvatarUrl = ref(
    "https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/profile.png"
  );
  const switchIconUrl = "../../../static/general/switch.png";
  const page = ref(1);
  const pageSize = ref(30);
  const loading = ref(true);
  const loadingMore = ref(false);
  const noMoreData = ref(false);
  const totalStudents = ref(0); // 学生总数

  const studentList = ref([]);
  const searchKeyword = ref('');
  
  // 评估弹窗相关
  const showAssessModal = ref(false);
  const selectedStudent = ref({});
    
  // 计算属性：过滤后的学生列表
  const filteredStudentList = computed(() => {
    if (!searchKeyword.value.trim()) {
      return studentList.value;
    }
    const keyword = searchKeyword.value.trim().toLowerCase();
    return studentList.value.filter(student => 
      student.name && student.name.toLowerCase().includes(keyword)
    );
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
  const role = ref("teacher"); // 默认值设为teacher
  // 修改用户信息显示部分
  let userNickname = ref("");
  const displayName = computed(() => {
    return userNickname.value
      ? userNickname.value
      : userInfo.value.nickname || "小程序用户";
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
        data: { childId },
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
    uni.showLoading({
      title: "请稍后",
      mask: true,
    });
    
    try {
      // 检查学生是否有报告
      const hasReport = await checkStudentReport(student._id);

      if (!hasReport) {
        uni.hideLoading();
        uni.showToast({
          title: "该学生暂无评估报告",
          icon: "none",
        });
        return;
      }

      uni.setStorageSync(CURRENT_STUDENT, {
        ...student,
      });
      uni.hideLoading();
      uni.navigateTo({
        url: `/pages/assessment/report-v2?isHistory=true`,
      });
    } catch (e) {
      uni.hideLoading();
      console.error("查看报告失败:", e);
    }
  };
  
      // 开始评估入口 - 显示评估列表弹窗
  const handleAssessClick = (student) => {
    console.log("开始评估 - 学生:", student);
    selectedStudent.value = student;
    showAssessModal.value = true;
  };
  
  // 评估确认回调
  const onAssessConfirm = (data) => {
    console.log("评估确认:", data);
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
  // 修改班级显示逻辑
  const classDisplay = computed(() => {
    if (currentClass.value.grade && currentClass.value.class) {
      return `${currentClass.value.grade}${currentClass.value.class}班`;
    }
    return "暂无班级信息";
  });

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

    const loadStudentsWithData = async (classId, pageNum, pageSizeNum) => {
    try {
      // 第一页显示骨架屏，加载更多显示 loading
      loading.value = pageNum === 1;
      loadingMore.value = pageNum > 1;

      const res = await uniCloud.callFunction({
        name: "wt-fetch-report-history",
        data: {
          classId,
          page: pageNum,
          pageSize: pageSizeNum,
        },
      });

      if (res.result.code === 0) {
        if (pageNum === 1) {
          studentList.value = res.result.data.list;
        } else {
          studentList.value = [...studentList.value, ...res.result.data.list];
        }
        // 更新学生总数
        totalStudents.value = res.result.data.total || studentList.value.length;
        noMoreData.value = res.result.data.list.length < pageSizeNum;
      }
    } catch (e) {
      console.error("加载失败:", e);
      uni.showToast({ title: "加载失败", icon: "none" });
    } finally {
      loading.value = false;
      loadingMore.value = false;
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
    currentClass.value = uni.getStorageSync("currentClass") || {};
    checkLoginStatus();
  });

  onReachBottom(() => {
    console.log("onReachBottom");
    if (loadingMore.value) return;

    if (noMoreData.value) {
      uni.showToast({
        title: "没有更多数据了~",
        icon: "none",
        duration: 1500,
      });
      return;
    }

    page.value += 1;
    loadStudentsWithData(currentClass.value._id, page.value, pageSize.value);
  });

  onLoad(async (options) => {
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

    // 加载学生数据
    loadStudentsWithData(currentClass.value._id, page.value, pageSize.value);
  });

  onUnload(() => {
    // 页面卸载时的清理工作
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
        gap: 20rpx;
        align-items: center;
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
        flex-direction: column;
        gap: 6rpx;

        .name {
          color: #3D3D3D;
          font-size: 34rpx;
          font-weight: 700;
          line-height: 1.3;
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
          }
          
          .invite-btn {
            height: 40rpx;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #81C784 0%, #66BB6A 100%);
            padding: 0 20rpx;
            border-radius: 20rpx;
            box-shadow: 0 2rpx 6rpx rgba(102, 187, 106, 0.25);
            transition: all 0.2s ease;
            
            &:active {
              transform: scale(0.95);
            }
            
            .btn-text {
              font-size: 22rpx;
              color: #FFFFFF;
              font-weight: 600;
              line-height: 40rpx;
            }
          }
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

  .u-skeleton-slot {
    @include flex;
    align-items: flex-start;

    &__image {
      width: 40px;
      height: 40px;
      border-radius: 100px;
    }

    &__content {
      margin-left: 10px;
      flex: 1;
    }
  }

  .u-demo-block__content {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
  }
</style>
