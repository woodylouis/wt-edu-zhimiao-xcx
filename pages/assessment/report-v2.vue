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
                    <u-collapse-item :title="section.sectionName" :name="`section_${index}`">
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
                                            :activeColor="getColorByAgeAndStage(childAgeInt, getScoreByAgeAndAlphabet(item.alphabet, item.actualTotalScore))"
                                            :showText="false" height="20">
                                            <text class="u-percentage-slot">
                                                {{ getScoreByAgeAndAlphabet(item.alphabet, item.actualTotalScore) }}
                                                {{ item.actualTotalScore }}分
                                            </text>
                                        </u-line-progress>
                                    </view>
                                </view>
                            </view>
                            <view class="sectionAnalysis">
                                <span>{{ section.analysis }}</span>
                            </view>

                        </view>
                        <!-- 落后技能 -->
                        <view class="collapse-skillBelowStandard">
                            <view class="skill-header">
                                <view style="display: flex; margin-bottom: 16rpx;">
                                    <text class="skill-icon">⚠️</text>
                                    <text class="skill-title">需要关注的技能</text>
                                </view>
                                <text class="skill-title-desc">虽然在某些方面已经达到总分的标准，根据评测时的选择，下面的技能仍需继续关注。</text>
                            </view>

                            <view class="skill-sections"
                                v-for="(abllsSection, index) in section.abllsSectionSummaryList" :key="index">
                                <view class="section-divider">
                                    <view class="section-name">{{ abllsSection.sectioName }}</view>
                                </view>
                                <view class="skill-items">
                                    <view class="skill-item" v-for="(item, index2) in abllsSection.questions"
                                        :key="index2">
                                        <view class="skill-badge">{{ index2 + 1 }}</view>
                                        <view class="skill-content">
                                            <view class="skill-name">{{ item.task_name }}</view>
                                            <view class="skill-description">{{ item.task_object }}</view>
                                        </view>
                                    </view>
                                </view>
                            </view>
                        </view>
                        <!-- 干预计划部分 HTML 结构修改 -->
                        <view class="collapse-skillImprovementPlan"
                            v-if="section.abllsSectionSummaryList && section.abllsSectionSummaryList.some(abllsSection =>
                                abllsSection.questions && abllsSection.questions.some(item => item.description && item.description.trim()))">
                            <view class="improvement-header">
                                <view class="improvement-icon">🎯</view>
                                <view class="improvement-title">干预建议计划</view>
                            </view>

                            <!-- 步骤条容器 -->
                            <view class="steps-container">
                                <view v-for="(abllsSection, sectionIndex) in section.abllsSectionSummaryList"
                                    :key="sectionIndex" class="section-step">

                                    <!-- 分区标题步骤 - 只有当该section有description的items时才显示 -->
                                    <view class="section-step-item"
                                        v-if="abllsSection.questions && abllsSection.questions.some(item => item.description && item.description.trim())">
                                        <view class="step-number">{{ sectionIndex + 1 }}</view>
                                        <view class="step-content section-header">
                                            <view class="step-title">{{ abllsSection.sectioName }}</view>
                                            <view class="step-subtitle">技能领域训练</view>
                                        </view>
                                        <view class="step-line"
                                            v-if="abllsSection.questions && abllsSection.questions.filter(item => item.description && item.description.trim()).length > 0">
                                        </view>
                                    </view>

                                    <!-- 具体任务步骤 - 只显示有description的items -->
                                    <template v-for="(item, taskIndex) in abllsSection.questions" :key="taskIndex">
                                        <view v-if="item.description && item.description.trim()" class="task-step-item">
                                            <view class="step-number sub-step">{{ sectionIndex + 1 }}.{{ taskIndex + 1
                                                }}</view>
                                            <view class="step-content task-content">
                                                <view class="step-title">{{ item.task_name }}</view>
                                                <view class="step-description">{{ item.description }}</view>
                                            </view>
                                            <view class="step-line"
                                                v-if="taskIndex < abllsSection.questions.length - 1 || sectionIndex < section.abllsSectionSummaryList.length - 1">
                                            </view>
                                        </view>
                                    </template>
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
import { ref, onUnmounted, onMounted, computed, watch, nextTick } from "vue";
import common from '@/common/common.js';
import customNav from '@/components/customNav';
import capabilityLevel from './components/capability-level-v2';
import popup from './components/popup';
import { getRadarOption } from './charts';
import { ALPHABET_AGE_MAP } from '@/lib/types/local_storage.js';
let displayName = ref('李思'); // 
let classDisplay = ref('小班3班');
let avatarUrl = ref("https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/girl.png");

