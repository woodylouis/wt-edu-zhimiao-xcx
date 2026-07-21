<template>
    <view class="dashboard">
        <view class="page-orb page-orb--yellow"></view>
        <view class="page-orb page-orb--purple"></view>
        <view class="page-spark page-spark--one">✦</view>
        <view class="page-spark page-spark--two">+</view>

        <custom-nav :xcxName="pageTitle" :navCustomStyle="navCustomStyle" :needBar="false" :needBack="true" />

        <view class="user-profile">
            <view class="profile-left" @click="onClickProfile">
                <view class="avatar-wrap">
                    <image class="avatar-image" :src="avatarUrl" mode="aspectFill" />
                    <view class="avatar-badge">✨</view>
                </view>
                <view class="info">
                    <view class="name-row">
                        <text class="name">{{ displayName }}</text>
                        <text class="role-tag">{{ role === 'parent' ? '家长' : '老师' }}</text>
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

        <view v-if="role === 'parent'" class="parent-report-section">
            <view class="section-heading parent-report-heading">
                <view class="heading-copy">
                    <text class="section-eyebrow">GROWTH ARCHIVE</text>
                    <text class="section-title">{{ parentChildName }}的成长报告</text>
                    <text class="section-subtitle">仅展示当前家长班级关系所关联孩子的已完成报告</text>
                </view>
                <view class="count-pill count-pill--parent">
                    <text class="count-number">{{ parentReports.length }}</text>
                    <text class="count-label">份报告</text>
                </view>
            </view>

            <view v-if="parentReportError && !parentReportLoading" class="parent-empty parent-empty--error">
                <view class="parent-empty-art parent-empty-art--error">!</view>
                <text class="empty-title">报告暂时迷路了</text>
                <text class="empty-desc">{{ parentReportError }}</text>
                <button class="retry-button" hover-class="retry-button--pressed" @click="loadParentReports">
                    重新整理报告
                </button>
            </view>

            <view v-else-if="!parentReportLoading && parentReports.length" class="parent-report-list">
                <view
                    v-for="(report, index) in parentReports"
                    :key="getReportKey(report)"
                    class="parent-report-card"
                    :class="[
                        `parent-report-card--${index % 4}`,
                        { 'parent-report-card--opening': openingReportId === getReportKey(report) }
                    ]"
                    hover-class="parent-report-card--pressed"
                    :hover-stay-time="80"
                    @click="openParentReport(report)"
                >
                    <view class="report-card-accent"></view>
                    <view class="report-card-topline">
                        <view class="report-complete-badge">
                            <view class="report-complete-dot"></view>
                            <text>已完成</text>
                        </view>
                        <text class="report-card-index">{{ String(index + 1).padStart(2, '0') }}</text>
                    </view>
                    <view class="report-card-body">
                        <view class="report-card-copy">
                            <text class="report-card-kicker">ASSESSMENT REPORT</text>
                            <text class="report-card-title">{{ getReportTitle(report) }}</text>
                            <text v-if="report.reportSummary" class="report-card-summary">{{ report.reportSummary }}</text>
                            <view class="report-card-meta">
                                <text class="report-meta-chip">📅 {{ formatReportDate(report.completionTime || report.createTime) }}</text>
                                <text v-if="report.assessorName" class="report-meta-chip">✦ {{ report.assessorName }}</text>
                            </view>
                        </view>
                        <view class="report-open-action">
                            <view v-if="openingReportId === getReportKey(report)" class="report-opening-spinner"></view>
                            <text v-else>↗</text>
                        </view>
                    </view>
                    <view class="report-card-footer">
                        <text>{{ openingReportId === getReportKey(report) ? '正在打开报告' : '查看完整成长报告' }}</text>
                        <text class="report-footer-arrow">→</text>
                    </view>
                </view>
            </view>

            <view v-else-if="!parentReportLoading" class="parent-empty">
            <view class="parent-empty-art">
                <view class="report-sheet">
                    <view class="report-line report-line--long"></view>
                    <view class="report-line report-line--short"></view>
                    <view class="report-star">✦</view>
                </view>
            </view>
            <text class="empty-title">成长报告正在蓄力</text>
                <text class="empty-desc">{{ parentChildName }}暂时还没有已完成的评估报告，报告生成后会第一时间出现在这里</text>
            </view>
        </view>

        <view class="help-container" hover-class="help-container--pressed" @click="onClick">
            <text class="home-icon">⌂</text>
            <text class="help-link">回到首页</text>
        </view>

        <DopamineLoading
            :show="assessmentLoading || locationChecking || parentReportLoading || reportOpening"
            :text="loadingText"
            :subtext="loadingSubtext"
        />
    </view>
