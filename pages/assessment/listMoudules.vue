<template>
    <view class="dashboard">
        <u-sticky>
            <custom-nav :xcxName="currentStudent.assessmentTitle" :navCustomStyle="navCustomStyle" :needBar="false"
                :needBack="true" :backHandler="handleNavBack" />
            <view class="user-profile">
                <!-- 左侧内容容器 -->

                <view class="profile-left">
                    <image class="avatar-image" :src="currentStudent.avatar" />
                    <view class="info" style="width: 100%;">
                        <view class="name">{{ currentStudent.childName }}</view>
                        <view class="class">班级：{{ currentStudent.className }}

                            <view class="class">年龄：{{ currentStudent.childAge }}

                            </view>
                        </view>

                    </view>
                </view>
            </view>
        </u-sticky>
        
        <!-- 状态提示区域 -->
        <view class="status-banner" :class="statusBannerClass">
            <view class="status-icon">{{ statusIcon }}</view>
            <view class="status-content">
                <text class="status-title">{{ statusTitle }}</text>
                <text class="status-desc">{{ statusDesc }}</text>
            </view>
        </view>

        <!-- 折叠模板和列表 -->
        <view class="collapse" v-for="(section, index) in assessmentSections" :key="index">
            <view class="collapse-header" @click="toggleCollapse(section.name)">
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
                </view>
                <view class="collapse-right">
                    <text class="progress-text">{{ getModuleProgress(section.section_id) }}</text>
                    <text class="arrow" :class="{ 'arrow-up': activeCollapse === section.name }">▼</text>
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


        <up-overlay :show="show">
            <view class="warp">
                <modal-box v-if="show" confirmText="确定" @cancel="show = false" cancelText="先不退出"
                    @create="handleConfirm" />
            </view>
        </up-overlay>
    </view>
</template>

<script setup>
import customNav from '@/components/customNav'
import { ref, onMounted, computed } from "vue";
import { onShow, onLoad, onUnload, onReachBottom } from '@dcloudio/uni-app'
import modalBox from '../../components/modalBox-v3/modalBox.vue';
import { ASSESS_STUDENT, CURRENT_ASSESSMENT_MODULE_STATUS } from '@/lib/types/local_storage.js';

const navCustomStyle = 'background: linear-gradient(to right, #F5FDF8, #F1FCF5, #F9FCEF);height: calc(100vh / 8);'
const defaultAvatarUrl = ref("https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/profile.png");
const userInfo = ref(uni.getStorageSync('uni-id-pages-userInfo') || {});
const currentStudent = ref({});
const assessmentSections = ref([]);
const recordObj = ref({});
const activeCollapse = ref(''); // 当前展开的模块

// 状态信息
const isContinue = ref(false); // 是否继续评估
const isFirstTime = ref(false); // 是否第一次评估
const lastSaveTime = ref(null); // 上次保存时间
const lastCompletedTime = ref(null); // 上次完成时间
const modulesStatusMap = ref({}); // 模块状态映射

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
    if (isContinue.value) return 'continue-banner';
    if (isFirstTime.value) return 'first-banner';
    return 'new-banner';
});

// 计算属性：状态图标
const statusIcon = computed(() => {
    if (isContinue.value) return '⏰';
    if (isFirstTime.value) return '🌟';
    return '✨';
});

// 计算属性：状态标题
const statusTitle = computed(() => {
    if (isContinue.value) return '继续评估';
    if (isFirstTime.value) return '第一次评估';
    return '开始新评估';
});

