<template>
    <view class="dashboard">
        <view class="page-orb page-orb--yellow"></view>
        <view class="page-orb page-orb--purple"></view>
        <view class="page-spark page-spark--one">✦</view>
        <view class="page-spark page-spark--two">+</view>

        <custom-nav :xcxName="'成长评估'" :navCustomStyle="navCustomStyle" :needBar="false" :needBack="true" />

        <view class="user-profile">
            <view class="profile-left" @click="onClickProfile">
                <view class="avatar-wrap">
                    <image class="avatar-image" :src="avatarUrl" mode="aspectFill" />
                    <view class="avatar-badge">✨</view>
                </view>
                <view class="info">
                    <view class="name-row">
                        <text class="name">{{ displayName }}</text>
                        <text v-if="role === 'teacher'" class="role-tag">老师</text>
                    </view>
                    <view class="class-row">
                        <text class="class-icon">🏫</text>
                        <text class="class-name">{{ classDisplay }}</text>
                    </view>
                    <view v-if="role === 'teacher'" class="invite" @click.stop="onClickInvite">+  复制班级邀请码</view>
                </view>
            </view>

            <view class="switch-class" @click="onClickSwitch">
                <text class="switch-icon">⇄</text>
                <text class="switch-label">切换班级</text>
            </view>
        </view>

        <view v-if="role === 'teacher'" class="library-section">
            <view class="section-heading">
                <view class="heading-copy">
                    <text class="section-eyebrow">ASSESSMENT LIBRARY</text>
                    <text class="section-title">选择成长量表</text>
                    <text class="section-subtitle">选好量表和孩子，就可以开始记录成长</text>
                </view>
                <view class="count-pill">
                    <text class="count-number">{{ assessmentList.length }}</text>
                    <text class="count-label">份量表</text>
                </view>
            </view>

            <view class="assessment-option">
                <view
                    v-for="(item, index) in assessmentList"
                    :key="item.id"
                    class="option"
                    :class="`option--${index % 4}`"
                    hover-class="option--pressed"
                    :hover-stay-time="80"
                    @click="handleAssessmentClick(item)"
                >
                    <view class="card-dot card-dot--one"></view>
                    <view class="card-dot card-dot--two"></view>
                    <view class="option-index">{{ index + 1 < 10 ? `0${index + 1}` : index + 1 }}</view>
                    <view class="option-copy">
                        <text class="option-kicker">成长评估</text>
                        <text class="title">{{ item.title }}</text>
                        <text class="option-desc">选择孩子，开始记录这一阶段的成长表现</text>
                        <view class="option-meta">
                            <text class="meta-chip">📍 校内评估</text>
                            <text class="meta-chip">✦ 进度可保存</text>
                        </view>
                    </view>
                    <view class="option-art">
                        <view class="art-halo"></view>
                        <image class="image" src="../../static/assessment-list/child-assess.svg" mode="aspectFit" />
                        <view class="enter-arrow">↗</view>
                    </view>
                </view>
            </view>

            <view v-if="!assessmentLoading && assessmentList.length === 0" class="empty-card">
                <view class="empty-icon">🌱</view>
                <text class="empty-title">还没有可用的成长量表</text>
                <text class="empty-desc">请稍后再来看看，新的成长任务正在准备中</text>
            </view>
        </view>

        <view v-if="role === 'parent'" class="parent-empty">
            <view class="parent-empty-art">
                <view class="report-sheet">
                    <view class="report-line report-line--long"></view>
                    <view class="report-line report-line--short"></view>
                    <view class="report-star">✦</view>
                </view>
            </view>
            <text class="empty-title">成长报告正在蓄力</text>
            <text class="empty-desc">暂时还没有评估报告，完成评估后就能在这里查看</text>
        </view>

        <view class="help-container" hover-class="help-container--pressed" @click="onClick">
            <text class="home-icon">⌂</text>
            <text class="help-link">回到首页</text>
        </view>

        <DopamineLoading
            :show="assessmentLoading || locationChecking"
            :text="locationChecking ? '正在确认评估位置' : '正在整理成长量表'"
            :subtext="locationChecking ? '小芽正在核对是否在学校范围内' : '一张张成长任务卡正在排队入场'"
        />
    </view>
