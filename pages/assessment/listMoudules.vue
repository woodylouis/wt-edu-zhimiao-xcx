<template>
    <view class="dashboard">
        <view class="page-orb page-orb--coral"></view>
        <view class="page-orb page-orb--purple"></view>
        <view class="page-spark page-spark--one">✦</view>
        <view class="page-spark page-spark--two">+</view>
        <u-sticky>
            <custom-nav :xcxName="currentStudent.assessmentTitle" :navCustomStyle="navCustomStyle" :needBar="false"
                :needBack="true" :backHandler="handleNavBack" />
            <view class="user-profile">
                <view class="profile-left">
                    <view class="avatar-wrap">
                        <image class="avatar-image" :src="currentStudent.avatar || defaultAvatarUrl" mode="aspectFill" />
                        <view class="avatar-seed">🌱</view>
                    </view>
                    <view class="info">
                        <view class="name-row">
                            <text class="name">{{ currentStudent.childName }}</text>
                            <text class="growing-tag">成长中</text>
                        </view>
                        <view class="student-meta">
                            <text class="meta-chip">🏫 {{ currentStudent.className || '未设置班级' }}</text>
                            <text class="meta-chip">🎂 {{ currentStudent.childAge || '未知年龄' }}</text>
                        </view>
                    </view>
                </view>
            </view>
        </u-sticky>
        
        <!-- 状态提示区域 -->
        <view class="status-banner" :class="statusBannerClass">
            <view class="status-icon-wrap">
                <view class="status-icon">{{ statusIcon }}</view>
            </view>
            <view class="status-content">
                <text class="status-kicker">今日成长任务</text>
                <text class="status-title">{{ statusTitle }}</text>
                <text class="status-desc">{{ statusDesc }}</text>
            </view>
            <view class="status-decoration">✦</view>
        </view>

        <!-- 折叠模板和列表 -->
        <view class="collapse" :class="`collapse--${index % 4}`" v-for="(section, index) in assessmentSections" :key="index">
            <view class="collapse-header" @click="toggleCollapse(section.name)">
                <view class="module-index">{{ index + 1 < 10 ? `0${index + 1}` : index + 1 }}</view>
                <view class="collapse-title-area">
                    <view class="title-row">
                        <text class="collapse-title">{{ section.section }}</text>
                        <view class="module-status" v-if="getModuleStatus(section.section_id)">
                            <text class="status-tag" :class="getModuleStatusClass(section.section_id)">
                                {{ getModuleStatusText(section.section_id) }}
                            </text>
                        </view>
                    </view>
                    <!-- 正在做的子模块显示在模块名称下方 -->
                    <view class="current-sub-row" v-if="getCurrentSubSectionName(section.section_id)">
                        <text class="current-sub-label">正在评估:</text>
                        <text class="current-sub-name">{{ getCurrentSubSectionName(section.section_id) }}</text>
                    </view>
                    <view class="prefill-progress-row" v-if="getPrefillProgress(section.section_id)">
                        <text class="prefill-progress-label">历史预填复核</text>
                        <text class="prefill-progress-value">{{ getPrefillProgress(section.section_id) }}</text>
                    </view>
                </view>
                <view class="collapse-right">
                    <text class="progress-text">{{ getModuleProgress(section.section_id) || '开始' }}</text>
                    <view class="arrow-wrap">
                        <text class="arrow" :class="{ 'arrow-up': activeCollapse === section.name }">▼</text>
                    </view>
                </view>
            </view>
            <view class="collapse-content" v-show="activeCollapse === section.name">
                <text class="section-desc">{{ section.desc }}</text>
                <view class="sub-section-list">
                    <view v-for="(ablls, idx) in section.abllsSections" :key="idx" 
                        class="sub-section-item"
                        :class="getSubSectionStatusClass(section.section_id, ablls.abllsSectionAlphabet)"
                        @click="handleOnClickSection(section.section_id, section.section, section.abllsSections.length, idx, ablls, section.abllsSections)">
                        <view class="sub-section-left">
                            <view class="sub-section-status">
                                <text v-if="isSubSectionCompleted(section.section_id, ablls.abllsSectionAlphabet)" class="check-icon">✓</text>
                                <text v-else class="pending-icon">{{ idx + 1 }}</text>
                            </view>
                            <text class="sub-section-name">{{ ablls.sectionName }}</text>
                        </view>
                        <view class="sub-section-right">
                            <text class="sub-progress" v-if="getSubSectionProgress(section.section_id, ablls.abllsSectionAlphabet)"
                                :class="{ 'completed': isSubSectionCompleted(section.section_id, ablls.abllsSectionAlphabet) }">
                                {{ getSubSectionProgress(section.section_id, ablls.abllsSectionAlphabet) }}
                            </text>
                            <text class="question-count" v-else>共{{ ablls.questionCount }}项</text>
                            <text class="arrow-right">›</text>
                        </view>
                    </view>
                </view>
            </view>
        </view>

        <view v-if="!moduleLoading && assessmentSections.length === 0" class="module-empty">
            <view class="module-empty-icon">🌱</view>
            <text class="module-empty-title">还没有可用的成长任务</text>
            <text class="module-empty-desc">请返回选择其他评估量表</text>
        </view>


        <up-overlay :show="show">
            <view class="warp">
                <modal-box v-if="show" confirmText="确定" @cancel="show = false" cancelText="先不退出"
                    @create="handleConfirm" />
            </view>
        </up-overlay>

        <DopamineLoading
            :show="moduleLoading || openingSection"
            :text="openingSection ? '正在进入成长任务' : '正在整理评估模块'"
            :subtext="openingSection ? '题目小卡片正在排队入场' : '小芽在计算已完成的成长进度'"
        />
    </view>
</template>