</template>

<script setup>
import customNav from '@/components/customNav'
import { ref, onMounted, onUnmounted, computed } from "vue";
import { onShow, onLoad } from '@dcloudio/uni-app'
import DopamineLoading from '@/components/dopamine-loading/index.vue'
import { shouldBypassAssessmentLocationCheck } from '@/common/debug.js'
import { CURRENT_STUDENT } from '@/lib/types/local_storage.js'
const CACHE_KEY = 'teacher_assessment_list';
const CACHE_EXPIRY = 3600 * 1000; // 1小时有效期
const assessmentList = ref([]);
const pagination = ref({ page: 1, pageSize: 10, total: 0 });
const assessmentLoading = ref(false);
const locationChecking = ref(false);
const parentReports = ref([]);
const parentReportLoading = ref(false);
const parentReportError = ref('');
const parentContext = ref({});
const openingReportId = ref('');
const reportOpening = ref(false);
let parentRequestVersion = 0;
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

const pageTitle = computed(() => role.value === 'parent' ? '成长报告' : '成长评估');
const parentChildName = computed(() =>
    parentContext.value.childName ||
    currentClass.value.childName ||
    parentReports.value[0]?.childName ||
    '孩子'
);
const loadingText = computed(() => {
    if (locationChecking.value) return '正在确认评估位置';
    if (reportOpening.value) return '正在打开成长报告';
    if (parentReportLoading.value) return `正在整理${parentChildName.value}的报告`;
    return '正在整理成长量表';
});
const loadingSubtext = computed(() => {
    if (locationChecking.value) return '小芽正在核对是否在学校范围内';
    if (reportOpening.value) return '报告内容就要出现啦';
    if (parentReportLoading.value) return '只会带回当前关联孩子的已完成报告';
    return '一张张成长任务卡正在排队入场';
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

const normalizeIdentifier = (value) => {
    if (!value) return '';
    if (typeof value === 'object') {
        return normalizeIdentifier(value.$oid || value._id || value.id);
    }
    return String(value);
};

const getClassIdentifiers = (classInfo = {}) =>
    [classInfo.code, classInfo._id, classInfo.id]
        .map(normalizeIdentifier)
        .filter(Boolean);

const getReportKey = (report = {}) =>
    normalizeIdentifier(report.reportId || report._id || report.recordId || report.childId);

const getReportTitle = (report = {}) =>
    String(report.assessmentTitle || report.title || '成长评估报告').trim();

const toTimestamp = (value) => {
    if (!value) return 0;
    if (typeof value === 'number') return value < 1e12 ? value * 1000 : value;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'object') {
        return toTimestamp(value.$date || value.$numberLong || value.value);
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
};

const formatReportDate = (value) => {
    const timestamp = toTimestamp(value);
    if (!timestamp) return '完成日期待补全';
    const date = new Date(timestamp);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
};

const resolveParentMembership = (memberships = []) => {
    const requestedClassIds = getClassIdentifiers(currentClass.value);
    const requestedMemberId = normalizeIdentifier(currentClass.value.memberId);
    const requestedChildId = normalizeIdentifier(currentClass.value.childId);
    const parentMemberships = memberships.filter((item) => item?.role === 'parent');
    const classMemberships = parentMemberships.filter((item) =>
        getClassIdentifiers(item.classInfo).some((identifier) => requestedClassIds.includes(identifier))
    );

    if (requestedMemberId) {
        const selected = classMemberships.find((item) => normalizeIdentifier(item._id) === requestedMemberId);
        if (selected) return selected;
    }
    if (requestedChildId) {
        const selected = classMemberships.find((item) =>
            normalizeIdentifier(item.child_id || item.childInfo?._id) === requestedChildId
        );
        if (selected) return selected;
    }
    if (classMemberships.length === 1) return classMemberships[0];
    if (classMemberships.length > 1) {
        throw new Error('该班级关联了多个孩子，请重新切换并选择具体的家长班级关系');
    }
    throw new Error('未找到当前班级的家长关系，请重新选择班级');
};

const loadParentReports = async () => {
    if (role.value !== 'parent') return;
    const requestVersion = ++parentRequestVersion;
    parentReportLoading.value = true;
    parentReportError.value = '';

    try {
        const token = uni.getStorageSync('uni_id_token');
        const membershipResponse = await uniCloud.callFunction({
            name: 'wtdb-business-member-class',
            data: { uniIdToken: token }
        });
        const membershipResult = membershipResponse?.result || {};
        if (membershipResult.code !== 200 || !Array.isArray(membershipResult.data)) {
            throw new Error(membershipResult.message || '家长班级关系加载失败');
        }

        const membership = resolveParentMembership(membershipResult.data);
        const childId = normalizeIdentifier(membership.child_id || membership.childInfo?._id);
        if (!childId) {
            throw new Error('该家长班级关系尚未关联孩子，请联系班级老师');
        }

        const context = {
            membershipId: normalizeIdentifier(membership._id),
            childId,
            childName: membership.childInfo?.name || currentClass.value.childName || '',
            childAvatar: membership.childInfo?.avatar || currentClass.value.childAvatar || '',
            childBirthdate: membership.childInfo?.birthdate || currentClass.value.childBirthdate || ''
        };
        parentContext.value = context;
        currentClass.value = {
            ...currentClass.value,
            memberRole: 'parent',
            memberId: context.membershipId,
            childId: context.childId,
            childName: context.childName,
            childAvatar: context.childAvatar,
            childBirthdate: context.childBirthdate,
            relationship: membership.relationship || currentClass.value.relationship || ''
        };
        uni.setStorageSync('currentClass', currentClass.value);

        const reportResponse = await uniCloud.callFunction({
            name: 'wt-fetch-child-report-history',
            data: {
                childId,
                uniIdToken: token
            }
        });
        const reportResult = reportResponse?.result || {};
        if (reportResult.code !== 200 || !Array.isArray(reportResult.data)) {
            const error = new Error(reportResult.msg || reportResult.message || '报告加载失败');
            error.code = reportResult.code;
            throw error;
        }

        const reports = reportResult.data.filter((report) =>
            normalizeIdentifier(report.childId || report.child_id) === childId
        );
        if (reports.length !== reportResult.data.length) {
            throw new Error('报告归属校验失败，请稍后重试');
        }
        reports.sort((a, b) =>
            toTimestamp(b.completionTime || b.createTime) - toTimestamp(a.completionTime || a.createTime)
        );
        if (requestVersion === parentRequestVersion) {
            parentReports.value = reports;
        }
    } catch (error) {
        console.error('家长报告加载失败:', error);
        if (requestVersion === parentRequestVersion) {
            parentReports.value = [];
            parentReportError.value = error?.code === 403
                ? '当前账号无权查看该孩子的报告，请重新选择班级'
                : error?.message || '暂时无法加载报告，请稍后重试';
        }
    } finally {
        if (requestVersion === parentRequestVersion) {
            parentReportLoading.value = false;
        }
    }
};

const openParentReport = (report) => {
    if (reportOpening.value) return;
    const childId = normalizeIdentifier(parentContext.value.childId);
    const reportChildId = normalizeIdentifier(report?.childId || report?.child_id);
    if (!childId || reportChildId !== childId) {
        uni.showToast({ title: '无权打开该报告', icon: 'none' });
        return;
    }

    const reportKey = getReportKey(report);
    if (!reportKey) {
        uni.showToast({ title: '报告标识不完整', icon: 'none' });
        return;
    }

    openingReportId.value = reportKey;
    reportOpening.value = true;
    uni.setStorageSync(CURRENT_STUDENT, {
        _id: childId,
        name: report.childName || parentContext.value.childName,
        avatar: report.avatar || parentContext.value.childAvatar,
        birthdate: parentContext.value.childBirthdate,
        age: report.childAge || ''
    });

    const query = [
        'isHistory=true',
        `childId=${encodeURIComponent(childId)}`
    ];
    if (report.reportId) {
        query.push(`reportId=${encodeURIComponent(normalizeIdentifier(report.reportId))}`);
    } else if (report._id) {
        query.push(`documentId=${encodeURIComponent(normalizeIdentifier(report._id))}`);
    } else if (report.recordId) {
        query.push(`recordId=${encodeURIComponent(normalizeIdentifier(report.recordId))}`);
    }

    uni.navigateTo({
        url: `/pages/assessment/report-v2?${query.join('&')}`,
        fail: () => {
            reportOpening.value = false;
            openingReportId.value = '';
            uni.showToast({ title: '报告打开失败，请稍后重试', icon: 'none' });
        }
    });
};

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
    reportOpening.value = false;
    openingReportId.value = '';
    userInfo.value = uni.getStorageSync('uni-id-pages-userInfo') || {};
    currentClass.value = uni.getStorageSync('currentClass') || {};
	if (currentClass.value.memberRole) role.value = currentClass.value.memberRole;
    if (!checkLoginStatus()) return;
	if (role.value === 'parent') loadParentReports();
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
    role.value = options.role || currentClass.value.memberRole || 'teacher';

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
    if (role.value === 'teacher') loadAssessments();
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
    parentRequestVersion++;
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

.library-section,
.parent-report-section {
    position: relative;
    z-index: 1;
    padding: 42rpx 28rpx 0;
}

.parent-report-heading {
	align-items: flex-start;
}

.count-pill--parent {
	border-color: #bde9d9;
	background: #e9fbf5;
}

.count-pill--parent .count-number {
	color: #258a68;
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

.parent-report-list {
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}

.parent-report-card {
	position: relative;
	overflow: hidden;
	box-sizing: border-box;
	padding: 25rpx 26rpx 0;
	border: 3rpx solid #3f345f;
	border-radius: 34rpx;
	box-shadow: 8rpx 9rpx 0 rgba(63, 52, 95, 0.14);
	transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.parent-report-card--0 {
	background: linear-gradient(145deg, #fff1a9 0%, #fff9dc 52%, #ffffff 100%);
}

.parent-report-card--1 {
	background: linear-gradient(145deg, #ffd3cb 0%, #fff0ed 52%, #ffffff 100%);
}

.parent-report-card--2 {
	background: linear-gradient(145deg, #ddd2ff 0%, #f3efff 52%, #ffffff 100%);
}

.parent-report-card--3 {
	background: linear-gradient(145deg, #c8f3e3 0%, #eafaf4 52%, #ffffff 100%);
}

.parent-report-card--pressed,
.parent-report-card--opening {
	transform: translateY(3rpx) scale(0.988);
	box-shadow: 4rpx 5rpx 0 rgba(63, 52, 95, 0.12);
}

.report-card-accent {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 9rpx;
	background: linear-gradient(90deg, #ffd447 0 28%, #ff786f 28% 53%, #8168ef 53% 77%, #68d9b4 77% 100%);
}

.report-card-topline,
.report-card-body,
.report-card-footer,
.report-card-meta {
	display: flex;
	align-items: center;
}

.report-card-topline {
	justify-content: space-between;
}

.report-complete-badge {
	display: flex;
	align-items: center;
	padding: 7rpx 13rpx;
	border: 2rpx solid rgba(42, 117, 88, 0.18);
	border-radius: 18rpx;
	background: rgba(255, 255, 255, 0.68);
	color: #28795d;
	font-size: 19rpx;
	font-weight: 900;
}

.report-complete-dot {
	width: 12rpx;
	height: 12rpx;
	margin-right: 8rpx;
	border-radius: 50%;
	background: #55d3a7;
	box-shadow: 0 0 0 5rpx rgba(85, 211, 167, 0.16);
}

.report-card-index {
	color: rgba(55, 45, 83, 0.42);
	font-size: 26rpx;
	font-weight: 900;
	letter-spacing: 2rpx;
}

.report-card-body {
	align-items: flex-end;
	margin-top: 24rpx;
}

.report-card-copy {
	display: flex;
	flex: 1;
	min-width: 0;
	flex-direction: column;
}

.report-card-kicker {
	color: #7657f6;
	font-size: 17rpx;
	font-weight: 900;
	letter-spacing: 2rpx;
}

.report-card-title {
	margin-top: 8rpx;
	color: #31294f;
	font-size: 34rpx;
	font-weight: 900;
	line-height: 1.32;
}

.report-card-summary {
	display: -webkit-box;
	max-width: 510rpx;
	margin-top: 12rpx;
	overflow: hidden;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	color: #756d83;
	font-size: 22rpx;
	line-height: 1.55;
}

.report-card-meta {
	flex-wrap: wrap;
	gap: 10rpx;
	margin-top: 20rpx;
}

.report-meta-chip {
	padding: 7rpx 12rpx;
	border: 1rpx solid rgba(63, 52, 95, 0.12);
	border-radius: 15rpx;
	background: rgba(255, 255, 255, 0.64);
	color: #655d75;
	font-size: 19rpx;
	font-weight: 700;
}

.report-open-action {
	display: flex;
	align-items: center;
	justify-content: center;
	flex: 0 0 auto;
	width: 74rpx;
	height: 74rpx;
	margin-left: 20rpx;
	border: 3rpx solid #3f345f;
	border-radius: 24rpx;
	background: #ffffff;
	box-shadow: 5rpx 6rpx 0 rgba(63, 52, 95, 0.14);
	color: #7657f6;
	font-size: 34rpx;
	font-weight: 900;
}

.report-opening-spinner {
	width: 28rpx;
	height: 28rpx;
	border: 5rpx solid #e6e0fa;
	border-top-color: #7657f6;
	border-radius: 50%;
	animation: report-spin 0.75s linear infinite;
}

.report-card-footer {
	justify-content: space-between;
	margin: 25rpx -26rpx 0;
	padding: 17rpx 26rpx;
	border-top: 2rpx solid rgba(63, 52, 95, 0.11);
	background: rgba(255, 255, 255, 0.52);
	color: #4d4263;
	font-size: 22rpx;
	font-weight: 850;
}

.report-footer-arrow {
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

.parent-report-section .parent-empty {
	margin: 20rpx 0 0;
}

.parent-empty--error {
	background: linear-gradient(145deg, #ffe3dc 0%, #fff3d1 52%, #eee8ff 100%);
}

.parent-empty-art--error {
	border: 3rpx solid #493b70;
	background: #ff796f;
	box-shadow: 7rpx 8rpx 0 rgba(73, 59, 112, 0.14);
	color: #ffffff;
	font-size: 70rpx;
	font-weight: 900;
}

.retry-button {
	margin-top: 26rpx;
	padding: 18rpx 30rpx;
	border: 3rpx solid #443663;
	border-radius: 23rpx;
	background: #7657f6;
	box-shadow: 6rpx 7rpx 0 #ffd447;
	color: #ffffff;
	font-size: 23rpx;
	font-weight: 900;
	line-height: 1.2;
}

.retry-button::after {
	border: 0;
}

.retry-button--pressed {
	transform: translate(3rpx, 3rpx);
	box-shadow: 2rpx 3rpx 0 #ffd447;
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

@keyframes report-spin {
	to {
		transform: rotate(360deg);
	}
}
</style>
