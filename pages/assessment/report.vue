<template>
    <view class="assessment">
        <custom-nav :xcxName="'儿童成长评估'" :navCustomStyle="navCustomStyle" :needBar="false" :needBack="true"
            :backHandler="handleNavBack" />
        <view class="content">
            <view class="user-profile">
                <!-- 左侧内容容器 -->
                <view class="profile-left">
                    <image class="avatar-image" :src="avatarUrl" />
                    <view class="info">
                        <view class="name">{{ displayName }}的评估报告</view>
                        <view class="class">
                            <view style="display: flex;">
                                <view style="margin-right: 40rpx"><span style="font-weight: bold;">班级：</span>{{
                                    classDisplay
                                    }}</view>
                                <view><span style="font-weight: bold;">年龄：</span>{{ childAge }}</view>
                            </view>

                            <view><span style="font-weight: bold;">评估日期：</span>{{ dateString }}</view>
                        </view>
                    </view>
                </view>
                <view class="profile-right" @click="handleClickHistory">
                    <image class="report-list-image" :src="listIconUrl" />
                </view>
            </view>
            <!-- <view class="report">
                <view class="part">
                    <capability-level :displayName="displayName" :analysisTextAI="analysisTextAI"
                        :perception-score="sectionScores.感知觉 || 0" :social-score="sectionScores.社交"
                        :motor-score="sectionScores.运动 || 0" :language-score="sectionScores.语言 || 0"
                        :selfcare-score="sectionScores.生活自理 || 0" :age="childAge" />
                </view>
            </view> -->
        </view>
        <view style="z-index: 9999;">
            <popup :show="showHistory" @update:show="val => showHistory = val" @closed="handlePopupClosed" />
        </view>
    </view>
</template>

<script setup>

import { onLoad } from '@dcloudio/uni-app'
import { ref, onUnmounted } from "vue";
import common from '@/common/common.js';
import customNav from '@/components/customNav';
import capabilityLevel from './components/capability-level-v2';
import popup from './components/popup';

let displayName = ref('李思'); // 
let classDisplay = ref('小班3班');
let avatarUrl = ref("https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/girl.png");

const totalScore = ref(0);
const sectionScores = ref({});
const completionTime = ref('');
const childAge = ref('');
const dateString = ref('');
const showHistory = ref(false);
const navCustomStyle = 'background: linear-gradient(to right, #F5FDF8, #F1FCF5, #F9FCEF);height: calc(100vh / 8)'
// 在setup中添加卸载生命周期
const assessmentId = ref('');
const analysisTextAI = ref('');
const listIconUrl = "../../static/general/list.png";

const handleNavBack = () => {
    uni.redirectTo({ url: '/pages/dashboard/teacher/teacher' })
};

const handleClickHistory = () => {
    showHistory.value = true;
}

const handlePopupClosed = () => {
    // 这里可以添加父页面需要执行的逻辑
    console.log('popup已关闭')
}

onLoad((options) => {
    const isHistory = true
    if (isHistory) {
        const studentReport = uni.getStorageSync('currentStudentReport');
        const currentClass = uni.getStorageSync('currentClass');
        console.log('studentReport:', studentReport);
        if (studentReport) {
            displayName.value = studentReport.name || '未知姓名';
            classDisplay.value = studentReport.className || '未知班级';
            classDisplay.value = currentClass.nickname || '未知班级';
            childAge.value = common.ageDisplay(studentReport.birthdate) || '未知年龄';
            sectionScores.value = studentReport.reports[0].sectionScores || {};
            analysisTextAI.value = studentReport.reports[0].aiResponse || '';
            dateString.value = common.formatDate(studentReport.reports[0].completionTime) || '';
            // console.log("analysisTextAI", analysisTextAI.value)
        }
    } else {
        assessmentId.value = options.assessmentId; // 存储assessmentId
        analysisTextAI.value = options.analysisTextAI;
        const cacheKey = `assessment_67f61c06816a3f73442910de`;
        const cachedData = uni.getStorageSync(cacheKey);
        // 初始化数据绑定
        if (cachedData) {
            displayName.value = cachedData.childName || '未知姓名';
            classDisplay.value = cachedData.className || '未知班级';
            childAge.value = cachedData.childAge || '未知年龄';
            totalScore.value = cachedData.totalScore || 0;
            sectionScores.value = cachedData.sectionScores || {};
            console.log("sectionScores", sectionScores.value)

            // 格式化年龄显示
            // if (cachedData.childAge >= 2) {
            //     const years = Math.floor(cachedData.childAge);
            //     const months = Math.round((cachedData.childAge - years) * 10 * 1.2);
            //     formattedAge.value = months === 0 ?
            //         `${years}岁` :
            //         `${years}岁${months}个月`;
            // } else {
            //     formattedAge.value = `${Math.round(cachedData.childAge * 10 * 1.2)}个月`;
            // }

            // 格式化完成时间
            completionTime.value = new Date(cachedData.completionTime).toLocaleString();
        }

    }
});

onUnmounted(() => {
    // 清除当前量表的缓存
    const cacheKey = `assessment_${assessmentId.value}`;
    uni.removeStorageSync(cacheKey);
    console.log('已清除评估缓存:', cacheKey);
});

</script>

<style lang="scss" scoped>
.assessment {
    .content {
        background-color: linear-gradient(to right, #F5FDF8, #F1FCF5, #F9FCEF);
        height: calc(100vh - 100vh / 8);

        .user-profile {
            // height: calc(100vh / 8);
            background:
                linear-gradient(to right, #F5FDF8, #F1FCF5, #F9FCEF);
            display: flex;
            justify-content: space-between;
            align-items: center; // 新增这行实现垂直居中
            padding: 0 40rpx 20rpx 40rpx;
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


    }
}
</style>