const totalScore = ref(0);
const sectionScores = ref({});
const completionTime = ref('');
const childAge = ref('');
const childAgeInt = ref(0);
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

// 添加折叠面板状态管理
const activeCollapse = ref([]);

// 折叠面板事件处理函数
const openCollapse = (e) => {
    console.log('openCollapse', e)
}

const handleCollapseChange = (value) => {
    console.log('handleCollapseChange', value);

}

const closeCollapse = (e) => {
    console.log('closeCollapse', e)
}


const handleNavBack = () => {
    uni.redirectTo({ url: '/pages/dashboard/teacher/teacher' })
};

const handleClickHistory = () => {
    showHistory.value = true;
}

const getColorByAgeAndStage = (age, stageStr) => {
    console.log("getColorByAgeAndStage", age, stageStr)
    const stage = parseInt(stageStr?.replace('阶', ''))
    console.log("getColorByAgeAndStage stage", stage)

    if (isNaN(stage)) {
        return '#CCCCCC' // 错误处理色
    }

    if (stage === age) {
        return '#A2CF73' // 正常
    } else if (stage > age) {
        return '#4BAE4F' // 超前
    } else {
        return '#CF7274' // 落后
    }
}

const getScoreByAgeAndAlphabet = (alphabet, actualTotalScore) => {
    const map = uni.getStorageSync(ALPHABET_AGE_MAP)

    if (!map || !map[alphabet]) {
        return `-阶 ${actualTotalScore}/-`
    }

    const ageScoreMap = map[alphabet] // 如 {2: 51, 3: 106, 4: 155}

    // 按阶段数字顺序排序
    const stages = Object.keys(ageScoreMap).map(Number).sort((a, b) => a - b)

    // 遍历查找第一个比 actualTotalScore 更大的分数
    for (let i = 0; i < stages.length; i++) {
        const stage = stages[i]
        const score = ageScoreMap[stage]
        if (actualTotalScore < score) {
            // 分数没达到这个阶段 → 属于上一个阶段
            const currentStage = i === 0 ? stage : stages[i - 1]
            return `${currentStage}阶`
        }
    }

    // 如果比所有阶段都高，返回最后一阶
    const lastStage = stages[stages.length - 1]
    return `${lastStage}阶`
}

