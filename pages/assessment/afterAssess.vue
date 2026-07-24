<template>
    <view class="assessment">
        <custom-nav :xcxName="assessmentTitle" :navCustomStyle="navCustomStyle" :needBar="false" :needBack="true"
            :backHandler="handleNavBack" />
        <view class="content">
            <view class="user-profile">
                <!-- 左侧内容容器 -->
                <view class="profile-left">
                    <image class="avatar-image" :src="avatarUrl" />
                    <view class="info">
                        <view class="name">{{ displayName }}</view>
                        <view class="class">
                            <view style="display: flex;">
                                <view style="margin-right: 40rpx"><span style="font-weight: bold;">班级：</span>{{
                                    classDisplay
                                }}</view>
                                <view><span style="font-weight: bold;">年龄：</span>{{ childAge }}</view>
                            </view>
                        </view>
                    </view>
                </view>

            </view>
            <view class="loading-container">
                <view class="main-content-card">
                    <view class="date-header">
                        开始评估日期：{{ assessmentCreateTime }} <br>
                        提交日期：{{ currentDate }}
                    </view>
                    <view class="progress-visual"
                        :class="{ completed: taskStatus === 'completed', failed: taskStatus === 'failed' }">
                        <view class="progress-orbit"></view>
                        <view class="progress-center">
                            <view class="progress-number-row">
                                <text class="progress-number">{{ progress }}</text>
                                <text class="progress-unit">%</text>
                            </view>
                            <text class="progress-caption">报告进度</text>
                        </view>
                    </view>
                    <text class="loading-message">
                        {{ statusTitle }}
                    </text>
                    <text class="status-detail">{{ statusDesc }}</text>
                    <view class="section-progress" v-if="totalSections > 0">
                        <text>模块分析进度</text>
                        <text class="section-progress-count">{{ completedSections }}/{{ totalSections }}</text>
                    </view>
                    <view class="progress-stages">
                        <view v-for="(stage, index) in progressStages" :key="stage.title" class="progress-stage"
                            :class="getStageClass(index)">
                            <view class="stage-rail">
                                <view class="stage-marker">
                                    <text v-if="getStageClass(index) === 'completed'">✓</text>
                                    <text v-else>{{ index + 1 }}</text>
                                </view>
                                <view v-if="index < progressStages.length - 1" class="stage-line"></view>
                            </view>
                            <view class="stage-content">
                                <text class="stage-title">{{ stage.title }}</text>
                                <text class="stage-desc">{{ stage.desc }}</text>
                            </view>
                            <text class="stage-state">{{ getStageStateText(index) }}</text>
                        </view>
                    </view>
                </view>
                <view class="info-section">
                    <img src="https://cdn.builder.io/api/v1/image/assets/022245c9a8b14954aad66a5dc04d83ff/68df53f5126efcc3fca0e29fc71124347e4648e1?placeholderIfAbsent=true"
                        class="info-icon" mode="aspectFit" />
                    <text class="info-text">
                        您也可以先看看其它页面，稍后再回来查看报告
                    </text>
                </view>
                <view class="backToHome" v-if="canViewReport" @click="viewReport">
                    <u-button :custom-style="{
                        ...primaryButtonStyle
                    }">
                        查看报告
                    </u-button>
                </view>
                <view class="backToHome" @click="backToHome">
                    <u-button :custom-style="{
                        ...buttonStyle
                    }">
                        返回首页
                    </u-button>
                </view>
            </view>
        </view>
    </view>
</template>

<script setup>

import { onLoad, onShow, onHide } from '@dcloudio/uni-app'
import { ref, onUnmounted, computed } from "vue";
import customNav from '@/components/customNav';
import { ASSESS_STUDENT, CURRENT_ASSESSMENT_MODULE_STATUS } from '@/lib/types/local_storage.js';