</template>

<script setup>
import customNav from '@/components/customNav'
import { ref, onMounted, onUnmounted, computed } from "vue";
import { onShow, onLoad } from '@dcloudio/uni-app'
import DopamineLoading from '@/components/dopamine-loading/index.vue'
import { shouldBypassAssessmentLocationCheck } from '@/common/debug.js'
const CACHE_KEY = 'teacher_assessment_list';
const CACHE_EXPIRY = 3600 * 1000; // 1小时有效期
const assessmentList = ref([]);
const pagination = ref({ page: 1, pageSize: 10, total: 0 });
const assessmentLoading = ref(false);
const locationChecking = ref(false);
const navCustomStyle = 'background: linear-gradient(135deg, #FFF2A8 0%, #FFC9BF 52%, #CEC1FF 100%);height: calc(100vh / 8)'
const defaultAvatarUrl = ref("https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/profile.png");

// 新增用户信息获取
const userInfo = ref(uni.getStorageSync('uni-id-pages-userInfo') || {});
const currentClass = ref(uni.getStorageSync('currentClass') || {});
const role = ref('teacher'); // 默认值设为teacher
// 修改用户信息显示部分
let userNickname = ref('');
const displayName = computed(() => {
	return userNickname.value || userInfo.value.nickname ||
		currentClass.value.memberNickname || '未设置昵称';
});

const avatarUrl = computed(() => {
    // 添加双重保护逻辑
    return (userInfo.value.avatar_file && userInfo.value.avatar_file.url)
        ? userInfo.value.avatar_file.url
        : defaultAvatarUrl.value;
});

const onClick = () => {
    uni.switchTab({
        url: '/pages/enter-class/index'
    });
}

const onClickInvite = () => {
    if (!currentClass.value?.code) {
        uni.showToast({ title: '暂无班级码', icon: 'none' });
        return;
    }

    // 复制班级码到剪贴板
    uni.setClipboardData({
        data: currentClass.value.code,
        success: () => {
            uni.showToast({ title: '班级码已复制', icon: 'success' });
        },
        fail: () => {
            uni.showToast({ title: '复制失败', icon: 'none' });
        }
    });
};
// 修改班级显示逻辑
const classDisplay = computed(() => {
    if (currentClass.value.grade && currentClass.value.class) {
        return `${currentClass.value.grade}${currentClass.value.class}班`;
    }
    return '暂无班级信息';
});

const onClickSwitch = () => {
    uni.navigateTo({
        url: '/pages/enter-class/switchClass'
    }).then(() => {
        // 新增返回后强制更新
        userInfo.value = uni.getStorageSync('uni-id-pages-userInfo') || {};
        currentClass.value = uni.getStorageSync('currentClass') || {};
    });
}

const onClickProfile = () => {
    uni.navigateTo({
        url: '/uni_modules/uni-id-pages/pages/userinfo/userinfo'
    }).then(() => {
        // 新增返回后强制更新
        userInfo.value = uni.getStorageSync('uni-id-pages-userInfo') || {};
        currentClass.value = uni.getStorageSync('currentClass') || {};
    });
}

const loadAssessments = async () => {
    assessmentLoading.value = true;
    try {
        // 尝试读取缓存
        const cachedData = uni.getStorageSync(CACHE_KEY);
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_EXPIRY) {
            assessmentList.value = cachedData.list;
            pagination.value.total = cachedData.total;
            return;
        }
        const res = await uniCloud.callFunction({
            name: 'wt-fetch-assessment-list',
            data: {
                page: pagination.value.page,
                pageSize: pagination.value.pageSize
            }
        });

        if (res.result.code === 0) {
            assessmentList.value = res.result.data.list;
            pagination.value.total = res.result.data.total;

            // 更新缓存（包含时间戳）
            uni.setStorageSync(CACHE_KEY, {
                list: res.result.data.list,
                total: res.result.data.total,
                timestamp: Date.now()
            });
        }
    } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' });
    } finally {
        assessmentLoading.value = false;
    }
};