<script setup>
import customNav from '@/components/customNav'
import { ref, onMounted, computed } from "vue";
import { onShow, onLoad, onUnload, onReachBottom } from '@dcloudio/uni-app'
import modalBox from '../../components/modalBox-v3/modalBox.vue';
import DopamineLoading from '@/components/dopamine-loading/index.vue';
import { ASSESS_STUDENT, CURRENT_ASSESSMENT_MODULE_STATUS } from '@/lib/types/local_storage.js';

const navCustomStyle = 'background: linear-gradient(to right, #F5FDF8, #F1FCF5, #F9FCEF);height: calc(100vh / 8);'
const defaultAvatarUrl = ref("https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/profile.png");
const userInfo = ref(uni.getStorageSync('uni-id-pages-userInfo') || {});
const currentStudent = ref({});
const assessmentSections = ref([]);
const recordObj = ref({});
const activeCollapse = ref(''); // 当前展开的模块
const moduleLoading = ref(false);
const openingSection = ref(false);

// 状态信息
const isContinue = ref(false); // 是否继续评估
const isFirstTime = ref(false); // 是否第一次评估
const lastSaveTime = ref(null); // 上次保存时间
const lastCompletedTime = ref(null); // 上次完成时间
const modulesStatusMap = ref({}); // 模块状态映射
const isReviewingCompleted = ref(false); // 是否正在检查已完成的评估

const abllsSections = []

const show = ref(false);
const confirmInfo = ref([
    {
        label: "",
        name: "系统检测评估还没有完成。如果退出，当前进度会保存30天。",
    }
]);

// 计算属性：状态栏样式类
const statusBannerClass = computed(() => {
    if (prefillPendingCount.value > 0) return 'prefill-banner';
    if (isReviewingCompleted.value) return 'completed-banner';
    if (isContinue.value) return 'continue-banner';
    if (isFirstTime.value) return 'first-banner';
    return 'new-banner';
});

// 计算属性：状态图标
const statusIcon = computed(() => {
    if (prefillPendingCount.value > 0) return '↻';
    if (isReviewingCompleted.value) return '✓';
    if (isContinue.value) return '⏰';
    if (isFirstTime.value) return '🌟';
    return '✨';
});

// 计算属性：状态标题
const statusTitle = computed(() => {
    if (prefillPendingCount.value > 0) return '历史答案待复核';
    if (isReviewingCompleted.value) return '评估已完成';
    if (isContinue.value) return '继续评估';
    if (isFirstTime.value) return '第一次评估';
    return '开始新评估';
});

// 计算属性：状态描述
const statusDesc = computed(() => {
    if (prefillPendingCount.value > 0) {
        return `已参考上次评估预填${prefillTotalCount.value}项，还有${prefillPendingCount.value}项需要确认或修改`;
    }
    if (isReviewingCompleted.value) {
        return '可检查各模块和子模块的完成情况';
    }
    if (isContinue.value && lastSaveTime.value) {
        return `上次保存: ${formatTime(lastSaveTime.value)}，请继续完成评估`;
    }
    if (isFirstTime.value) {
        return `欢迎开始${currentStudent.value.childName}的第一次评估！`;
    }
    if (lastCompletedTime.value) {
        return `上次完成: ${formatTime(lastCompletedTime.value)}，这是一次新的评估`;
    }
    return '请从第一个模块开始评估';
});

const prefillTotalCount = computed(() =>
    Number(recordObj.value.prefilledQuestionCount) ||
    (recordObj.value.modulesStatus || []).reduce(
        (total, module) => total + Number(module.prefilledQuestions || 0),
        0
    )
);

const prefillPendingCount = computed(() =>
    recordObj.value.prefillMode === 'history'
        ? Number(recordObj.value.prefillPendingQuestionCount ?? recordObj.value.prefilledQuestionCount) || 0
        : 0
);