const assessStudent = uni.getStorageSync(ASSESS_STUDENT) || {};
let displayName = assessStudent.childName || '';
let classDisplay = assessStudent.className || '';
let avatarUrl = assessStudent.avatar || '';
let childAge = assessStudent.childAge || '';
let assessmentTitle = assessStudent.assessmentTitle || '儿童成长评估';
const currentAssessmentModuleStatus = uni.getStorageSync(CURRENT_ASSESSMENT_MODULE_STATUS) || {};
let assessmentCreateTime = new Date(currentAssessmentModuleStatus.createTime || Date.now()).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
}).replace(/\//g, '年').replace(/\//g, '月') + '日';
let currentDate = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
}).replace(/\//g, '年').replace(/\//g, '月') + '日';

const taskId = ref('');
const recordId = ref('');
const childId = ref(assessStudent.childId || '');
const reportId = ref('');
const progress = ref(0);
const canViewReport = ref(false);
const taskStatus = ref('pending');
const totalSections = ref(0);
const completedSections = ref(0);
const currentSectionName = ref('');
const failReason = ref('');
let pollTimer = null;
let runPromise = null;
let pollInFlight = false;

let buttonStyle = {
    backgroundColor: "#FFFFFF",
    color: "#00214D",
    border: "1px solid #00214D",
    borderRadius: "48rpx",
    fontSize: "32rpx",
    padding: "26rpx 0",
    height: "50px",
    marginTop: "40rpx",
    width: "260rpx"
}

let primaryButtonStyle = {
    backgroundColor: "#00214D",
    color: "#FFFFFF",
    border: "1px solid #00214D",
    borderRadius: "48rpx",
    fontSize: "32rpx",
    padding: "26rpx 0",
    height: "50px",
    marginTop: "40rpx",
    width: "260rpx"
}

const navCustomStyle = 'background: linear-gradient(to right, #F5FDF8, #F1FCF5, #F9FCEF);height: calc(100vh / 8)'



const handleNavBack = () => {
    uni.switchTab({ url: '/pages/dashboard/teacher/teacher' })
};

const backToHome = () => {
    uni.switchTab({ url: '/pages/dashboard/teacher/teacher' })
}

const statusMessageMap = {
    pending: '正在准备分析',
    processing: '正在准备评估模块',
    waiting_merge: 'AI正在分析量表',
    pending_save: '正在保存智能分析报告',
    completed: '报告已生成',
    failed: '报告生成失败'
}

const progressStages = [
    { title: '准备分析', desc: '校验量表和报告任务' },
    { title: '分析评估模块', desc: '逐项分析已完成的评估单元' },
    { title: '生成综合结论', desc: '整合各模块结果与发展建议' },
    { title: '保存报告', desc: '完成报告存储并准备查看' }
];

const activeStageIndex = computed(() => {
    if (taskStatus.value === 'completed') return progressStages.length;
    if (taskStatus.value === 'pending_save') return 3;
    if (taskStatus.value === 'waiting_merge') return progress.value >= 90 ? 2 : 1;
    if (taskStatus.value === 'failed') {
        if (progress.value >= 99) return 3;
        if (progress.value >= 90) return 2;
        if (progress.value > 0) return 1;
    }
    return 0;
});

const statusTitle = computed(() => {
    if (taskStatus.value === 'waiting_merge' && progress.value >= 90) {
        return '正在生成报告总结';
    }
    return statusMessageMap[taskStatus.value] || '正在生成智能分析报告...';
});

const statusDesc = computed(() => {
    if (taskStatus.value === 'completed') return 'AI分析完成，可以查看报告';
    if (taskStatus.value === 'failed') return failReason.value || 'AI分析失败，请稍后在后台重试';
    if (taskStatus.value === 'pending_save') return '分析已完成，正在写入报告数据';
    if (taskStatus.value === 'waiting_merge' && progress.value >= 90) {
        return '所有模块分析已完成，正在生成综合结论';
    }
    if (taskStatus.value === 'waiting_merge' && totalSections.value > 0) {
        const current = currentSectionName.value ? `，当前：${currentSectionName.value}` : '';
        return `已完成 ${completedSections.value}/${totalSections.value} 个模块${current}`;
    }
    return '已启动AI分析量表，请保持网络连接';
});

const getStageClass = (index) => {
    if (index < activeStageIndex.value) return 'completed';
    if (index === activeStageIndex.value) {
        return taskStatus.value === 'failed' ? 'failed' : 'active';
    }
    return 'pending';
};

const getStageStateText = (index) => {
    const state = getStageClass(index);
    if (state === 'completed') return '已完成';
    if (state === 'active') return '进行中';
    if (state === 'failed') return '生成失败';
    return '待处理';
};

const updateStatusText = (data = {}) => {
    const status = data.status || 'pending';
    taskStatus.value = status;
    progress.value = Math.max(0, Math.min(100, Number(data.progress) || 0));
    totalSections.value = Number(data.totalSections) || 0;
    completedSections.value = Number(data.completedSections) || 0;
    currentSectionName.value = data.currentSectionName || '';
    failReason.value = data.failReason || '';
    recordId.value = data.recordId || recordId.value;
    reportId.value = data.reportId || reportId.value;

    if (status === 'completed') {
        progress.value = 100;
        canViewReport.value = true;
        stopPolling();
        return;
    }

    if (status === 'failed') {
        canViewReport.value = false;
        stopPolling();
        return;
    }

    canViewReport.value = false;
}

const pollReportTaskStatus = async () => {
    if ((!taskId.value && !recordId.value && !childId.value) || pollInFlight) return;

    pollInFlight = true;
    try {
        const res = await uniCloud.callFunction({
            name: 'wt-get-report-task-status',
            data: {
                taskId: taskId.value,
                recordId: recordId.value,
                childId: childId.value,
                uniIdToken: uni.getStorageSync('uni_id_token')
            }
        });

        if (res.result.code === 200) {
            updateStatusText(res.result.data || {});
        }
    } catch (error) {
        console.error('获取报告任务状态失败:', error);
    } finally {
        pollInFlight = false;
    }
}

const startPolling = () => {
    stopPolling();
    pollReportTaskStatus();
    pollTimer = setInterval(pollReportTaskStatus, 3000);
}

const stopPolling = () => {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

const runReportTask = () => {
    if (!taskId.value || runPromise) return runPromise;

    runPromise = uniCloud.callFunction({
        name: 'wt-run-report-tasks',
        data: {
            taskId: taskId.value,
            source: 'mini-program-after-assess',
            uniIdToken: uni.getStorageSync('uni_id_token')
        },
        timeout: 600000
    }).then(res => {
        if (res.result?.code === 200 && res.result.data) {
            updateStatusText(res.result.data);
            return;
        }

        if (res.result?.code !== 409) {
            throw new Error(res.result?.message || '启动报告分析失败');
        }
    }).catch(error => {
        console.error('按需执行报告任务失败:', error);
    }).finally(() => {
        runPromise = null;
        pollReportTaskStatus();
    });

    return runPromise;
}

const viewReport = () => {
    const currentStudent = uni.getStorageSync('current_student') || {};
    uni.setStorageSync('current_student', {
        ...currentStudent,
        _id: childId.value || currentStudent._id || assessStudent.childId,
        name: assessStudent.childName || currentStudent.name,
        avatar: assessStudent.avatar || currentStudent.avatar,
        class_id: assessStudent.classId || currentStudent.class_id,
        birthdate: assessStudent.birthdate || currentStudent.birthdate,
        gender: assessStudent.gender || currentStudent.gender,
        lastAssessmentDate: currentDate,
        age: assessStudent.childAge || currentStudent.age
    });
    const params = [
        'isHistory=true',
        taskId.value ? `taskId=${encodeURIComponent(taskId.value)}` : '',
        recordId.value ? `recordId=${encodeURIComponent(recordId.value)}` : '',
        reportId.value ? `reportId=${encodeURIComponent(reportId.value)}` : '',
        childId.value ? `childId=${encodeURIComponent(childId.value)}` : ''
    ].filter(Boolean).join('&');
    uni.redirectTo({ url: `/pages/assessment/report-v2?${params}` });
}



onLoad(async function (options) {
    taskId.value = options.taskId || '';
    recordId.value = options.recordId || currentAssessmentModuleStatus?.recordId || '';
    childId.value = options.childId || assessStudent.childId || '';
    startPolling();
    runReportTask();
});

onShow(() => {
    if (taskId.value || recordId.value || childId.value) startPolling();
});

onHide(() => {
    stopPolling();
});

onUnmounted(() => {
    stopPolling();

});

</script>

<style lang="scss" scoped>
.assessment {
    .content {
        background-color: linear-gradient(to right, #F5FDF8, #F1FCF5, #F9FCEF);
        min-height: calc(100vh - 100vh / 8);
        padding: 0 40rpx 20rpx 40rpx;
        box-sizing: border-box;

        .user-profile {
            // height: calc(100vh / 8);
            background:
                linear-gradient(to right, #F5FDF8, #F1FCF5, #F9FCEF);
            display: flex;
            justify-content: space-between;
            align-items: center; // 新增这行实现垂直居中
            // padding: 0 40rpx 20rpx 40rpx;
            box-shadow: inset 0 -20rpx 30rpx rgba(255, 255, 255, 0.8);


            .profile-left {
                display: flex;
                gap: 24rpx;
                height: 60%;
                align-items: center;
            }

            .profile-right {
                height: 60%;
                align-items: center;

                .report-list-image {
                    width: 90rpx;
                    height: 90rpx;
                }
            }

            .avatar-image {
                width: 120rpx;
                height: 120rpx;
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
                    gap: 8rpx;
                    color: #3D464A;
                    font-family: "PingFang SC";
                    font-size: 14px;
                    font-style: normal;
                    font-weight: 400;
                    line-height: 20px;
                    align-items: center;
                }
            }
        }

        .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            font-family: "PingFang SC", -apple-system, Roboto, Helvetica, sans-serif;
            color: #000000;
            margin-top: 32rpx;
            padding-bottom: 48rpx;

            .main-content-card {
                width: 100%;
                border-radius: 16rpx;
                background-color: #FFFFFF;
                box-shadow: 0 8rpx 8rpx rgba(0, 0, 0, 0.1);
                border: 1px solid #E9E9E9;
                display: flex;
                flex-direction: column;
                align-items: center;
                min-height: 820rpx;
                box-sizing: border-box;
                padding-bottom: 32rpx;

                .date-header {
                    font-size: 24rpx;
                    font-weight: 400;
                    align-self: flex-start;
                    padding: 28rpx;
                    box-sizing: border-box;
                    width: 100%;
                    color: #6F7374;
                    line-height: 38rpx;
                }

                .progress-visual {
                    position: relative;
                    width: 184rpx;
                    height: 184rpx;
                    flex-shrink: 0;
                    margin-top: 8rpx;

                    .progress-orbit {
                        position: absolute;
                        top: 0;
                        right: 0;
                        bottom: 0;
                        left: 0;
                        box-sizing: border-box;
                        border: 14rpx solid #DDE5E1;
                        border-top-color: #459C5C;
                        border-right-color: #6EDD8A;
                        border-radius: 50%;
                        animation: report-progress-spin 1.4s linear infinite;
                    }

                    .progress-center {
                        position: absolute;
                        top: 24rpx;
                        right: 24rpx;
                        bottom: 24rpx;
                        left: 24rpx;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        border-radius: 50%;
                        background: #FFFFFF;
                    }

                    .progress-number-row {
                        display: flex;
                        align-items: baseline;
                        justify-content: center;
                    }

                    .progress-number {
                        color: #00214D;
                        font-size: 48rpx;
                        font-weight: 700;
                        line-height: 58rpx;
                    }

                    .progress-unit {
                        color: #00214D;
                        font-size: 24rpx;
                        margin-left: 2rpx;
                    }

                    .progress-caption {
                        color: #6F7374;
                        font-size: 20rpx;
                        line-height: 30rpx;
                    }

                    &.completed {
                        .progress-orbit {
                            animation: none;
                            border-color: #459C5C;
                        }
                    }

                    &.failed {
                        .progress-orbit {
                            animation: none;
                            border-color: #CF7274;
                        }
                    }
                }

                .loading-message {
                    font-size: 30rpx;
                    font-weight: 600;
                    line-height: 44rpx;
                    margin-top: 24rpx;
                    color: #00214D;
                    text-align: center;
                }

                .status-detail {
                    width: calc(100% - 64rpx);
                    margin-top: 8rpx;
                    color: #6F7374;
                    font-size: 24rpx;
                    line-height: 36rpx;
                    text-align: center;
                    min-height: 36rpx;
                }

                .section-progress {
                    width: calc(100% - 64rpx);
                    box-sizing: border-box;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-top: 20rpx;
                    padding: 16rpx 20rpx;
                    background: #F2F7F6;
                    border-radius: 8rpx;
                    color: #3D464A;
                    font-size: 24rpx;
                }

                .section-progress-count {
                    color: #287A43;
                    font-weight: 600;
                }

                .progress-stages {
                    width: calc(100% - 64rpx);
                    margin-top: 28rpx;
                }

                .progress-stage {
                    display: flex;
                    align-items: flex-start;
                    min-height: 92rpx;

                    .stage-rail {
                        width: 48rpx;
                        min-height: 92rpx;
                        align-self: stretch;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        flex-shrink: 0;
                    }

                    .stage-marker {
                        width: 40rpx;
                        height: 40rpx;
                        box-sizing: border-box;
                        border: 2rpx solid #C5CECA;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: #FFFFFF;
                        color: #8A9290;
                        font-size: 22rpx;
                        font-weight: 600;
                        flex-shrink: 0;
                    }

                    .stage-line {
                        width: 2rpx;
                        flex: 1;
                        min-height: 44rpx;
                        margin: 6rpx 0;
                        background: #DDE5E1;
                    }

                    .stage-content {
                        flex: 1;
                        min-width: 0;
                        padding: 0 16rpx 20rpx 16rpx;
                        display: flex;
                        flex-direction: column;
                    }

                    .stage-title {
                        color: #3D464A;
                        font-size: 26rpx;
                        font-weight: 600;
                        line-height: 40rpx;
                    }

                    .stage-desc {
                        color: #8A9290;
                        font-size: 22rpx;
                        line-height: 34rpx;
                    }

                    .stage-state {
                        width: 88rpx;
                        flex-shrink: 0;
                        color: #8A9290;
                        font-size: 22rpx;
                        line-height: 40rpx;
                        text-align: right;
                    }

                    &.completed {
                        .stage-marker {
                            border-color: #459C5C;
                            background: #459C5C;
                            color: #FFFFFF;
                        }

                        .stage-line {
                            background: #8ACB9B;
                        }

                        .stage-state {
                            color: #287A43;
                        }
                    }

                    &.active {
                        .stage-marker {
                            border-color: #459C5C;
                            background: #E7F6EB;
                            color: #287A43;
                            animation: report-stage-pulse 1.5s ease-in-out infinite;
                        }

                        .stage-title,
                        .stage-state {
                            color: #287A43;
                        }
                    }

                    &.failed {
                        .stage-marker {
                            border-color: #CF7274;
                            background: #FCEBEC;
                            color: #A63E42;
                        }

                        .stage-title,
                        .stage-state {
                            color: #A63E42;
                        }
                    }
                }
            }

            .info-section {
                display: flex;
                margin-top: 36rpx;
                width: 100%;
                max-width: 572rpx;
                align-items: center;
                gap: 20rpx;
                font-size: 24rpx;
                font-weight: 600;

                .info-icon {
                    width: 36rpx;
                    height: 36rpx;
                }

                .info-text {
                    flex: 1;
                }
            }

            .backToHome {
                margin-top: 40rpx
            }

        }

    }
}

@keyframes report-progress-spin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

@keyframes report-stage-pulse {
    0%,
    100% {
        transform: scale(1);
    }

    50% {
        transform: scale(1.08);
    }
}
</style>
