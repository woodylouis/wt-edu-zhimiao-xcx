<template>
    <view class="development-section">
        <view class="development-card">
            <view class="card-title">能力达标情况</view>
            <view class="capability-bar">

                <view class="chart-container">
                    <l-echart ref="chartRef"></l-echart>
                </view>
                <view class="chart-container-2" style="margin-top: 48rpx;">
                    <l-echart ref="radarChartRef"></l-echart>
                </view>

                <!-- 新增：干预计划展示 -->
                <view v-if="plan">
                    <view class="card-title" style="margin-top: 24px;">🎯 个性化计划</view>
                    <text>{{ plan.yearGoal }}</text>

                    <view v-for="(month, mIndex) in plan.months" :key="mIndex" class="card-block">
                        <text class="subtitle">{{ month.month }}目标：{{ month.goal }}</text>

                        <view v-for="(week, wIndex) in month.weeks" :key="wIndex" class="week-block">
                            <view class="week">{{ week.week }}：{{ week.goal }}</view>

                            <view class="day-row" v-for="(day, dIndex) in week.days" :key="dIndex">
                                <view class="day-label">{{ day.day }}</view>
                                <view class="day-task">{{ day.task }}</view>
                            </view>
                        </view>

                    </view>
                </view>
                <!-- <view class="analysis-text-overall">
                    <rich-text v-if="nodes" :nodes="nodes" :tag-style="{ p: 'margin: 8px 0; line-height: 1.6;' }" />
                    <template v-else>
                        {{ analysisText }}
                    </template>
</view> -->

            </view>
        </view>
    </view>
</template>

<script setup>
import { ref, computed, watchEffect, onMounted, watch } from "vue";
// import { MarkdownIt, parseTokens } from "@/uni_modules/wtto-markdown/js_sdk/index";
import "@/uni_modules/wtto-markdown/js_sdk/markdown.css";
const echarts = require('../../../uni_modules/lime-echart/static/echarts.min');

const convertScoreToStage = (score, type) => {
    const thresholds = {
        ziFaXingYuYan: [0, 13, 26, 28, 28, 28, 28],
        juFaHeYuFa: [0, 0, 16, 27, 41, 43, 44],
        heZuoJiQiangHuaWuXiaoGuo: [0, 25, 48, 52, 52, 52, 52],
        keTangJiLv: [0, 0, 0, 0, 23, 24, 24]
    };

    // 找到分数所在的区间
    for (let i = 0; i < thresholds[type].length - 1; i++) {
        if (score >= thresholds[type][i] && score < thresholds[type][i + 1]) {
            // 计算在当前区间内的比例位置
            const range = thresholds[type][i + 1] - thresholds[type][i];
            const position = (score - thresholds[type][i]) / range;
            return i + 1 + position; // 返回带小数的阶段值
        }
    }

    // 处理超出最大值的情况
    if (score >= thresholds[type][thresholds[type].length - 1]) {
        return thresholds[type].length;
    }

    return 1; // 默认返回1阶
};
const chartRef = ref(null)
const radarChartRef = ref(null)
const props = defineProps({
    ziFaXingYuYanScore: Number,
    juFaHeYuFaScore: Number,
    heZuoJiQiangHuaWuXiaoGuoScore: Number,
    keTangJiLvScore: Number,
    displayName: String,
    analysisTextAI: String,
    age: String,
    plan: Object // 新增：计划数据
});
const option = computed(() => ({
    tooltip: {
        trigger: 'axis',
        axisPointer: {
            type: 'shadow'
        }
    },
    legend: {
        data: ['自发性语言', '句法和语法', '合作及强化物效果', '课堂纪律'],
        position: 'top',
    },
    grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
    },
    xAxis: {
        type: 'value',
        min: 1,
        max: 7,
        axisLabel: {
            formatter: function (value) {
                const stages = ['', '一阶', '二阶', '三阶', '四阶', '五阶', '六阶', '七阶'];
                return stages[value] || value;
            }
        }
    },
    yAxis: {
        type: 'category',
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false }
    },
    series: [
        {
            name: '自发性语言',
            type: 'bar',
            data: [convertScoreToStage(props.ziFaXingYuYanScore, 'ziFaXingYuYan')],
            itemStyle: { color: '#1890FF' }
        },
        {
            name: '句法和语法',
            type: 'bar',
            data: [convertScoreToStage(props.juFaHeYuFaScore, 'juFaHeYuFa')],
            itemStyle: { color: '#91CB74' }
        },
        {
            name: '合作及强化物效果',
            type: 'bar',
            data: [convertScoreToStage(props.heZuoJiQiangHuaWuXiaoGuoScore, 'heZuoJiQiangHuaWuXiaoGuo')],
            itemStyle: { color: '#FFA34D' }
        },
        {
            name: '课堂纪律',
            type: 'bar',
            data: [convertScoreToStage(props.keTangJiLvScore, 'keTangJiLv')],
            itemStyle: { color: '#b83b5e' }
        }
    ]
}));

