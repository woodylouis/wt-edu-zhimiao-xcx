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
                    <image
                        src="https://cdn.builder.io/api/v1/image/assets/022245c9a8b14954aad66a5dc04d83ff/f2e436be44ad54ad40e29997f78afdd3ac0678de?placeholderIfAbsent=true"
                        class="loading-image" mode="aspectFit" />
                    <text class="loading-message">
                        {{ statusTitle }}
                    </text>
                    <view class="progress-box" v-if="progress > 0">
                        <view class="progress-track">
                            <view class="progress-fill" :style="{ width: progress + '%' }"></view>
                        </view>
                        <text class="progress-label">{{ progress }}%</text>
                    </view>
                    <!-- 分割线 -->
                    <view class="separator"></view>
                    <view class="tips">
                        <img src="https://cdn.builder.io/api/v1/image/assets/022245c9a8b14954aad66a5dc04d83ff/e6fd64bcab073741b3e800de42955c66c3e1302f?placeholderIfAbsent=true"
                            class="analysis-icon" alt="AI Analysis" />
                        <p class="analysis-text">
                            <span class="analysis-text-normal">{{ statusDesc }}</span>
                        </p>
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

import { onLoad } from '@dcloudio/uni-app'
import { ref, onUnmounted } from "vue";
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
const statusTitle = ref('正在生成智能分析报告...');
const statusDesc = ref('DeepSeek正在分析中，约需5~7分钟');
let pollTimer = null;

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
    uni.redirectTo({ url: '/pages/dashboard/teacher/teacher' })
};

const backToHome = () => {
    uni.redirectTo({ url: '/pages/dashboard/teacher/teacher' })
}

const statusMessageMap = {
    pending: '任务已提交，等待DeepSeek分析',
    processing: 'DeepSeek正在分析各评估模块',
    waiting_merge: '正在生成报告总结',
    pending_save: '正在保存智能分析报告',
    completed: '报告已生成',
    failed: '报告生成失败'
}

const updateStatusText = (data = {}) => {
    const status = data.status || 'pending';
    progress.value = Math.max(0, Math.min(100, Number(data.progress) || 0));

    if (status === 'completed') {
        progress.value = 100;
        reportId.value = data.reportId || reportId.value;
        canViewReport.value = true;
        statusTitle.value = '报告已生成';
        statusDesc.value = 'DeepSeek分析完成，可以查看报告';
        stopPolling();
        return;
    }

    if (status === 'failed') {
        canViewReport.value = false;
        statusTitle.value = '报告生成失败';
        statusDesc.value = data.failReason || 'DeepSeek分析失败，请稍后在后台重试';
        stopPolling();
        return;
    }

    canViewReport.value = false;
    statusTitle.value = statusMessageMap[status] || '正在生成智能分析报告...';
    statusDesc.value = 'DeepSeek正在分析中，约需5~7分钟';
}

const pollReportTaskStatus = async () => {
    if (!taskId.value && !recordId.value && !childId.value) return;

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
    }
}

const startPolling = () => {
    stopPolling();
    pollReportTaskStatus();
    pollTimer = setInterval(pollReportTaskStatus, 8000);
}

const stopPolling = () => {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

const viewReport = () => {
    const currentStudent = uni.getStorageSync('current_student') || {};
    uni.setStorageSync('current_student', {
        ...currentStudent,
        _id: childId.value || currentStudent._id || assessStudent.childId,
        name: currentStudent.name || assessStudent.childName,
        avatar: currentStudent.avatar || assessStudent.avatar,
        class_id: currentStudent.class_id || assessStudent.classId,
        birthdate: currentStudent.birthdate || assessStudent.birthdate,
        gender: currentStudent.gender || assessStudent.gender,
        lastAssessmentDate: currentStudent.lastAssessmentDate || currentDate,
        age: currentStudent.age || assessStudent.childAge
    });
    uni.redirectTo({ url: '/pages/assessment/report-v2?isHistory=true' });
}



onLoad(async function (options) {
    taskId.value = options.taskId || '';
    recordId.value = options.recordId || currentAssessmentModuleStatus?.recordId || '';
    childId.value = options.childId || assessStudent.childId || '';
    startPolling();
});

onUnmounted(() => {
    stopPolling();

});

</script>

<style lang="scss" scoped>
.assessment {
    .content {
        background-color: linear-gradient(to right, #F5FDF8, #F1FCF5, #F9FCEF);
        height: calc(100vh - 100vh / 8);
        padding: 0 40rpx 20rpx 40rpx;

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
            margin-top: 76rpx;
            // background-color: red;

            .main-content-card {
                width: 100%;
                border-radius: 16rpx;
                background-color: #FFFFFF;
                box-shadow: 0 8rpx 8rpx rgba(0, 0, 0, 0.1);
                border: 1px solid #E9E9E9;
                display: flex;
                flex-direction: column;
                align-items: center;
                height: 45vh;

                .date-header {
                    font-size: 24rpx;
                    font-weight: 400;
                    align-self: flex-start;
                    padding: 28rpx;
                }

                .loading-image {
                    width: 360rpx;
                    height: 280rpx;
                    margin-top: 60rpx;
                }


                .loading-message {
                    font-size: 30rpx;
                    font-weight: 600;
                    line-height: 1.2;
                    margin-top: 52rpx;
                }

                .progress-box {
                    width: 70%;
                    display: flex;
                    align-items: center;
                    gap: 16rpx;
                    margin-top: 24rpx;

                    .progress-track {
                        flex: 1;
                        height: 12rpx;
                        background: #E9E9E9;
                        border-radius: 999rpx;
                        overflow: hidden;
                    }

                    .progress-fill {
                        height: 100%;
                        background: #6EDD8A;
                        border-radius: 999rpx;
                        transition: width 0.2s ease;
                    }

                    .progress-label {
                        color: #3D464A;
                        font-size: 24rpx;
                    }
                }

                .separator {
                    width: 100%;
                    height: 1px;
                    background-color: #E9E9E9;
                    margin-top: 40rpx;
                    margin-bottom: 40rpx;
                }

                .tips {
                    display: flex;
                    align-items: stretch;
                    gap: 8px;
                    font-family: PingFang SC, -apple-system, Roboto, Helvetica, sans-serif;
                    font-size: 15px;
                    color: rgba(0, 0, 0, 1);
                    font-weight: 600;
                    line-height: 1.2;

                    .analysis-icon {
                        aspect-ratio: 1;
                        object-fit: contain;
                        object-position: center;
                        width: 23px;
                        height: 23px;
                        flex-shrink: 0;
                    }

                    .analysis-text {
                        margin: auto 0;
                        flex-basis: auto;

                        .analysis-text-normal {
                            font-weight: 400;
                        }
                    }
                }
            }

            .info-section {
                display: flex;
                margin-top: 114rpx;
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
</style>