const onclickReportCard = (index) => {
    console.log("onclickReportCard received index:", index);
    console.log("Current report data:", historyReports.value[index]);
    const selectedReport = historyReports.value[index];

    // 收起所有折叠版 - 使用nextTick确保在DOM更新后执行
    nextTick(() => {
        activeCollapse.value = [];
    });

    // 更新页面显示的报告数据
    sectionSummaryList.value = selectedReport.sectionSummaryList || [];
    reportSummary.value = selectedReport.reportSummary || '';
    childAgeInt.value = selectedReport.ageInt || 0;
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
        console.log("radarOption", radarOption.value)
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
            childAgeInt.value = latestReport.ageInt || 0;
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
                // margin-left: 10rpx;

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

                .sectionAnalysis {
                    background: linear-gradient(135deg, #F0FDF4 0%, #F7FEE7 50%, #FEFCE8 100%);
                    border: 2rpx solid #A2CF73;
                    border-radius: 12rpx;
                    padding: 24rpx;
                    margin-bottom: 40rpx;
                    position: relative;
                    box-shadow: 0 4rpx 16rpx rgba(162, 207, 115, 0.15);
                    margin-top: 40rpx;
                    line-height: 1.4rem;
                    text-align: justify;
                    text-justify: inter-character;
                    hyphens: auto;

                    span {
                        text-align: justify;
                        text-justify: inter-character;
                        hyphens: auto;
                    }


                    &:before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 3rpx;
                        background: linear-gradient(90deg, #A2CF73, #84CC16, #65A30D);
                        border-radius: 12rpx 12rpx 0 0;
                    }

                    >text:first-child {
                        font-size: 26rpx;
                        font-weight: 600;
                        color: #365314;
                        display: block;
                        margin-bottom: 16rpx;

                        &:before {
                            content: '📊';
                            margin-right: 8rpx;
                            font-size: 22rpx;
                        }
                    }

                    span {
                        font-size: 24rpx;
                        color: #1F2937;
                        line-height: 1.5;
                        font-family: "PingFang SC", -apple-system, BlinkMacSystemFont, sans-serif;
                        background: rgba(255, 255, 255, 0.8);
                        padding: 12rpx 16rpx;
                        border-radius: 8rpx;
                        border: 1rpx solid #D9F99D;
                        display: block;
                        box-shadow: 0 2rpx 8rpx rgba(162, 207, 115, 0.1);

                        // 文本压缩技巧
                        overflow: hidden;
                        text-overflow: ellipsis;
                        display: -webkit-box;
                        -webkit-line-clamp: 4;
                        -webkit-box-orient: vertical;

                        // 悬停展开
                        transition: all 0.3s ease;
                        cursor: pointer;

                        &:hover {
                            -webkit-line-clamp: unset;
                            box-shadow: 0 4rpx 12rpx rgba(162, 207, 115, 0.2);
                            background: rgba(255, 255, 255, 0.95);
                        }
                    }
                }
            }

            .collapse-skillBelowStandard {
                background: linear-gradient(135deg, #FFF5F5 0%, #FEF2F2 50%, #FFEAEA 100%);
                border: 2rpx solid #FEB2B2;
                border-radius: 16rpx;
                padding: 32rpx 24rpx;
                margin: 24rpx 0 42rpx 0;
                box-shadow: 0 8rpx 24rpx rgba(254, 178, 178, 0.3);

                .skill-header {
                    // display: flex;
                    align-items: center;
                    margin-bottom: 32rpx;
                    padding-bottom: 20rpx;
                    border-bottom: 2rpx dashed #FEB2B2;

                    .skill-icon {
                        font-size: 32rpx;
                        margin-right: 16rpx;
                    }

                    .skill-title {
                        font-size: 32rpx;
                        font-weight: 600;
                        color: #DC2626;
                        font-family: "PingFang SC", -apple-system, BlinkMacSystemFont, sans-serif;
                        letter-spacing: 1rpx;
                    }

                    .skill-title-desc {
                        font-size: 26rpx;
                        color: #6B7280;
                        font-family: "PingFang SC", -apple-system, BlinkMacSystemFont, sans-serif;
                        line-height: 1.5;
                        // margin-top: 16rpx;
                        letter-spacing: 0.5rpx;
                    }
                }

                .skill-sections {
                    margin-bottom: 40rpx;

                    &:last-child {
                        margin-bottom: 0;
                    }
                }

                .section-divider {
                    position: relative;
                    text-align: center;
                    margin: 32rpx 0 24rpx 0;

                    &:before {
                        content: '';
                        position: absolute;
                        top: 50%;
                        left: 0;
                        right: 0;
                        height: 2rpx;
                        background: linear-gradient(90deg, transparent 0%, #FCA5A5 20%, #F87171 50%, #FCA5A5 80%, transparent 100%);
                        z-index: 1;
                    }

                    .section-name {
                        display: inline-block;
                        background: #FFFFFF;
                        padding: 8rpx 20rpx;
                        border: 2rpx solid #FEB2B2;
                        border-radius: 20rpx;
                        font-size: 26rpx;
                        font-weight: 500;
                        color: #B91C1C;
                        position: relative;
                        z-index: 2;
                        box-shadow: 0 4rpx 12rpx rgba(254, 178, 178, 0.4);
                    }
                }

                .skill-items {
                    display: flex;
                    flex-direction: column;
                    gap: 20rpx;
                }

                .skill-item {
                    display: flex;
                    align-items: flex-start;
                    background: rgba(255, 255, 255, 0.8);
                    border: 1rpx solid #FCA5A5;
                    border-radius: 12rpx;
                    padding: 20rpx;
                    transition: all 0.3s ease;
                    box-shadow: 0 4rpx 12rpx rgba(254, 178, 178, 0.2);

                    &:hover {
                        transform: translateY(-2rpx);
                        box-shadow: 0 8rpx 20rpx rgba(254, 178, 178, 0.3);
                    }
                }

                .skill-badge {
                    min-width: 40rpx;
                    height: 40rpx;
                    background: linear-gradient(135deg, #F87171, #EF4444);
                    color: #FFFFFF;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20rpx;
                    font-weight: 600;
                    margin-right: 20rpx;
                    margin-top: 4rpx;
                    box-shadow: 0 4rpx 8rpx rgba(239, 68, 68, 0.3);
                }

                .skill-content {
                    flex: 1;

                    .skill-name {
                        font-size: 28rpx;
                        font-weight: 600;
                        color: #991B1B;
                        margin-bottom: 8rpx;
                        line-height: 1.4;
                        font-family: "PingFang SC", -apple-system, BlinkMacSystemFont, sans-serif;
                    }

                    .skill-description {
                        font-size: 24rpx;
                        color: #7C2D12;
                        line-height: 1.5;
                        text-align: justify;
                        font-family: "PingFang SC", -apple-system, BlinkMacSystemFont, sans-serif;
                    }
                }
            }

            /* 步骤条样式 */
            .collapse-skillImprovementPlan {
                position: relative;
                background: #FED9B4;
                border-radius: 20rpx;
                padding: 40rpx 32rpx;
                margin-bottom: 20rpx;
                box-shadow: 0 8rpx 32rpx rgba(254, 217, 180, 0.3);
                position: relative;
                overflow: hidden;
                border: 2rpx solid #F4B266;

                &:before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    // height: 8rpx;
                    background: #F4B266;
                }

                &:after {
                    content: '💡';
                    position: absolute;
                    top: 24rpx;
                    right: 32rpx;
                    font-size: 48rpx;
                    opacity: 0.6;
                    animation: bounce 2s ease-in-out infinite;
                }

                .improvement-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 40rpx;
                    padding-bottom: 24rpx;
                    border-bottom: 2rpx dashed #F4B266;
                    position: relative;
                    z-index: 2;

                    .improvement-icon {
                        font-size: 36rpx;
                        margin-right: 16rpx;
                        animation: bounce 2s ease-in-out infinite;
                    }

                    .improvement-title {
                        font-size: 32rpx;
                        font-weight: 600;
                        color: #B85C38;
                        font-family: "PingFang SC", -apple-system, BlinkMacSystemFont, sans-serif;
                        letter-spacing: 1rpx;
                    }
                }

                .steps-container {
                    position: relative;
                }

                // 为每个 section-step 添加上下 margin
                .section-step {
                    margin: 24rpx 0;

                    &:first-child {
                        margin-top: 0;
                    }

                    &:last-child {
                        margin-bottom: 0;
                    }
                }

                // 通用步骤样式
                .section-step-item,
                .task-step-item,
                .completion-step {
                    position: relative;
                    display: flex;
                    align-items: flex-start;
                    margin-bottom: 32rpx;

                    &:last-child {
                        margin-bottom: 0;
                    }
                }

                // 步骤编号样式
                .step-number {
                    min-width: 60rpx;
                    height: 60rpx;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    font-size: 24rpx;
                    margin-right: 24rpx;
                    position: relative;
                    z-index: 2;

                    // 主步骤编号（分区）
                    &:not(.sub-step):not(.final-step) {
                        background: #F4B266;
                        color: #FFFFFF;
                        box-shadow: 0 4rpx 16rpx rgba(244, 178, 102, 0.4);

                        &:before {
                            content: '';
                            position: absolute;
                            top: -4rpx;
                            left: -4rpx;
                            right: -4rpx;
                            bottom: -4rpx;
                            border: 2rpx solid #FED9B4;
                            border-radius: 50%;
                            opacity: 0.6;
                        }
                    }

                    // 子步骤编号（具体任务）
                    &.sub-step {
                        background: #FFFFFF;
                        border: 2rpx solid #F4B266;
                        color: #B85C38;
                        font-size: 20rpx;
                        min-width: 54rpx;
                        height: 54rpx;
                        box-shadow: 0 2rpx 8rpx rgba(244, 178, 102, 0.2);
                    }

                    // 最终步骤
                    &.final-step {
                        background: #D2691E;
                        color: #FFFFFF;
                        font-size: 32rpx;
                        min-width: 68rpx;
                        height: 68rpx;
                        box-shadow: 0 6rpx 20rpx rgba(210, 105, 30, 0.4);
                        animation: pulse 2s ease-in-out infinite;
                    }
                }

                // 步骤内容样式
                .step-content {
                    flex: 1;
                    background: rgba(255, 255, 255, 0.9);
                    border-radius: 12rpx;
                    padding: 24rpx;
                    border: 1rpx solid #F4B266;
                    box-shadow: 0 4rpx 12rpx rgba(244, 178, 102, 0.2);
                    transition: all 0.3s ease;

                    &:hover {
                        transform: translateX(8rpx);
                        box-shadow: 0 6rpx 16rpx rgba(244, 178, 102, 0.3);
                    }

                    // 分区标题样式
                    &.section-header {
                        background: #FEF0E1;
                        border-left: 4rpx solid #F4B266;

                        .step-title {
                            font-size: 28rpx;
                            font-weight: 600;
                            color: #B85C38;
                            margin-bottom: 8rpx;

                            &:before {
                                content: '📋';
                                margin-right: 8rpx;
                                font-size: 24rpx;
                            }
                        }

                        .step-subtitle {
                            font-size: 22rpx;
                            color: #D2691E;
                            opacity: 0.8;
                        }
                    }

                    // 任务内容样式
                    &.task-content {
                        margin-left: 20rpx;

                        .step-title {
                            font-size: 26rpx;
                            font-weight: 500;
                            color: #B85C38;
                            margin-bottom: 12rpx;

                            &:before {
                                content: '✓';
                                margin-right: 8rpx;
                                font-size: 20rpx;
                                color: #F4B266;
                            }
                        }

                        .step-description {
                            font-size: 24rpx;
                            color: #D2691E;
                            line-height: 1.6;
                            text-align: justify;
                            margin-bottom: 12rpx;
                            background: #FEF8F3;
                            padding: 12rpx;
                            border-radius: 6rpx;
                        }
                    }

                    // 最终目标样式
                    &.final-content {
                        background: #FED9B4;
                        border-left: 4rpx solid #D2691E;

                        .step-title {
                            font-size: 28rpx;
                            font-weight: 600;
                            color: #8B4513;
                            margin-bottom: 8rpx;

                            &:before {
                                content: '🎉';
                                margin-right: 8rpx;
                                font-size: 24rpx;
                            }
                        }

                        .step-description {
                            font-size: 24rpx;
                            color: #B85C38;
                            line-height: 1.6;
                        }
                    }
                }

                // 连接线样式
                .step-line {
                    position: absolute;
                    left: 30rpx;
                    top: 60rpx;
                    bottom: -32rpx;
                    // width: 2rpx;
                    background: #F4B266;
                    z-index: 1;

                    // 虚线效果
                    &:after {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -1rpx;
                        width: 4rpx;
                        height: 100%;
                        background: repeating-linear-gradient(180deg,
                                #F4B266 0%,
                                #F4B266 10%,
                                transparent 10%,
                                transparent 20%);
                        animation: flowDown 3s ease-in-out infinite;
                    }
                }

                // 动画效果
                @keyframes flowDown {
                    0% {
                        transform: translateY(-20rpx);
                        opacity: 0.5;
                    }

                    50% {
                        opacity: 1;
                    }

                    100% {
                        transform: translateY(20rpx);
                        opacity: 0.5;
                    }
                }

                @keyframes pulse {

                    0%,
                    100% {
                        transform: scale(1);
                    }

                    50% {
                        transform: scale(1.05);
                    }
                }

                @keyframes bounce {

                    0%,
                    20%,
                    50%,
                    80%,
                    100% {
                        transform: translateY(0);
                    }

                    40% {
                        transform: translateY(-8rpx);
                    }

                    60% {
                        transform: translateY(-4rpx);
                    }
                }
            }

            // 动画效果
            @keyframes flowDown {
                0% {
                    transform: translateY(-20rpx);
                    opacity: 0.5;
                }

                50% {
                    opacity: 1;
                }

                100% {
                    transform: translateY(20rpx);
                    opacity: 0.5;
                }
            }

            @keyframes pulse {

                0%,
                100% {
                    transform: scale(1);
                }

                50% {
                    transform: scale(1.05);
                }
            }

            @keyframes bounce {

                0%,
                20%,
                50%,
                80%,
                100% {
                    transform: translateY(0);
                }

                40% {
                    transform: translateY(-8rpx);
                }

                60% {
                    transform: translateY(-4rpx);
                }
            }
        }


    }
}

.u-collapse-content {
    color: $u-tips-color;
    font-size: 14px;
}

.u-percentage-slot {
    padding: 1px 5px;
    background-color: $u-warning;
    color: #fff;
    border-radius: 100px;
    font-size: 10px;
    // margin-right: -5px;
}
</style>