// 格式化时间
const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}月${day}日 ${hours}:${minutes}`;
};

// 切换折叠状态（手风琴效果）
const toggleCollapse = (name) => {
    activeCollapse.value = activeCollapse.value === name ? '' : name;
};

// 获取模块状态
const getModuleStatus = (sectionId) => {
    return modulesStatusMap.value[sectionId];
};

const getPrefillProgress = (sectionId) => {
    const status = modulesStatusMap.value[sectionId];
    const total = Number(status?.prefilledQuestions) || 0;
    if (!total) return '';
    const reviewed = Number(status?.reviewedPrefilledQuestions) || 0;
    return `${reviewed}/${total}项已复核`;
};

// 获取模块状态样式类
const getModuleStatusClass = (sectionId) => {
    const status = modulesStatusMap.value[sectionId];
    if (!status) return '';
    if (status.status === 1) return 'status-completed';
    // 只要有任何进度（完成的子模块 > 0 或者 hasStarted 为 true）都算进行中
    if (status.completedSubSections > 0 || status.hasStarted || status.lastSubSectionIndex > 0) return 'status-progress';
    return 'status-pending';
};

// 获取模块状态文字
const getModuleStatusText = (sectionId) => {
    const status = modulesStatusMap.value[sectionId];
    if (!status) return '';
    if (status.status === 1) return '已完成';
    // 只要有任何进度都算进行中
    if (status.completedSubSections > 0 || status.hasStarted || status.lastSubSectionIndex > 0) return '进行中';
    return '未开始';
};

// 获取模块进度文字 - 从 assessmentSections 获取正确的总数
const getModuleProgress = (sectionId) => {
    const status = modulesStatusMap.value[sectionId];
    // 从 assessmentSections 获取子模块总数
    const section = assessmentSections.value.find(s => s.section_id === sectionId);
    const total = section?.abllsSections?.length || status?.totalSubSections || 0;
    const completed = status?.completedSubSections || 0;
    if (total === 0) return '';
    return `${completed}/${total}`;
};

// 获取当前正在做的子模块名称 - 使用 lastSubSectionName 字段
const getCurrentSubSectionName = (sectionId) => {
    const status = modulesStatusMap.value[sectionId];
    if (!status || status.status === 1) return ''; // 已完成不显示
    
    // 优先使用保存的 lastSubSectionName
    if (status.lastSubSectionName) {
        return status.lastSubSectionName;
    }
    
    return '';
};

// 判断子模块是否完成 - 使用 subSectionsProgress
const isSubSectionCompleted = (sectionId, subSectionId) => {
    const status = modulesStatusMap.value[sectionId];
    if (!status || !status.subSectionsProgress) return false;
    
    const subProgress = status.subSectionsProgress.find(p => p.subSectionId === subSectionId);
    return subProgress?.isCompleted || false;
};

// 获取子模块进度文字
const getSubSectionProgress = (sectionId, subSectionId, questionCount) => {
    const status = modulesStatusMap.value[sectionId];
    if (!status || !status.subSectionsProgress) {
        // 没有进度数据，返空（使用默认的题目总数）
        return '';
    }
    
    const subProgress = status.subSectionsProgress.find(p => p.subSectionId === subSectionId);
    if (!subProgress) {
        // 该子模块还没有开始做
        return '';
    }
    
    const { completedQuestions, totalQuestions, isCompleted } = subProgress;
    if (isCompleted) return '已完成';
    // 显示进度，即使 completedQuestions 为 0 也显示
    if (totalQuestions > 0) return `${completedQuestions}/${totalQuestions}`;
    return '';
};

// 获取子模块状态样式
const getSubSectionStatusClass = (sectionId, subSectionId) => {
    const status = modulesStatusMap.value[sectionId];
    if (!status || !status.subSectionsProgress) return 'sub-pending';
    
    const subProgress = status.subSectionsProgress.find(p => p.subSectionId === subSectionId);
    if (!subProgress) return 'sub-pending';
    
    if (subProgress.isCompleted) return 'sub-completed';
    if (subProgress.completedQuestions > 0) return 'sub-progress';
    return 'sub-pending';
};

const openCollapse = (e) => {
    console.log('openCollapse', e)
}

const closeCollapse = (e) => {
    console.log('closeCollapse', e)
}

const handleCollapseChange = (value) => {
    activeCollapse.value = value;
    console.log('当前展开的面板:', value);
};

const handleOnClickSection = (sectionId, currentSection, currentAbllsSectionLength, currentAbllsSectionIdx, currentAbllsSectionObj, abllsSectionsObj) => {
    // console.log('assessmentSections', assessmentSections.value)
    currentStudent.value = {
        ...currentStudent.value,
        allAssessmentSections: { ...assessmentSections.value },
        section: {
            abllsSectionsObj, // 大类
            currentSection: {
                currentSectionId: sectionId,
                currentSection: currentSection,
            },
            currentAbllsSection: { ...currentAbllsSectionObj, currentAbllsSectionLength, currentAbllsSectionIdx },
        },
    }
    uni.setStorageSync(ASSESS_STUDENT, currentStudent.value)

    openingSection.value = true;
    uni.redirectTo({
        url: `/pages/assessment/form?currentSectionId=${sectionId}` +
            `&currentSection=${currentSection}` +
            `&currentAbllsSectionAlphabet=${currentAbllsSectionObj.abllsSectionAlphabet}` +
            `&currentAbllsSectionIdx=${currentAbllsSectionIdx}` +
            `&currentAbllsSection=${currentAbllsSectionObj.sectionName}` +
            `&age=${currentStudent.value.ageInt}`,
        fail: () => {
            uni.showToast({ title: '打开题目失败，请重试', icon: 'none' });
        },
        complete: () => {
            openingSection.value = false;
        }
    });
};


const navigateToLogin = () => {
    uni.navigateTo({
        url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd'
    });
}

const loadAssessmentSections = async (assessmentId, age, useCachedRecord = false) => {
    console.log('loadAssessmentSections:', assessmentId, age)
    try {
        const res = await uniCloud.callFunction({
            name: 'wt-fetch-assessment-section',
            data: {
                assessmentId,
                age
            }
        })
        if (res.result.code === 200) {
            // 确保数据结构正确
            assessmentSections.value = res.result.data.section || [];
            // 给每个section添加一个新的name属性，以order为name的值
            assessmentSections.value.forEach((section, index) => {
                section.name = section.section;
            });

            // console.log('assessmentSections:', assessmentSections.value)
            if (useCachedRecord) {
                const cachedRecord = uni.getStorageSync(CURRENT_ASSESSMENT_MODULE_STATUS);
                const canReviewCachedRecord =
                    cachedRecord?.recordId &&
                    cachedRecord.childId === currentStudent.value.childId &&
                    cachedRecord.assessmentId === currentStudent.value.assessmentId;
                if (canReviewCachedRecord) {
                    applyAssessmentRecordData(cachedRecord, assessmentSections.value);
                } else {
                    isReviewingCompleted.value = false;
                    await fetchAssessmentRecordData(
                        currentStudent.value.childId,
                        assessmentSections.value
                    );
                }
            } else {
                await fetchAssessmentRecordData(currentStudent.value.childId, assessmentSections.value)
            }
            return;
        }
        throw new Error(res.result.message || '模块加载失败');
    } catch (e) {
        console.error('加载失败:', e);
        throw e;
    }
}



// 在切换班级或需要刷新数据时清除缓存
const clearStudentsCache = (classId) => {
    const cacheKey = `class_${classId} _students`;
    uni.removeStorageSync(cacheKey);
};

const applyAssessmentRecordData = (temp, assessmentSections, recordState = {}) => {
    if (!temp) return;

    recordObj.value = temp;
    isContinue.value = recordState.isContinue || false;
    isFirstTime.value = recordState.isFirstTime || false;
    lastSaveTime.value = temp.lastSaveTime || null;
    lastCompletedTime.value = temp.lastCompletedTime || null;
    modulesStatusMap.value = {};
    if (temp.modulesStatus) {
        temp.modulesStatus.forEach((item) => {
            modulesStatusMap.value[item.sectionId] = item;
        });
    }

    if (temp.lastSectionId) {
        const section = assessmentSections.find(
            (item) => item.section_id === temp.lastSectionId
        );
        if (section) {
            activeCollapse.value = section.name;
        }
    } else if (assessmentSections.length > 0) {
        activeCollapse.value = assessmentSections[0].name;
    }

    uni.setStorageSync(CURRENT_ASSESSMENT_MODULE_STATUS, temp);
};


const fetchAssessmentRecordData = async (childId, assessmentSections) => {
    console.log('assessmentSections', assessmentSections)
    const data = {
        ...currentStudent.value,
        modulesStatus: assessmentSections.map((section, index) => ({
            sectionId: section.section_id,
            sectionName: section.section,
            status: 0, // 初始状态设为pending 0 未开始或进行中，1已完成
            totalSubSections: section.abllsSections?.length || 0,
            completedSubSections: 0,
            lastSubSectionIndex: 0
        }))
    }
    try {
        const res = await uniCloud.callFunction({
            name: 'wt-upload-assess-record',
            data: {
                childId,
                data,
                startMode: currentStudent.value.startMode || 'blank',
                prefillFromRecordId: currentStudent.value.prefillFromRecordId || '',
                uniIdToken: uni.getStorageSync('uni_id_token')
            }
        });
        if (res.result.code == 200) {
            const temp = res.result.result;
            console.log('查询结果:', temp);
            console.log('是否继续评估:', res.result.isContinue);
            console.log('是否第一次:', res.result.isFirstTime);

            applyAssessmentRecordData(temp, assessmentSections, {
                isContinue: res.result.isContinue,
                isFirstTime: res.result.isFirstTime,
            });
        } else {
            throw new Error(res.result.message || '评估记录加载失败');
        }
    } catch (error) {
        console.error('查询失败:', error);
        uni.showToast({ title: error.message || '评估记录加载失败', icon: 'none' });
    }
};

onShow(async () => {
    // 新增用户信息更新逻辑
    userInfo.value = uni.getStorageSync('uni-id-pages-userInfo') || {};
    checkLoginStatus();
    
    // 从 form 页面返回时，重新加载数据以获取最新的保存时间和进度
    if (!isReviewingCompleted.value && currentStudent.value.childId && assessmentSections.value.length > 0) {
        moduleLoading.value = true;
        try {
            await fetchAssessmentRecordData(currentStudent.value.childId, assessmentSections.value);
        } finally {
            moduleLoading.value = false;
        }
    }
})

onReachBottom(() => {
    console.log('onReachBottom');

})

onLoad(async (options) => {
    console.log('onLoad options:', options);
    isReviewingCompleted.value = options?.reviewCompleted === '1';
    moduleLoading.value = true;
    try {
        if (options && options.childId) {
            currentStudent.value = {
                ...options,
                ageInt: Number(options.ageInt) || 0
            };
            console.log('currentStudent:', currentStudent.value)
            uni.setStorageSync(ASSESS_STUDENT, currentStudent.value);
        } else {
            console.log('else')
            const temp = uni.getStorageSync(ASSESS_STUDENT);
            console.log('temp:', temp)
            currentStudent.value = temp;
        }

        await loadAssessmentSections(
            currentStudent.value.assessmentId,
            Number(currentStudent.value.ageInt),
            isReviewingCompleted.value
        );
    } catch (error) {
        uni.showToast({ title: "模块加载失败，请重试", icon: "none" });
    } finally {
        moduleLoading.value = false;
    }

    userInfo.value = uni.getStorageSync('uni-id-pages-userInfo') || {};
});



onUnload(() => {
    uni.$off('reachBottom', onReachBottom)
    // uni.removeStorageSync(ASSESS_STUDENT)
})

const handleNavBack = () => {
    uni.switchTab({ url: '/pages/dashboard/teacher/teacher' })
    uni.removeStorageSync(ASSESS_STUDENT)
    uni.removeStorageSync(CURRENT_ASSESSMENT_MODULE_STATUS)
}

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

onMounted(() => {
    userInfo.value = uni.getStorageSync('uni-id-pages-userInfo') || {};
});



</script>

<style lang="scss" scoped>
.dashboard {
    .warp {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
    }
    
    // 状态提示横幅
    .status-banner {
        display: flex;
        align-items: center;
        margin: 20rpx 40rpx;
        padding: 24rpx 32rpx;
        border-radius: 16rpx;
        
        &.continue-banner {
            background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
            border: 2rpx solid #FFB74D;
        }

        &.completed-banner {
            background: linear-gradient(135deg, #E8F5E9 0%, #D7F2DF 100%);
            border: 2rpx solid #66BB6A;
        }
        
        &.first-banner {
            background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
            border: 2rpx solid #81C784;
        }
        
        &.new-banner {
            background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
            border: 2rpx solid #64B5F6;
        }
        
        .status-icon {
            font-size: 48rpx;
            margin-right: 20rpx;
        }
        
        .status-content {
            flex: 1;
            
            .status-title {
                display: block;
                font-size: 30rpx;
                font-weight: 600;
                color: #333;
                margin-bottom: 4rpx;
            }
            
            .status-desc {
                display: block;
                font-size: 24rpx;
                color: #666;
            }
        }
    }

    .collapse {
        border-radius: 16rpx;
        border: 1px solid #E9E9E9;
        background: #FFF;
        box-shadow: 0px 4rpx 12rpx rgba(0, 0, 0, 0.08);
        margin: 20rpx 40rpx;
        overflow: hidden;
        
        .collapse-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 28rpx 32rpx;
            background: #FAFAFA;
            
            .collapse-title-area {
                display: flex;
                flex-direction: column;
                gap: 8rpx;
                flex: 1;
                
                .title-row {
                    display: flex;
                    align-items: center;
                    gap: 16rpx;
                }
                
                .collapse-title {
                    font-size: 30rpx;
                    font-weight: 600;
                    color: #333;
                }
                
                .module-status {
                    .status-tag {
                        font-size: 22rpx;
                        padding: 4rpx 16rpx;
                        border-radius: 20rpx;
                        
                        &.status-completed {
                            background: #E8F5E9;
                            color: #4CAF50;
                        }
                        
                        &.status-progress {
                            background: #FFF3E0;
                            color: #FF9800;
                        }
                        
                        &.status-pending {
                            background: #ECEFF1;
                            color: #90A4AE;
                        }
                    }
                }
                
                .current-sub-row {
                    display: flex;
                    align-items: center;
                    gap: 8rpx;
                    
                    .current-sub-label {
                        font-size: 22rpx;
                        color: #999;
                    }
                    
                    .current-sub-name {
                        font-size: 22rpx;
                        color: #FF9800;
                        background: #FFF8E1;
                        padding: 2rpx 12rpx;
                        border-radius: 12rpx;
                        max-width: 260rpx;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                }
            }
            
            .collapse-right {
                display: flex;
                align-items: center;
                gap: 12rpx;
                
                .progress-text {
                    font-size: 24rpx;
                    color: #666;
                    font-weight: 500;
                }
                
                .arrow {
                    font-size: 20rpx;
                    color: #999;
                    transition: transform 0.3s;
                    
                    &.arrow-up {
                        transform: rotate(180deg);
                    }
                }
            }
        }
        
        .collapse-content {
            padding: 0 32rpx 24rpx;
            
            .section-desc {
                display: block;
                font-size: 24rpx;
                color: #888;
                padding: 16rpx 0;
                line-height: 1.5;
            }
            
            .sub-section-list {
                .sub-section-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 24rpx 20rpx;
                    margin-top: 16rpx;
                    background: #F8F9FA;
                    border-radius: 12rpx;
                    transition: all 0.2s;
                    
                    &:active {
                        background: #ECEFF1;
                    }
                    
                    // 已完成状态
                    &.sub-completed {
                        background: #F1F8E9;
                        
                        .sub-section-name {
                            color: #689F38;
                        }
                        
                        .pending-icon {
                            background: #4CAF50 !important;
                            color: #fff !important;
                        }
                    }
                    
                    // 进行中状态
                    &.sub-progress {
                        background: #FFF8E1;
                        border: 1px solid #FFE082;
                        
                        .sub-section-name {
                            color: #F57C00;
                        }
                        
                        .pending-icon {
                            background: #FF9800 !important;
                            color: #fff !important;
                        }
                    }
                    
                    // 未开始状态
                    &.sub-pending {
                        background: #F8F9FA;
                    }
                    
                    .sub-section-left {
                        display: flex;
                        align-items: center;
                        gap: 16rpx;
                        
                        .sub-section-status {
                            width: 48rpx;
                            height: 48rpx;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            
                            .check-icon {
                                background: #4CAF50;
                                color: #fff;
                                width: 48rpx;
                                height: 48rpx;
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 28rpx;
                            }
                            
                            .pending-icon {
                                background: #E0E0E0;
                                color: #666;
                                width: 48rpx;
                                height: 48rpx;
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 24rpx;
                            }
                        }
                        
                        .sub-section-name {
                            font-size: 28rpx;
                            color: #333;
                        }
                    }
                    
                    .sub-section-right {
                        display: flex;
                        align-items: center;
                        gap: 8rpx;
                        
                        .sub-progress {
                            font-size: 24rpx;
                            color: #FF9800;
                            font-weight: 500;
                            
                            &.completed {
                                color: #4CAF50;
                            }
                        }
                        
                        .question-count {
                            font-size: 24rpx;
                            color: #999;
                        }
                        
                        .arrow-right {
                            font-size: 32rpx;
                            color: #CCC;
                        }
                    }
                }
            }
        }
    }

    .user-profile {
        height: calc(100vh / 8);
        background:
            linear-gradient(to right, #F5FDF8, #F1FCF5, #F9FCEF);
        display: flex;
        justify-content: space-between;
        padding: 0 40rpx;
        box-shadow: inset 0 -20rpx 30rpx rgba(255, 255, 255, 0.8);

        .profile-left {
            display: flex;
            gap: 24rpx;
            height: 60%;
            align-items: center;
        }

        .avatar-image {
            width: 120rpx;
            height: 120rpx;
        }

        .switch-class {
            display: flex;
            height: 60%;
            align-items: center;

            .switch-class-image {
                width: 90rpx;
                height: 90rpx;
            }
        }


        .info {
            display: flex;
            flex-direction: column;
            gap: 8rpx;

            .name {
                color: #00214D;
                font-family: "PingFang SC";
                font-size: 18px;
                font-style: normal;
                font-weight: 600;
                line-height: 24px;
            }

            .class {
                display: flex;
                gap: 8rpx;
                color: #3D464A;
                font-family: "PingFang SC";
                font-size: 14px;
                font-style: normal;
                font-weight: 400;
                line-height: 20px;
                align-items: center;

                .invite {
                    background: #DBE9FF;
                    color: #2A64E9;
                    padding: 4px 4px;
                    border-radius: 4px;
                    font-family: "PingFang SC";
                    font-size: 14px;
                    font-style: normal;
                    line-height: 20px;
                    margin-left: 8px;
                }
            }
        }
    }

    .student-list {
        // margin-top: 40rpx;
        padding: 5rpx 40rpx;
    }

    .assessment-option {
        margin: 0 40rpx 0 40rpx;
        border-radius: 12px;

        .option {
            border: 1px solid #100D40;
            width: calc(100vw - 80rpx);
            height: 118px;
            flex-shrink: 0;
            border-radius: 12px;
            background: #FFF;
            box-shadow: 0px 0px 1px 0px rgba(193, 197, 210, 0.20);
            margin-bottom: 32rpx;
            display: flex;
            align-items: center;
            justify-content: space-between;

            .title {
                color: #100D40;
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
    color: #6F7374;
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
    color: #6F7374;
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

.u-page {
    padding: 0;

    &__item {

        &__title {
            color: $u-tips-color;
            background-color: $u-bg-color;
            padding: 15px;
            font-size: 15px;

            &__slot-title {
                color: $u-primary;
                font-size: 14px;
            }
        }
    }
}

.u-collapse-content {
    color: $u-tips-color;
    font-size: 14px;
}
</style>

<style lang="scss" scoped>
.dashboard {
    position: relative;
    min-height: 100vh;
    box-sizing: border-box;
    overflow: hidden;
    padding-bottom: 72rpx;
    background:
        radial-gradient(circle at 8% 22%, rgba(255, 209, 74, 0.22), transparent 25%),
        radial-gradient(circle at 92% 42%, rgba(145, 104, 251, 0.16), transparent 27%),
        linear-gradient(180deg, #fff4bf 0%, #fff9e8 21%, #f8f5ff 58%, #effbf7 100%);
}

.page-orb,
.page-spark {
    position: fixed;
    z-index: 0;
    pointer-events: none;
}

.page-orb {
    border-radius: 50%;
    filter: blur(2rpx);
}

.page-orb--coral {
    width: 180rpx;
    height: 180rpx;
    top: 31vh;
    right: -90rpx;
    background: rgba(255, 126, 145, 0.2);
}

.page-orb--purple {
    width: 150rpx;
    height: 150rpx;
    bottom: 9vh;
    left: -76rpx;
    background: rgba(139, 104, 239, 0.15);
}

.page-spark {
    color: #ff8b7b;
    font-weight: 900;
}

.page-spark--one {
    top: 35vh;
    left: 18rpx;
    font-size: 34rpx;
    transform: rotate(-15deg);
}

.page-spark--two {
    right: 26rpx;
    bottom: 18vh;
    color: #7b63e8;
    font-size: 42rpx;
    transform: rotate(18deg);
}

.dashboard :deep(.u-sticky) {
    position: relative;
    z-index: 5;
}

.dashboard .user-profile {
    position: relative;
    height: auto;
    min-height: 148rpx;
    box-sizing: border-box;
    padding: 20rpx 30rpx 28rpx;
    overflow: hidden;
    background: linear-gradient(135deg, #ffd975 0%, #ffb8ad 52%, #c9b8ff 100%);
    box-shadow: 0 10rpx 22rpx rgba(91, 68, 127, 0.13);
}

.dashboard .user-profile::before,
.dashboard .user-profile::after {
    content: '';
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.35);
}

.dashboard .user-profile::before {
    width: 130rpx;
    height: 130rpx;
    top: -62rpx;
    right: 82rpx;
}

.dashboard .user-profile::after {
    width: 66rpx;
    height: 66rpx;
    right: 26rpx;
    bottom: -25rpx;
}

.dashboard .user-profile .profile-left {
    position: relative;
    z-index: 2;
    width: 100%;
    height: auto;
    gap: 22rpx;
}

.avatar-wrap {
    position: relative;
    flex: 0 0 auto;
}

.dashboard .user-profile .avatar-image {
    display: block;
    width: 104rpx;
    height: 104rpx;
    box-sizing: border-box;
    border: 5rpx solid #ffffff;
    border-radius: 34rpx;
    background: #ffffff;
    box-shadow: 6rpx 7rpx 0 rgba(78, 60, 112, 0.2);
}

.avatar-seed {
    position: absolute;
    right: -10rpx;
    bottom: -8rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38rpx;
    height: 38rpx;
    box-sizing: border-box;
    border: 3rpx solid #4a3b6a;
    border-radius: 50%;
    background: #fff4a8;
    font-size: 21rpx;
}

.dashboard .user-profile .info {
    width: 100%;
    min-width: 0;
    gap: 10rpx;
}

.name-row,
.student-meta {
    display: flex;
    align-items: center;
}

.name-row {
    gap: 12rpx;
}

.dashboard .user-profile .info .name {
    color: #352b52;
    font-size: 34rpx;
    font-weight: 900;
    line-height: 1.2;
}

.growing-tag {
    padding: 5rpx 12rpx;
    border: 2rpx solid #47375f;
    border-radius: 16rpx;
    color: #47375f;
    background: #8ce2c4;
    font-size: 20rpx;
    font-weight: 800;
    line-height: 1.2;
}

.student-meta {
    max-width: 100%;
    gap: 10rpx;
    overflow: hidden;
}

.meta-chip {
    max-width: 47%;
    box-sizing: border-box;
    padding: 7rpx 13rpx;
    overflow: hidden;
    border: 2rpx solid rgba(71, 55, 95, 0.28);
    border-radius: 18rpx;
    color: #574969;
    background: rgba(255, 255, 255, 0.74);
    font-size: 21rpx;
    font-weight: 700;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.dashboard .status-banner {
    position: relative;
    z-index: 1;
    margin: 26rpx 28rpx 22rpx;
    padding: 24rpx 26rpx;
    overflow: hidden;
    border: 3rpx solid #44365f;
    border-radius: 30rpx;
    box-shadow: 7rpx 8rpx 0 rgba(68, 54, 95, 0.16);
}

.dashboard .status-banner.continue-banner {
    border-color: #44365f;
    background: linear-gradient(135deg, #fff0a9 0%, #ffd479 100%);
}

.dashboard .status-banner.completed-banner {
    border-color: #44365f;
    background: linear-gradient(135deg, #a8efd7 0%, #70d6ba 100%);
}

.dashboard .status-banner.first-banner {
    border-color: #44365f;
    background: linear-gradient(135deg, #ffb5b0 0%, #ff8ea4 100%);
}

.dashboard .status-banner.new-banner {
    border-color: #44365f;
    background: linear-gradient(135deg, #c9bbff 0%, #a58cf5 100%);
}

.dashboard .status-banner.prefill-banner {
    border-color: #6d55be;
    background: linear-gradient(135deg, #f1ecff 0%, #fff6c9 100%);
    box-shadow: 7rpx 7rpx 0 #cdbfff;
}

.status-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 72rpx;
    height: 72rpx;
    flex: 0 0 auto;
    margin-right: 20rpx;
    border: 3rpx solid #44365f;
    border-radius: 24rpx;
    background: #ffffff;
    box-shadow: 4rpx 4rpx 0 rgba(68, 54, 95, 0.2);
}

.dashboard .status-banner .status-icon {
    margin: 0;
    font-size: 38rpx;
}

.dashboard .status-banner .status-content {
    position: relative;
    z-index: 1;
}

.status-kicker {
    display: block;
    margin-bottom: 2rpx;
    color: rgba(53, 43, 82, 0.68);
    font-size: 19rpx;
    font-weight: 800;
    letter-spacing: 2rpx;
}

.dashboard .status-banner .status-content .status-title {
    color: #352b52;
    font-size: 30rpx;
    font-weight: 900;
}

.dashboard .status-banner .status-content .status-desc {
    margin-top: 5rpx;
    color: #5a4d69;
    font-size: 22rpx;
    font-weight: 650;
    line-height: 1.45;
}

.status-decoration {
    position: absolute;
    right: -5rpx;
    top: -18rpx;
    color: rgba(255, 255, 255, 0.6);
    font-size: 82rpx;
    font-weight: 900;
    transform: rotate(15deg);
}

.dashboard .collapse {
    position: relative;
    z-index: 1;
    margin: 22rpx 28rpx;
    overflow: hidden;
    border: 3rpx solid #44365f;
    border-radius: 30rpx;
    background: #fffef9;
    box-shadow: 7rpx 8rpx 0 rgba(68, 54, 95, 0.13);
}

.dashboard .collapse .collapse-header {
    min-height: 104rpx;
    box-sizing: border-box;
    gap: 18rpx;
    padding: 22rpx 22rpx;
    background: linear-gradient(135deg, #fffdf8, #fff7d8);
}

.dashboard .collapse--1 .collapse-header {
    background: linear-gradient(135deg, #fffdf8, #ffe4e1);
}

.dashboard .collapse--2 .collapse-header {
    background: linear-gradient(135deg, #fffdf8, #eae4ff);
}

.dashboard .collapse--3 .collapse-header {
    background: linear-gradient(135deg, #fffdf8, #dcf7ee);
}

.module-index {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 58rpx;
    height: 58rpx;
    flex: 0 0 auto;
    border: 3rpx solid #44365f;
    border-radius: 19rpx;
    color: #44365f;
    background: #ffd447;
    box-shadow: 3rpx 4rpx 0 #ff8f82;
    font-size: 23rpx;
    font-weight: 900;
}

.dashboard .collapse--1 .module-index {
    color: #ffffff;
    background: #ff7e91;
    box-shadow: 3rpx 4rpx 0 #ffd447;
}

.dashboard .collapse--2 .module-index {
    color: #ffffff;
    background: #8e71eb;
    box-shadow: 3rpx 4rpx 0 #ffb2aa;
}

.dashboard .collapse--3 .module-index {
    background: #78d9bd;
    box-shadow: 3rpx 4rpx 0 #ffd447;
}

.dashboard .collapse .collapse-header .collapse-title-area {
    min-width: 0;
}

.dashboard .collapse .collapse-header .collapse-title-area .collapse-title {
    color: #352b52;
    font-size: 28rpx;
    font-weight: 900;
}

.dashboard .collapse .collapse-header .collapse-title-area .module-status .status-tag {
    padding: 5rpx 13rpx;
    border: 2rpx solid currentColor;
    border-radius: 15rpx;
    font-size: 19rpx;
    font-weight: 800;
}

.dashboard .collapse .collapse-header .collapse-title-area .module-status .status-tag.status-completed {
    color: #258a69;
    background: #d8f7eb;
}

.dashboard .collapse .collapse-header .collapse-title-area .module-status .status-tag.status-progress {
    color: #b96a19;
    background: #fff0b1;
}

.dashboard .collapse .collapse-header .collapse-title-area .module-status .status-tag.status-pending {
    color: #736683;
    background: #eee9f2;
}

.dashboard .collapse .collapse-header .collapse-title-area .current-sub-row .current-sub-label {
    color: #8a7d94;
    font-size: 20rpx;
    font-weight: 650;
}

.dashboard .collapse .collapse-header .collapse-title-area .current-sub-row .current-sub-name {
    color: #80531c;
    background: #fff0b1;
    font-size: 20rpx;
    font-weight: 800;
}

.dashboard .collapse .collapse-header .collapse-title-area .prefill-progress-row {
    display: flex;
    align-items: center;
    gap: 8rpx;
    margin-top: 7rpx;
}

.dashboard .collapse .collapse-header .collapse-title-area .prefill-progress-label,
.dashboard .collapse .collapse-header .collapse-title-area .prefill-progress-value {
    padding: 4rpx 8rpx;
    border-radius: 10rpx;
    color: #625099;
    background: #eee8ff;
    font-size: 18rpx;
    font-weight: 800;
}

.dashboard .collapse .collapse-header .collapse-title-area .prefill-progress-value {
    color: #7a5c1d;
    background: #fff2bd;
}

.dashboard .collapse .collapse-header .collapse-right {
    gap: 9rpx;
}

.dashboard .collapse .collapse-header .collapse-right .progress-text {
    padding: 6rpx 10rpx;
    border-radius: 13rpx;
    color: #685978;
    background: rgba(255, 255, 255, 0.78);
    font-size: 20rpx;
    font-weight: 800;
}

.arrow-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40rpx;
    height: 40rpx;
    border: 2rpx solid #44365f;
    border-radius: 50%;
    background: #ffffff;
}

.dashboard .collapse .collapse-header .collapse-right .arrow {
    color: #44365f;
    font-size: 16rpx;
    font-weight: 900;
}

.dashboard .collapse .collapse-content {
    padding: 0 20rpx 24rpx;
    border-top: 3rpx dashed rgba(68, 54, 95, 0.22);
    background: #fffef9;
}

.dashboard .collapse .collapse-content .section-desc {
    padding: 20rpx 8rpx 8rpx;
    color: #7c7087;
    font-size: 22rpx;
    font-weight: 600;
    line-height: 1.55;
}

.dashboard .collapse .collapse-content .sub-section-list .sub-section-item {
    min-height: 86rpx;
    box-sizing: border-box;
    margin-top: 14rpx;
    padding: 18rpx 16rpx;
    border: 2rpx solid #ded5e6;
    border-radius: 22rpx;
    background: #faf8fc;
    box-shadow: 0 4rpx 0 rgba(68, 54, 95, 0.08);
}

.dashboard .collapse .collapse-content .sub-section-list .sub-section-item:active {
    transform: scale(0.985);
    background: #f1ecf6;
}

.dashboard .collapse .collapse-content .sub-section-list .sub-section-item.sub-completed {
    border-color: #70cfb0;
    background: #e6faf3;
}

.dashboard .collapse .collapse-content .sub-section-list .sub-section-item.sub-progress {
    border-color: #f2bd4e;
    background: #fff6cf;
}

.dashboard .collapse .collapse-content .sub-section-list .sub-section-item .sub-section-left {
    min-width: 0;
    gap: 14rpx;
}

.dashboard .collapse .collapse-content .sub-section-list .sub-section-item .sub-section-left .sub-section-status,
.dashboard .collapse .collapse-content .sub-section-list .sub-section-item .sub-section-left .sub-section-status .check-icon,
.dashboard .collapse .collapse-content .sub-section-list .sub-section-item .sub-section-left .sub-section-status .pending-icon {
    width: 46rpx;
    height: 46rpx;
}

.dashboard .collapse .collapse-content .sub-section-list .sub-section-item .sub-section-left .sub-section-status .check-icon {
    box-sizing: border-box;
    border: 2rpx solid #44365f;
    color: #ffffff;
    background: #49bd96;
    font-weight: 900;
}

.dashboard .collapse .collapse-content .sub-section-list .sub-section-item .sub-section-left .sub-section-status .pending-icon {
    box-sizing: border-box;
    border: 2rpx solid #44365f;
    color: #44365f;
    background: #ffffff;
    font-size: 21rpx;
    font-weight: 900;
}

.dashboard .collapse .collapse-content .sub-section-list .sub-section-item .sub-section-left .sub-section-name {
    max-width: 350rpx;
    overflow: hidden;
    color: #4a3e5b;
    font-size: 25rpx;
    font-weight: 750;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.dashboard .collapse .collapse-content .sub-section-list .sub-section-item.sub-completed .sub-section-name {
    color: #26795f;
}

.dashboard .collapse .collapse-content .sub-section-list .sub-section-item.sub-progress .sub-section-name {
    color: #946020;
}

.dashboard .collapse .collapse-content .sub-section-list .sub-section-item .sub-section-right {
    flex: 0 0 auto;
}

.dashboard .collapse .collapse-content .sub-section-list .sub-section-item .sub-section-right .sub-progress {
    color: #a46a1d;
    font-size: 21rpx;
    font-weight: 800;
}

.dashboard .collapse .collapse-content .sub-section-list .sub-section-item .sub-section-right .sub-progress.completed {
    color: #268163;
}

.dashboard .collapse .collapse-content .sub-section-list .sub-section-item .sub-section-right .question-count {
    color: #8c8095;
    font-size: 20rpx;
    font-weight: 650;
}

.dashboard .collapse .collapse-content .sub-section-list .sub-section-item .sub-section-right .arrow-right {
    color: #7c63e8;
    font-size: 36rpx;
    font-weight: 900;
}

.module-empty {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    flex-direction: column;
    margin: 80rpx 40rpx;
    padding: 48rpx 30rpx;
    border: 3rpx dashed #77668a;
    border-radius: 30rpx;
    background: rgba(255, 255, 255, 0.76);
}

.module-empty-icon {
    margin-bottom: 16rpx;
    font-size: 76rpx;
}

.module-empty-title {
    color: #44365f;
    font-size: 28rpx;
    font-weight: 900;
}

.module-empty-desc {
    margin-top: 9rpx;
    color: #82758d;
    font-size: 22rpx;
}
</style>
