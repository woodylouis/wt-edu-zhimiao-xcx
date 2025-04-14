<template>
    <view class="development-section">
        <view class="development-card">
            <view class="card-title">能力达标情况</view>
            <view class="capability-bar">
                <view class="chart-container">
                    <l-echart ref="chartRef" is-disable-scroll></l-echart>
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
        social: [0, 0, 0, 0, 23, 24] // 语言维度各阶阈值
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
const props = defineProps({
    motorScore: Number,
    languageScore: Number,
    socialScore: Number,
    displayName: String,
    analysisTextAI: String,
});
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

watch(() => [props.motorScore, props.languageScore], () => {
    if (chartRef.value && chartRef.value.chart) {
        chartRef.value.chart.setOption(option.value);
    }
});

onMounted(() => {
    setTimeout(async () => {
        if (!chartRef.value) return;
        const myChart = await chartRef.value.init(echarts);
        myChart.setOption(option.value);
    }, 300);
});



const nodes = ref(null);
const test = "### 分析↵↵赵子轩(4岁8个月)在粗大运动和精细动作方面表现良好，多数项目达标。粗大运动方面，存在向前步态异常、横向行走和飞奔困难；精细动作方面，存在剪刀使用、手指描线、胶水挤压和包装打开困难。语言模仿和自发表达表现优异，具备基础沟通能力。↵↵### 建议↵↵1. 粗大运动：建议进行步态分析和平衡训练，重点改善横向移动能力↵2. 精细动作：需加强手部工具使用训练，特别是剪刀操作和手指精细控制↵3. 语言能力：可进一步发展复杂句式表达和对话技巧↵4. 生活技能：需训练独立打开包装等日常自理能力↵↵### 干预计划↵↵1. 运动训练(每周3次，每次30分钟)：↵   - 平衡木横向行走练习↵   - 标志桶绕行训练改善步态↵   - 单脚站立延长时间至5秒↵↵2. 精细动作训练(每日15分钟)：↵   - 使用儿童安全剪刀进行直线裁剪↵   - 描红本描线练习↵   - 小珠子串线活动↵↵3. 生活技能训练(融入日常)：↵   - 分步骤练习包装打开↵   - 胶水挤压控制训练↵   - 书页翻动练习↵↵4. 语言强化(自然情境)：↵   - 扩展对话回合↵   - 引入描述性语言↵   - 鼓励提问互动↵↵建议每月评估进展，根据进步情况调整训练难度。家长应每日记录工具使用情况，强化课堂训练效果。"
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
</style>