<template>
    <view class="development-section">
        <view class="development-card">
            <view class="card-title">能力达标情况</view>
            <view class="capability-bar">

                <view class="chart-container">
                    <l-echart ref="chartRef" is-disable-scroll></l-echart>
                </view>
                <view class="chart-container-2" style="margin-top: 48rpx;">
                    <l-echart ref="radarChartRef" is-disable-scroll></l-echart>
                </view>

                <view class="analysis-text-overall">
                    <rich-text v-if="nodes" :nodes="nodes" :tag-style="{ p: 'margin: 8px 0; line-height: 1.6;' }" />
                    <!-- <template v-else>
                        {{ analysisText }}
                    </template> -->
                </view>

            </view>
        </view>
    </view>
</template>

<script setup>
import { ref, computed, watchEffect, onMounted, watch } from "vue";
import { MarkdownIt, parseTokens } from "@/uni_modules/wtto-markdown/js_sdk/index";
import "@/uni_modules/wtto-markdown/js_sdk/markdown.css";
const echarts = require('../../../uni_modules/lime-echart/static/echarts.min');

const convertScoreToStage = (score, type) => {
    const thresholds = {
        motor: [0, 7, 23, 37, 51, 57], // 运动维度各阶阈值
        language: [0, 24, 46, 50, 50, 50],  // 语言维度各阶阈值
        social: [0, 0, 0, 0, 23, 24] // 社交维度各阶阈值
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
    motorScore: Number,
    languageScore: Number,
    socialScore: Number,
    displayName: String,
    analysisTextAI: String,
});
console.log(props)
const option = computed(() => ({
    tooltip: {
        trigger: 'axis',
        axisPointer: {
            type: 'shadow'
        }
    },
    legend: {
        data: ['运动', '语言', '社交'],
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
        max: 6,
        axisLabel: {
            formatter: function (value) {
                const stages = ['', '一阶', '二阶', '三阶', '四阶', '五阶', '六阶'];
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
            name: '运动',
            type: 'bar',
            data: [convertScoreToStage(props.motorScore, 'motor')],
            itemStyle: { color: '#1890FF' }
        },
        {
            name: '语言',
            type: 'bar',
            data: [convertScoreToStage(props.languageScore, 'language')],
            itemStyle: { color: '#91CB74' }
        },
        {
            name: '社交',
            type: 'bar',
            data: [convertScoreToStage(props.socialScore, 'social')],
            itemStyle: { color: '#FFA34D' }
        }
    ]
}));

const radarOption = computed(() => ({
    radar: {
        indicator: [
            { name: '运动', max: 7 },
            { name: '语言', max: 7 },
            { name: '社交', max: 7 }
        ],
        // radius: '65%'
    },
    series: [{
        type: 'radar',
        data: [
            {
                value: [
                    convertScoreToStage(props.motorScore, 'motor'),
                    convertScoreToStage(props.languageScore, 'language'),
                    convertScoreToStage(props.socialScore, 'social')
                ],
                name: '当前',
            },
            {
                value: [
                    4,
                    4,
                    4
                ],
                name: '标准',


            }
        ]
    }]
}));

watch(() => [props.motorScore, props.languageScore, props.socialScore], () => {
    console.log("props.socialScore", props.socialScore)
    if (chartRef.value && chartRef.value.chart) {
        chartRef.value.chart.setOption(option.value);
    }
    if (radarChartRef.value && radarChartRef.value.chart) {
        radarChartRef.value.chart.setOption(radarOption.value);
    }
});


const nodes = ref(null);
const markdownIt = MarkdownIt({
    typographer: true,
    linkify: true,
    html: true // 添加HTML支持
});

watchEffect(() => {
    if (props.analysisTextAI) {
        try {
            const tokens = markdownIt.parse(props.analysisTextAI, {}); // 移除.value
            nodes.value = parseTokens(tokens, markdownIt.options);
        } catch (e) {
            console.error('Markdown解析失败:', e);
            nodes.value = null;
        }
    }
});
// 根据报错信息，将analysisTextAI改为analysisText
const tokens = markdownIt.parse(props.analysisTextAI, {});
nodes.value = parseTokens(tokens, markdownIt.options);





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

.analysis-text-overall {
    color: #00214d;
    font-size: 14px;
    background-color: #f2f7f6;
    border-radius: 13px;
    padding: 12px;
    margin-top: 16px;

    h3,
    h4 {
        color: #00214d;
        margin: 12px 0;
    }

    ul,
    ol {
        padding-left: 20px;
    }

    li {
        margin: 6px 0;
    }

    strong {
        color: #0071F1;
    }
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
            // width: 20rpx;

        }
    }
}


.u-percentage-slot {
    padding: 1px 5px;
    background-color: $u-warning;
    color: #fff;
    border-radius: 100px;
    font-size: 12px;
    // margin-right: -1px;
    height: 17px;
    z-index: 999;
}

.analysis-section {
    margin-top: 24px;
}

.strength-section {
    background-color: rgba(110, 221, 138, 0.15);
    border-radius: 12px;
    padding: 16px;
}

.concern-section {
    background-color: rgba(255, 84, 112, 0.15);
    border-radius: 12px;
    padding: 16px;
    margin-top: 12px;
}

.section-header {
    color: #00214d;
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
    display: flex;
    align-items: center;
    gap: 4px;
}

.indicator {
    width: 4px;
    height: 12px;
    border-radius: 4px;
}

.strength {
    background-color: #00bf71;
}

.concern {
    background-color: #ff5470;
}

.analysis-item {
    margin-top: 16px;
}

.analysis-title {
    font-size: 12px;
    font-weight: 600;
    line-height: 20px;
}

.strength-section .analysis-title {
    color: #00bf71;
}

.concern-section .analysis-title {
    color: #ff5470;
}

.analysis-text {
    color: #00214d;
    font-size: 12px;
    line-height: 18px;
}

.chart-container {
    width: 100%;
    height: 400rpx;
    /* 设置固定高度 */
    position: relative;
    /* 确保图表容器定位正确 */
}

.chart-container-2 {
    width: 100%;
    height: 500rpx;
    /* 设置固定高度 */
    position: relative;
    /* 确保图表容器定位正确 */
}
</style>