const radarOption = computed(() => {
    // 从props.age中提取年龄数字（如"4岁5个月" -> 4）
    const ageYears = props.age ? parseInt(props.age.split('岁')[0]) : 0;

    return {
        radar: {
            indicator: [
                { name: '自发性语言', max: 7 },
                { name: '句法和语法', max: 7 },
                { name: '合作及强化物效果', max: 7 },
                { name: '课堂纪律', max: 7 }

            ],
        },
        // legend: {
        //     top: 'right',
        //     data: ['理想值', '当前'],
        // },

        series: [{
            type: 'radar',
            data: [
                {
                    value: [
                        convertScoreToStage(props.ziFaXingYuYanScore, 'ziFaXingYuYan'),
                        convertScoreToStage(props.juFaHeYuFaScore, 'juFaHeYuFa'),
                        convertScoreToStage(props.heZuoJiQiangHuaWuXiaoGuoScore, 'heZuoJiQiangHuaWuXiaoGuo'),
                        convertScoreToStage(props.keTangJiLvScore, 'keTangJiLv')

                    ],
                    name: '当前',
                },
                {
                    value: [
                        Math.min(ageYears, 7), // 限制最大为6岁
                        Math.min(ageYears, 7),
                        Math.min(ageYears, 7),
                        Math.min(ageYears, 7),
                    ],
                    name: '理想值',
                }
            ]
        }]
    };
});

watch(() => [props.ziFaXingYuYanScore, props.juFaHeYuFaScore, props.heZuoJiQiangHuaWuXiaoGuoScore], () => {
    if (chartRef.value && chartRef.value.chart) {
        chartRef.value.chart.setOption(option.value);
    }
    if (radarChartRef.value && radarChartRef.value.chart) {
        radarChartRef.value.chart.setOption(radarOption.value);
    }
});







onMounted(() => {
    setTimeout(async () => {
        if (!chartRef.value) return;
        const myChart = await chartRef.value.init(echarts);
        myChart.setOption(option.value);

        if (!radarChartRef.value) return;
        const radarChart = await radarChartRef.value.init(echarts);
        radarChart.setOption(radarOption.value);
    }, 300);
});



</script>


<style lang="scss" scoped>
.development-section {
    padding: 16px 20px;
}

.development-card {
    background-color: #fff;
    border-radius: 16px;
    padding: 16px;
    box-shadow:
        0px 0px 1px 0px rgba(193, 197, 210, 0.2),
        3px 4px 23px 1px rgba(193, 197, 210, 0.15);
}

.card-title {
    color: #00214d;
    font-size: 36rpx;
    font-weight: 500;
    line-height: 20px;
    margin-bottom: 10px;
}

.capability-bar {
    margin-top: 40rpx;

    .bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20rpx;

        .title {
            font-size: 16px;
            margin-right: 12px;
            font-weight: 300;
        }
    }
}

.chart-container,
.chart-container-2 {
    width: 100%;
    height: 400rpx;
    position: relative;
}

.gen-btn {
    background-color: #007aff;
    color: white;
    margin-top: 30rpx;
    padding: 20rpx;
    border-radius: 12rpx;
    text-align: center;
    font-size: 32rpx;
}

.card-block {
    background: #f5f5f5;
    border-radius: 16rpx;
    padding: 20rpx;
    margin-top: 24rpx;
}

.subtitle {
    font-weight: bold;
    font-size: 28rpx;
    color: #333;
}

.week-block {
    margin-top: 24rpx;
    background-color: #ffffff;
    border-radius: 12rpx;
    border: 1px solid #e0e0e0;
    padding: 16rpx;
    overflow-x: auto;
}

.week {
    font-weight: bold;
    color: #444;
    margin-bottom: 12rpx;
    font-size: 28rpx;
}

.day-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 26rpx;
    background-color: #fff;
    margin-top: 8rpx;
}

.day-table thead tr {
    background-color: #f5f5f5;
}

.day-table th,
.day-table td {
    border: 1px solid #ddd;
    padding: 16rpx;
    text-align: left;
    vertical-align: top;
}

.day-table th {
    font-weight: 600;
    color: #333;
}

.day-table td {
    color: #555;
    line-height: 1.6;
    background-color: #fafafa;
}

.week-block {
    margin-top: 24rpx;
    background-color: #ffffff;
    border-radius: 12rpx;
    border: 1px solid #e0e0e0;
    padding: 16rpx;
}

.week {
    font-weight: bold;
    color: #333;
    margin-bottom: 16rpx;
    font-size: 28rpx;
}

.day-row {
    display: flex;
    align-items: flex-start;
    padding: 12rpx 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
        border-bottom: none;
    }
}

.day-label {
    width: 100rpx;
    font-weight: 500;
    color: #007aff;
}

.day-task {
    flex: 1;
    color: #444;
    font-size: 26rpx;
    line-height: 1.5;
    padding-left: 8rpx;
}
</style>