// 计算属性：状态描述
const statusDesc = computed(() => {
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
const getSubSectionProgress = (sectionId, subSectionId) => {
    const status = modulesStatusMap.value[sectionId];
    if (!status || !status.subSectionsProgress) return '';
    
    const subProgress = status.subSectionsProgress.find(p => p.subSectionId === subSectionId);
    if (!subProgress) return '';
    
    const { completedQuestions, totalQuestions, isCompleted } = subProgress;
    if (isCompleted) return '已完成';
    if (completedQuestions > 0) return `${completedQuestions}/${totalQuestions}`;
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

    uni.redirectTo({
        url: `/pages/assessment/form?currentSectionId=${sectionId}` +
            `&currentSection=${currentSection}` +
            `&currentAbllsSectionAlphabet=${currentAbllsSectionObj.abllsSectionAlphabet}` +
            `&currentAbllsSectionIdx=${currentAbllsSectionIdx}` +
            `&currentAbllsSection=${currentAbllsSectionObj.sectionName}` +
            `&age=${currentStudent.value.ageInt}`
    });
};


const navigateToLogin = () => {
    uni.navigateTo({
        url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd'
    });
}

const loadAssessmentSections = async (assessmentId, age) => {
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
            fetchAssessmentRecordData(currentStudent.value.childId, assessmentSections.value)
        }

    } catch (e) {
        console.error('加载失败:', e);
    }
}



// 在切换班级或需要刷新数据时清除缓存
const clearStudentsCache = (classId) => {
    const cacheKey = `class_${classId} _students`;
    uni.removeStorageSync(cacheKey);
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
            data: { childId, data }
        });
        if (res.result.code == 200) {
            const temp = res.result.result;
            console.log('查询结果:', temp);
            console.log('是否继续评估:', res.result.isContinue);
            console.log('是否第一次:', res.result.isFirstTime);
            
            // 设置状态信息
            isContinue.value = res.result.isContinue || false;
            isFirstTime.value = res.result.isFirstTime || false;
            lastSaveTime.value = temp.lastSaveTime || null;
            lastCompletedTime.value = temp.lastCompletedTime || null;
            
            // 构建模块状态映射
            if (temp.modulesStatus) {
                temp.modulesStatus.forEach(m => {
                    modulesStatusMap.value[m.sectionId] = m;
                });
            }
            
            // 设置默认展开的模块（上次做到的模块）
            if (temp.lastSectionId) {
                const section = assessmentSections.find(s => s.section_id === temp.lastSectionId);
                if (section) {
                    activeCollapse.value = section.name;
                }
            } else if (assessmentSections.length > 0) {
                // 没有上次记录，默认展开第一个
                activeCollapse.value = assessmentSections[0].name;
            }
            
            // 保存到本地存储
            uni.setStorageSync(CURRENT_ASSESSMENT_MODULE_STATUS, temp);
        }
    } catch (error) {
        console.error('查询失败:', error);
    }
};

onShow(() => {
    // 新增用户信息更新逻辑
    userInfo.value = uni.getStorageSync('uni-id-pages-userInfo') || {};
    checkLoginStatus();
    
    // 从 form 页面返回时，重新加载数据以获取最新的保存时间和进度
    if (currentStudent.value.childId && assessmentSections.value.length > 0) {
        fetchAssessmentRecordData(currentStudent.value.childId, assessmentSections.value);
    }
})

onReachBottom(() => {
    console.log('onReachBottom');

})

onLoad((options) => {
    console.log('onLoad options:', options);
    if (options && options.childId) {
        currentStudent.value = {
            ...options,
            ageInt: Number(options.ageInt) || 0
        };
        console.log('currentStudent:', currentStudent.value)
        uni.setStorageSync(ASSESS_STUDENT, currentStudent.value);
        loadAssessmentSections(options.assessmentId, Number(options.ageInt));
    } else {
        console.log('else')
        const temp = uni.getStorageSync(ASSESS_STUDENT);
        console.log('temp:', temp)
        loadAssessmentSections(temp.assessmentId, Number(temp.ageInt));
        currentStudent.value = temp;
    }

    userInfo.value = uni.getStorageSync('uni-id-pages-userInfo') || {};
});



onUnload(() => {
    uni.$off('reachBottom', onReachBottom)
    // uni.removeStorageSync(ASSESS_STUDENT)
})

const handleNavBack = () => {
    uni.redirectTo({ url: '/pages/teacher/teacher' })
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