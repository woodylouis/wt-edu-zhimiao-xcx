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

                            <view><span style="font-weight: bold;">报告日期：</span>{{ dateString }}</view>
                        </view>
                    </view>
                </view>
                <view class="profile-right" @click="handleClickHistory">
                    <image class="report-list-image" :src="listIconUrl" />
                </view>
            </view>
            <div class="assessment-container">
                <div class="assessment-card">
                    <h1 class="assessment-title">
                        ABLLS-R评估能力分布图
                    </h1>
                    <section class="chart-area">
                        <l-echart ref="radarChartRef"></l-echart>
                    </section>
                    <section class="recommendation-section">
                        {{ reportSummary }}
                    </section>
                </div>
            </div>
            <view class="collapse" v-for="(section, index) in sectionSummaryList" :key="index">
                <u-collapse @change="handleCollapseChange" @close="closeCollapse" @open="openCollapse" :border=false
                    :value="activeCollapse">
                    <u-collapse-item :title="section.sectionName" :name="section.sectionName">
                        <view class="collapse-content">
                            <view class="sectionScore">
                                得分：{{`${section.abllsSectionSummaryList.reduce(
                                    (sum, item) => sum + (item.actualTotalScore || 0), 0
                                )}/${section.abllsSectionSummaryList.reduce(
                                    (sum, item) =>
                                        sum + (item.expectedTotalScore || 0), 0
                                )}`}}
                            </view>
                            <view class="abllsSection" v-for="(item, index) in section.abllsSectionSummaryList"
                                :key="index">
                                <view class="abllsItem">
                                    <view class="abllsItemTitle">{{ item.sectioName }}</view>
                                    <view class="abllsItemScore">
                                        <u-line-progress
                                            :percentage="Math.round(item.actualTotalScore / item.expectedTotalScore * 100)"
                                            activeColor="#A2CF73"></u-line-progress>
                                    </view>
                                </view>
                            </view>
                        </view>
                    </u-collapse-item>
                </u-collapse>
            </view>
        </view>
        <view style="z-index: 9999;">
            <popup :historyReports="historyReports" :show="showHistory" @update:show="val => showHistory = val"
                @onclickReportCard="onclickReportCard" />
        </view>
    </view>
</template>

<script setup>
const echarts = require('../../uni_modules/lime-echart/static/echarts.min');
import { onLoad } from '@dcloudio/uni-app'
import { ref, onUnmounted, onMounted, computed, watch } from "vue";
import common from '@/common/common.js';
import customNav from '@/components/customNav';
import capabilityLevel from './components/capability-level-v2';
import popup from './components/popup';
import { getRadarOption } from './charts';

let displayName = ref('李思'); // 
let classDisplay = ref('小班3班');
let avatarUrl = ref("https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/girl.png");

const totalScore = ref(0);
const sectionScores = ref({});
const completionTime = ref('');
const childAge = ref('');
const dateString = ref('');
const reportSummary = ref('');
const showHistory = ref(false);
const navCustomStyle = 'background: linear-gradient(to right, #F5FDF8, #F1FCF5, #F9FCEF);height: calc(100vh / 8)'
// 在setup中添加卸载生命周期
const assessmentId = ref('');
const analysisTextAI = ref('');
const listIconUrl = "../../static/general/list.png";
const historyReports = ref([])
const radarChartRef = ref(null)
const sectionSummaryList = ref([])
const sectionScoreList = ref([]);

const assessmentSections = [
    {
        name: '语言与沟通技能',
    },
    {
        name: '社会与游戏技能',
    },
    {
        name: '学习与记忆技能',
    },
]

const handleNavBack = () => {
    uni.redirectTo({ url: '/pages/dashboard/teacher/teacher' })
};

const handleClickHistory = () => {
    showHistory.value = true;
}




// watch(sectionScoreList, (newVal) => {
//     console.log("sectionScoreList watch", newVal)
//     if (newVal && newVal.length > 0) {
//         radarOption.value = getRadarOption(newVal);
//     }
// }, { immediate: true, deep: true });