// 添加定时清理过期缓存的逻辑
let cacheTimer = null;

onShow(() => {
    // 新增用户信息更新逻辑
    userInfo.value = uni.getStorageSync('uni-id-pages-userInfo') || {};
    currentClass.value = uni.getStorageSync('currentClass') || {};
    checkLoginStatus();
})

onLoad((options) => {
    console.log('onLoad options:', options);
    // 读取从switchClass页面传递的selectedClass参数
    if (options.userNickname) {
        try {
            // 给displayName
            userNickname.value = options.userNickname;
        } catch (e) {
            console.error('解析selectedClass参数失败:', e);
        }
    }
    if (options.role) {
        role.value = options.role;
    }

    // 保持原有的currentClass逻辑不变
    userInfo.value = uni.getStorageSync('uni-id-pages-userInfo') || {};
    currentClass.value = uni.getStorageSync('currentClass') || {};
});

const checkLoginStatus = () => {
    try {
        // 获取本地存储的登录信息
        const token = uni.getStorageSync('uni_id_token');
        const userInfo = uni.getStorageSync('uni-id-pages-userInfo');
        const tokenExpired = uni.getStorageSync('uni_id_token_expired');

        // 三重校验条件
        const isValid = token &&
            userInfo?._id &&
            tokenExpired > Date.now();

        if (!isValid) {
            navigateToLogin();
            return false;
        }
        return true;
    } catch (e) {
        console.error('登录状态检查失败:', e);
        navigateToLogin();
        return false;
    }
}

const navigateToLogin = () => {
    uni.navigateTo({
        url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd'
    });
}

onMounted(() => {
    loadAssessments();
    userInfo.value = uni.getStorageSync('uni-id-pages-userInfo') || {};
    currentClass.value = uni.getStorageSync('currentClass') || {};
    cacheTimer = setInterval(() => {
        const cachedData = uni.getStorageSync(CACHE_KEY);
        if (cachedData && Date.now() - cachedData.timestamp > CACHE_EXPIRY) {
            uni.removeStorageSync(CACHE_KEY);
        }
    }, 60000); // 每分钟检查一次
    // try {
    //     currentClass = uni.getStorageSync('currentClass');
    // } catch(e) {

    // }
});

onUnmounted(() => {
    if (cacheTimer) clearInterval(cacheTimer);
});

const handleAssessmentClick = async (item) => {
    console.log('点击了评估项:', item);
    let classId = currentClass.value?._id ? currentClass.value?._id : currentClass.value?.id;
    if (!classId) {
        uni.showToast({ title: '请先选择班级', icon: 'none' });
        return;
    }
    
    // 检查用户是否在学校范围内
    const locationCheckResult = await checkUserLocation();
    if (!locationCheckResult.canProceed) {
        return;
    }
    
    uni.navigateTo({
        url: `/pages/assessment/chooseChild?classId=${classId}&className=${classDisplay.value}&assessmentId=${item.id}&assessmentTitle=${item.title}`
    });
};

