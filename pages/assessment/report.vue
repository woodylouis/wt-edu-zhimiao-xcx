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
            <view class="report">
                <view class="part">
                    <capability-level :displayName="displayName" :plan="analysisTextAI"
                        :ziFaXingYuYanScore="sectionScores.自发性语言 || 0" :juFaHeYuFaScore="sectionScores.句法和语法"
                        :heZuoJiQiangHuaWuXiaoGuoScore="sectionScores.合作及强化物效果 || 0"
                        :keTangJiLvScore="sectionScores.课堂纪律 || 0" :age="childAge" />
                </view>
            </view>
        </view>
        <view style="z-index: 9999;">
            <popup :historyReports="historyReports" :show="showHistory" @update:show="val => showHistory = val"
                @onclickReportCard="onclickReportCard" />
        </view>
    </view>
</template>

<script setup>

import { onLoad } from '@dcloudio/uni-app'
import { ref, onUnmounted } from "vue";
import common from './common.js';
import customNav from '@/components/customNav';
import capabilityLevel from './components/capability-level-v2';
import popup from './components/popup';
import { CURRENT_STUDENT } from '@/lib/types/local_storage.js';


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
const historyReports = ref([])

const handleNavBack = () => {
    uni.redirectTo({ url: '/pages/dashboard/teacher/teacher' })
};

const handleClickHistory = () => {
    showHistory.value = true;
}

const onclickReportCard = (index) => {
    console.log("onclickReportCard received index:", index);
    console.log("Current report data:", historyReports.value[index]);
    const selectedReport = historyReports.value[index];
    // 更新页面显示的报告数据
    sectionScores.value = selectedReport.sectionScores || {};
    analysisTextAI.value = selectedReport.aiResponse || '';
    dateString.value = common.formatDate(selectedReport.completionTime) || '';

    // 关闭历史报告弹窗
    showHistory.value = false;

}

const fetchChildReportHistory = async (childId) => {
    // 显示加载提示

    try {
        // 1. 查询学生报告数据
        const res = await uniCloud.callFunction({
            name: 'wt-fetch-child-report-history',
            data: {
                childId,
                uniIdToken: uni.getStorageSync('uni_id_token')
            }
        });

        if (res.result.code !== 200 || !res.result.data.length) {
            uni.showToast({
                title: '暂无该学生历史报告，请先进行评估',
                icon: 'none'
            });
            return [];
        }

        // 2. 转换报告数据格式
        const assessmentList = uni.getStorageSync('teacher_assessment_list')?.list || [];
        return res.result.data.map(report => {
            const assessment = assessmentList.find(item => item._id === report.id);
            return {
                ...report,
                title: assessment?.title || '未知评估',
                date: common.formatDate(report.completionTime)
            };
        });
    } finally {
        // 无论成功失败都关闭加载提示
        uni.hideLoading();
    }
};

onLoad(async function (options) {
    if (options.isHistory == "true") {
        const student = uni.getStorageSync('current_student');
        uni.showLoading({
            title: '加载中...',
            mask: true
        });

        historyReports.value = await fetchChildReportHistory(student._id);

        if (historyReports.value.length > 0) {
            const currentClass = uni.getStorageSync('currentClass');
            displayName.value = student.name || '未知姓名';
            classDisplay.value = currentClass.nickname || '未知班级';
            childAge.value = common.ageDisplay(student.birthdate) || '未知年龄';
            sectionScores.value = historyReports.value[0].sectionScores || {};
            analysisTextAI.value = historyReports.value[0].aiResponse || '';
            dateString.value = historyReports.value[0].date || '';
        }
    } else {
        console.log(options)
        assessmentId.value = options.assessmentId;
        const cacheKey = `assessment_${assessmentId.value}`;
        const cachedData = uni.getStorageSync(cacheKey);
        // 初始化数据绑定
        if (cachedData) {
            displayName.value = cachedData.childName || '未知姓名';
            classDisplay.value = cachedData.className || '未知班级';
            childAge.value = cachedData.childAge || '未知年龄';
            totalScore.value = cachedData.totalScore || 0;
            sectionScores.value = cachedData.sectionScores || {};
            dateString.value = common.formatDate(cachedData.completionTime) || '';
            completionTime.value = new Date(cachedData.completionTime).toLocaleString();
        }
        historyReports.value = await fetchChildReportHistory(options.childId);
        if (historyReports.value.length > 0) {
            analysisTextAI.value = historyReports.value[0].aiResponse || '';
        }

    }
});

onUnmounted(() => {
    // 清除当前量表的缓存
    const cacheKey = `assessment_${assessmentId.value}`;
    uni.removeStorageSync(cacheKey);
    uni.removeStorageSync(CURRENT_STUDENT);
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