const onclickReportCard = (index) => {
    console.log("onclickReportCard received index:", index);
    console.log("Current report data:", historyReports.value[index]);
    const selectedReport = historyReports.value[index];
    // 更新页面显示的报告数据
    sectionSummaryList.value = selectedReport.sectionSummaryList || [];
    reportSummary.value = selectedReport.reportSummary || '';
    // sectionScores.value = selectedReport.sectionScores || {};
    // analysisTextAI.value = selectedReport.aiResponse || '';
    // dateString.value = common.formatDate(selectedReport.completionTime) || '';

    // 关闭历史报告弹窗
    showHistory.value = false;

}

const fetchChildReportHistory = async (childId) => {
    // 显示加载提示

    try {
        // 1. 查询学生报告数据
        const res = await uniCloud.callFunction({
            name: 'wt-fetch-child-report-history',
            data: { childId }
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

const radarOption = ref({});

watch(() => sectionSummaryList.value, (newVal) => {
    if (newVal && newVal.length > 0) {
        radarOption.value = getRadarOption(newVal);
        // console.log("radarOption", radarOption.value)
        updateChart();
    }
}, { deep: true });

// 添加updateChart方法
const updateChart = async () => {
    if (!radarChartRef.value || !radarOption.value.radar?.indicator?.length) return;
    try {
        const chart = await radarChartRef.value.init(echarts);
        chart.setOption(radarOption.value);
    } catch (e) {
        console.error('图表更新失败:', e);
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
            const latestReport = historyReports.value[0];
            const currentClass = uni.getStorageSync('currentClass');
            displayName.value = student.name || '未知姓名';
            classDisplay.value = currentClass.nickname || '未知班级';
            childAge.value = common.ageDisplay(student.birthdate) || '未知年龄';
            sectionSummaryList.value = latestReport.sectionSummaryList || [];
            dateString.value = common.formatDate(latestReport.completionTime) || '';
            reportSummary.value = latestReport.reportSummary || '';
            console.log("latestReport", latestReport)

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

onMounted(async () => {
    await updateChart();
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

        .assessment-container {
            width: 100%;
            margin: 0 auto;
            display: flex;
            justify-content: center;
            align-items: center;
            // min-height: 100vh;
            padding: 40rpx;
            box-sizing: border-box;

            .assessment-card {
                width: 670rpx;
                height: 722rpx;
                position: relative;
                border-radius: 16rpx;
                border: 1px solid #e9e9e9;
                box-shadow: 0 8rpx 8rpx 0 rgba(0, 0, 0, 0.25);
                flex-shrink: 0;
                background-color: #fff;

                .assessment-title {
                    position: absolute;
                    left: 172rpx;
                    top: 32rpx;
                    width: 322rpx;
                    height: 40rpx;
                    color: #000;
                    font-family: "PingFang SC", -apple-system, Roboto, Helvetica, sans-serif;
                    font-size: 28rpx;
                    font-weight: 500;
                    margin: 0;
                }

                .chart-area {
                    position: absolute;
                    left: 0;
                    top: 100rpx;
                    width: 670rpx;
                    height: 512rpx;
                    background-color: #fff;
                }

                .recommendation-section {
                    // 永远保持在底部
                    bottom: 0;
                    position: absolute;
                    left: 0;
                    top: 612rpx;
                    width: 670rpx;
                    // height: 110rpx;
                    color: #00214d;
                    font-family: "PingFang SC", -apple-system, Roboto, Helvetica, sans-serif;
                    font-size: 22rpx;
                    font-weight: 400;
                    border-radius: 0 0 16rpx 16rpx;
                    box-shadow: 0 8rpx 8rpx 0 rgba(0, 0, 0, 0.25);
                    background-color: rgba(110, 221, 138, 0.12);
                    display: flex;
                    align-items: center;
                    padding: 0 24rpx;
                    box-sizing: border-box;
                }
            }
        }

        .collapse {
            // padding: 0 40rpx;
            border-radius: 8px;
            border: 1px solid #E9E9E9;
            background: #FFF;
            box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
            margin: 22rpx 40rpx;

            .collapse-content {
                margin-left: 10rpx;

                .sectionScore {
                    margin-bottom: 30rpx;
                }

                .abllsSection {
                    width: 100%;

                    .abllsItem {
                        display: flex;
                        margin-bottom: 20rpx;

                        .abllsItemTitle {
                            width: 25%;
                        }

                        .abllsItemScore {
                            width: 75%;
                        }
                    }
                }
            }
        }


    }
}

.u-collapse-content {
    color: $u-tips-color;
    font-size: 14px;
}
</style>