// 检查用户位置是否在学校范围内
const checkUserLocation = () => {
    // ========== 开发配置 ==========
    // 开启后使用模拟位置数据，用于提交小程序审核
    // 审核通过后设置为 false 使用真实位置
    const USE_MOCK_LOCATION = false;
    // 模拟位置（广东中山市兴文路）
    const MOCK_LOCATION = {
        latitude: 22.504876,
        longitude: 113.408551
    };
    // ========== 开发配置 END ==========
    
    return new Promise((resolve) => {
        // 获取当前班级对应的学校ID
        const schoolId = currentClass.value?.school_id;

        if (shouldBypassAssessmentLocationCheck()) {
            console.log('调试模式，跳过学校位置检查');
            resolve({ canProceed: true, debugBypass: true });
            return;
        }
        
        // 如果班级没有关联学校，直接允许
        if (!schoolId) {
            uni.showToast({ title: '班级未关联学校，请联系管理员', icon: 'none' });
            resolve({ canProceed: false });
            return;
        }
        
        // 使用模拟位置（用于提交审核）
        if (USE_MOCK_LOCATION) {
            console.log('使用模拟位置数据:', MOCK_LOCATION);
            performLocationCheck(MOCK_LOCATION.latitude, MOCK_LOCATION.longitude, schoolId, resolve);
            return;
        }
        
        locationChecking.value = true;
        
        // 使用 getFuzzyLocation 获取模糊位置（隐私合规）
        uni.getFuzzyLocation({
            type: 'wgs84',
            success: (res) => {
                console.log('获取位置成功:', res);
                performLocationCheck(res.latitude, res.longitude, schoolId, resolve);
            },
            fail: (err) => {
                locationChecking.value = false;
                console.error('获取位置失败:', err);
                
                // 用户拒绝授权或获取失败
                if (err.errMsg.includes('auth deny') || err.errMsg.includes('authorize')) {
                    uni.showModal({
                        title: '需要位置权限',
                        content: '进行测试需要获取您的位置信息，以确认您在学校范围内。请授权后重试。',
                        showCancel: true,
                        cancelText: '暂不授权',
                        confirmText: '去授权',
                        confirmColor: '#6EDD8A',
                        success: (res) => {
                            if (res.confirm) {
                                uni.openSetting();
                            }
                        }
                    });
                    resolve({ canProceed: false });
                } else {
                    resolve({ canProceed: false });
                }
            }
        });
    });
};

// 执行位置检查的云函数调用
const performLocationCheck = async (latitude, longitude, schoolId, resolve) => {
    locationChecking.value = true;
    
    try {
        const checkRes = await uniCloud.callFunction({
            name: 'wtdb-check-school-location',
            data: {
                latitude,
                longitude,
                schoolId,
                radius: 1500, // 1500米范围
                uniIdToken: uni.getStorageSync('uni_id_token')
            }
        });
        
        locationChecking.value = false;
        
        if (checkRes.result.code === 200) {
            const { inRange, distance, schoolName } = checkRes.result.data;
            
            if (inRange) {
                resolve({ canProceed: true });
            } else {
                uni.showModal({
                    title: '位置提醒',
                    content: `您当前不在「${schoolName}」范围内（距离约${distance}米），请到学校后再进行测试。`,
                    showCancel: false,
                    confirmText: '我知道了',
                    confirmColor: '#6EDD8A'
                });
                resolve({ canProceed: false });
            }
        } else {
            console.error('位置检查失败:', checkRes.result.message);
            resolve({ canProceed: false });
        }
    } catch (e) {
        locationChecking.value = false;
        console.error('云函数调用失败:', e);
        resolve({ canProceed: false });
    }
};

</script>

<style lang="scss" scoped>
.dashboard {
    position: relative;
    min-height: 100vh;
    box-sizing: border-box;
    overflow: hidden;
    padding-bottom: calc(56rpx + env(safe-area-inset-bottom));
    background:
        radial-gradient(circle at 8% 28%, rgba(255, 205, 65, 0.22), transparent 24%),
        radial-gradient(circle at 94% 62%, rgba(123, 91, 232, 0.14), transparent 27%),
        linear-gradient(180deg, #fff7d7 0%, #fffaf0 32%, #f8f5ff 68%, #effbf7 100%);
    color: #2f2854;
    font-family: "PingFang SC", "Helvetica Neue", sans-serif;
}

.page-orb,
.page-spark {
    position: absolute;
    z-index: 0;
    pointer-events: none;
}

.page-orb {
    border-radius: 50%;
}

.page-orb--yellow {
    width: 230rpx;
    height: 230rpx;
    top: 520rpx;
    left: -150rpx;
    background: rgba(255, 207, 70, 0.17);
}

.page-orb--purple {
    width: 300rpx;
    height: 300rpx;
    right: -210rpx;
    bottom: 210rpx;
    background: rgba(118, 87, 246, 0.11);
}

.page-spark {
    font-weight: 900;
    animation: sparkle 2.8s ease-in-out infinite;
}

.page-spark--one {
    top: 610rpx;
    right: 22rpx;
    color: #ff6f69;
    font-size: 36rpx;
    transform: rotate(14deg);
}

.page-spark--two {
    left: 20rpx;
    bottom: 260rpx;
    color: #7657f6;
    font-size: 42rpx;
    animation-delay: 0.7s;
}

.dashboard > :deep(.navigation) {
    position: relative;
    z-index: 3;
}

.user-profile {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 190rpx;
    box-sizing: border-box;
    margin: 24rpx 28rpx 0;
    padding: 24rpx;
    overflow: hidden;
    border: 2rpx solid rgba(66, 49, 112, 0.13);
    border-radius: 34rpx;
    background: linear-gradient(135deg, #ffd970 0%, #ffb7ae 52%, #cbbcff 100%);
    box-shadow: 0 16rpx 34rpx rgba(86, 63, 128, 0.16);
}

.user-profile::before {
    content: "";
    position: absolute;
    width: 150rpx;
    height: 150rpx;
    top: -76rpx;
    right: 102rpx;
    border: 22rpx solid rgba(255, 255, 255, 0.26);
    border-radius: 50%;
}

.user-profile::after {
    content: "+";
    position: absolute;
    right: 20rpx;
    bottom: -20rpx;
    color: rgba(255, 255, 255, 0.52);
    font-size: 82rpx;
    font-weight: 900;
    transform: rotate(13deg);
}

.profile-left {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
}

.avatar-wrap {
    position: relative;
    flex: 0 0 auto;
    width: 112rpx;
    height: 112rpx;
    margin-right: 20rpx;
    padding: 7rpx;
    box-sizing: border-box;
    border: 3rpx solid #423568;
    border-radius: 34rpx;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 6rpx 7rpx 0 rgba(66, 53, 104, 0.16);
    transform: rotate(-2deg);
}

.avatar-image {
    width: 100%;
    height: 100%;
    border-radius: 25rpx;
}

.avatar-badge {
    position: absolute;
    right: -12rpx;
    bottom: -10rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38rpx;
    height: 38rpx;
    border: 3rpx solid #423568;
    border-radius: 50%;
    background: #ffffff;
    font-size: 20rpx;
}

.info {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.name-row,
.class-row {
    display: flex;
    align-items: center;
}

.name {
    max-width: 230rpx;
    overflow: hidden;
    color: #30264f;
    font-size: 34rpx;
    font-weight: 900;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.role-tag {
    margin-left: 10rpx;
    padding: 4rpx 12rpx;
    border: 2rpx solid rgba(66, 53, 104, 0.25);
    border-radius: 16rpx;
    background: rgba(255, 255, 255, 0.68);
    color: #59468d;
    font-size: 20rpx;
    font-weight: 800;
}

.class-row {
    margin-top: 5rpx;
}

.class-icon {
    margin-right: 7rpx;
    font-size: 22rpx;
}

.class-name {
    max-width: 260rpx;
    overflow: hidden;
    color: rgba(48, 38, 79, 0.78);
    font-size: 24rpx;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.invite {
    align-self: flex-start;
    margin-top: 10rpx;
    padding: 7rpx 14rpx;
    border: 2rpx solid rgba(66, 53, 104, 0.18);
    border-radius: 18rpx;
    background: rgba(255, 255, 255, 0.72);
    color: #503e85;
    font-size: 21rpx;
    font-weight: 800;
}

.switch-class {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 106rpx;
    height: 106rpx;
    margin-left: 12rpx;
    border: 2rpx solid #4e3c82;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.88);
    box-shadow: 5rpx 6rpx 0 rgba(78, 60, 130, 0.18);
}

.switch-class:active {
    transform: translateY(3rpx);
    box-shadow: 2rpx 3rpx 0 rgba(78, 60, 130, 0.18);
}

.switch-icon {
    color: #7657f6;
    font-size: 34rpx;
    font-weight: 900;
    line-height: 1;
}

.switch-label {
    margin-top: 5rpx;
    color: #493a72;
    font-size: 19rpx;
    font-weight: 800;
}

.library-section {
    position: relative;
    z-index: 1;
    padding: 42rpx 28rpx 0;
}

.section-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 24rpx;
    padding: 0 4rpx;
}

.heading-copy {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
}

.section-eyebrow {
    color: #7657f6;
    font-size: 18rpx;
    font-weight: 900;
    letter-spacing: 2.8rpx;
}

.section-title {
    margin-top: 8rpx;
    color: #30284e;
    font-size: 42rpx;
    font-weight: 900;
    line-height: 1.25;
}

.section-subtitle {
    margin-top: 8rpx;
    color: #817994;
    font-size: 23rpx;
    line-height: 1.5;
}

.count-pill {
    display: flex;
    align-items: baseline;
    flex: 0 0 auto;
    margin-left: 16rpx;
    padding: 10rpx 16rpx;
    border: 2rpx solid #ddd4fa;
    border-radius: 24rpx;
    background: rgba(255, 255, 255, 0.86);
    box-shadow: 0 8rpx 20rpx rgba(80, 60, 138, 0.09);
}

.count-number {
    color: #7657f6;
    font-size: 30rpx;
    font-weight: 900;
}

.count-label {
    margin-left: 5rpx;
    color: #6c6480;
    font-size: 20rpx;
    font-weight: 700;
}

.assessment-option {
    display: flex;
    flex-direction: column;
    gap: 24rpx;
}

.option {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 274rpx;
    box-sizing: border-box;
    overflow: hidden;
    padding: 56rpx 20rpx 24rpx 28rpx;
    border: 2rpx solid rgba(58, 44, 92, 0.18);
    border-radius: 34rpx;
    box-shadow: 0 14rpx 30rpx rgba(70, 55, 105, 0.12);
    transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.option--0 {
    background: linear-gradient(135deg, #fff1a9 0%, #fff9db 62%, #ffffff 100%);
}

.option--1 {
    background: linear-gradient(135deg, #ffd0c7 0%, #fff0ec 62%, #ffffff 100%);
}

.option--2 {
    background: linear-gradient(135deg, #d9cdfd 0%, #f2edff 62%, #ffffff 100%);
}

.option--3 {
    background: linear-gradient(135deg, #bdeedb 0%, #e8faf3 62%, #ffffff 100%);
}

.option--pressed {
    transform: scale(0.985) translateY(3rpx);
    box-shadow: 0 7rpx 16rpx rgba(70, 55, 105, 0.11);
}

.option-index {
    position: absolute;
    top: 18rpx;
    left: 24rpx;
    padding: 5rpx 13rpx;
    border: 2rpx solid rgba(58, 44, 92, 0.22);
    border-radius: 16rpx;
    background: rgba(255, 255, 255, 0.7);
    color: #4e3c82;
    font-size: 19rpx;
    font-weight: 900;
    letter-spacing: 1rpx;
}

.card-dot {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.62);
}

.card-dot--one {
    width: 22rpx;
    height: 22rpx;
    top: 18rpx;
    right: 150rpx;
}

.card-dot--two {
    width: 11rpx;
    height: 11rpx;
    top: 48rpx;
    right: 128rpx;
}

.option-copy {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    padding-right: 12rpx;
}

.option-kicker {
    align-self: flex-start;
    padding: 5rpx 12rpx;
    border-radius: 14rpx;
    background: rgba(255, 255, 255, 0.7);
    color: #6d589e;
    font-size: 19rpx;
    font-weight: 900;
    letter-spacing: 1rpx;
}

.title {
    margin-top: 11rpx;
    color: #30284e;
    font-size: 34rpx;
    font-weight: 900;
    line-height: 1.3;
}

.option-desc {
    margin-top: 9rpx;
    color: #6f687d;
    font-size: 22rpx;
    line-height: 1.5;
}

.option-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8rpx;
    margin-top: 14rpx;
}

.meta-chip {
    padding: 5rpx 10rpx;
    border: 1rpx solid rgba(66, 53, 104, 0.12);
    border-radius: 14rpx;
    background: rgba(255, 255, 255, 0.58);
    color: #665c79;
    font-size: 18rpx;
    font-weight: 700;
}

.option-art {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 148rpx;
    height: 174rpx;
}

.art-halo {
    position: absolute;
    width: 142rpx;
    height: 142rpx;
    border: 16rpx solid rgba(255, 255, 255, 0.4);
    border-radius: 50%;
}

.image {
    position: relative;
    z-index: 1;
    width: 126rpx;
    height: 126rpx;
    filter: drop-shadow(0 9rpx 10rpx rgba(47, 113, 91, 0.17));
}

.enter-arrow {
    position: absolute;
    z-index: 2;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 54rpx;
    height: 54rpx;
    border: 2rpx solid #403565;
    border-radius: 50%;
    background: #ffffff;
    box-shadow: 4rpx 5rpx 0 rgba(64, 53, 101, 0.14);
    color: #7657f6;
    font-size: 28rpx;
    font-weight: 900;
}

.empty-card,
.parent-empty {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 20rpx 0 0;
    padding: 68rpx 36rpx;
    border: 2rpx dashed #c9bced;
    border-radius: 34rpx;
    background: rgba(255, 255, 255, 0.76);
    text-align: center;
}

.empty-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 110rpx;
    height: 110rpx;
    margin-bottom: 22rpx;
    border: 3rpx solid #4a3a78;
    border-radius: 32rpx;
    background: #c9f1df;
    box-shadow: 7rpx 8rpx 0 #e5ddfb;
    font-size: 52rpx;
    transform: rotate(-3deg);
}

.empty-title {
    color: #342b54;
    font-size: 31rpx;
    font-weight: 900;
}

.empty-desc {
    max-width: 520rpx;
    margin-top: 12rpx;
    color: #847d91;
    font-size: 23rpx;
    line-height: 1.65;
}

.parent-empty {
    margin: 48rpx 28rpx 0;
    padding: 82rpx 44rpx 72rpx;
    border-style: solid;
    background: linear-gradient(145deg, #fff0b6 0%, #ffe0da 46%, #e8e0ff 100%);
    box-shadow: 0 15rpx 32rpx rgba(75, 57, 112, 0.13);
}

.parent-empty-art {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 154rpx;
    height: 154rpx;
    margin-bottom: 30rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.58);
}

.report-sheet {
    position: relative;
    width: 92rpx;
    height: 112rpx;
    box-sizing: border-box;
    padding: 31rpx 15rpx 0;
    border: 3rpx solid #493b70;
    border-radius: 15rpx;
    background: #ffffff;
    box-shadow: 7rpx 8rpx 0 rgba(73, 59, 112, 0.14);
    transform: rotate(4deg);
}

.report-line {
    height: 7rpx;
    margin-bottom: 12rpx;
    border-radius: 8rpx;
    background: #c9b8ff;
}

.report-line--long {
    width: 58rpx;
}

.report-line--short {
    width: 40rpx;
    background: #ffbf77;
}

.report-star {
    position: absolute;
    top: -18rpx;
    right: -17rpx;
    color: #ff6f69;
    font-size: 38rpx;
    font-weight: 900;
}

.help-container {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 222rpx;
    height: 70rpx;
    margin: 40rpx auto 0;
    border: 2rpx solid #d9d1ec;
    border-radius: 38rpx;
    background: rgba(255, 255, 255, 0.88);
    box-shadow: 0 9rpx 20rpx rgba(72, 55, 108, 0.09);
    transition: transform 0.15s ease;
}

.help-container--pressed {
    transform: scale(0.96);
}

.home-icon {
    margin-right: 9rpx;
    color: #7657f6;
    font-size: 31rpx;
    font-weight: 900;
}

.help-link {
    color: #51466b;
    font-size: 24rpx;
    font-weight: 800;
}

@keyframes sparkle {
    0%,
    100% {
        opacity: 0.55;
        transform: scale(0.86) rotate(8deg);
    }

    50% {
        opacity: 1;
        transform: scale(1.12) rotate(-4deg);
    }
}
</style>
