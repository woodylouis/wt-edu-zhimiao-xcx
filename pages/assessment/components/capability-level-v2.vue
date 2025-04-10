<template>
    <view class="development-section">
        <view class="development-card">
            <view class="card-title">能力达标情况</view>
            <view class="capability-bar">
                <view class="bar">

                    <view class="bar">
                        <view class="title">运动</view>
                        <u-line-progress :percentage="yundongPercentage" activeColor="#0071F1" height="16">
                            <text class="u-percentage-slot"> {{ yundongResult }} </text>
                        </u-line-progress>
                    </view>
                    <view class="bar">
                        <view class="title">语言</view>
                        <u-line-progress :percentage="yuyanPercentage" activeColor="#FF960C" height="16">
                            <text class="u-percentage-slot"> {{ yuyanResult }} </text>
                        </u-line-progress>
                    </view>
                </view>
                <view class="analysis-text-overall">
                    <rich-text v-if="nodes" :nodes="nodes" :tag-style="{ p: 'margin: 8px 0; line-height: 1.6;' }" />
                    <template v-else>
                        {{ analysisText }}
                    </template>
                </view>

            </view>
        </view>
</template>

<script setup>
import { ref, computed, watchEffect } from "vue";
import { MarkdownIt, parseTokens } from "@/uni_modules/wtto-markdown/js_sdk/index";
import "@/uni_modules/wtto-markdown/js_sdk/markdown.css";

const props = defineProps({

    motorScore: Number,        // 运动维度得分
    languageScore: Number,     // 语言维度得分
    displayName: String,
    analysisTextAI: String,
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
const analysisText = computed(() => {
    // 获取各维度阶段值
    const levels = {

        '运动': yundongLevel.value,
        '语言': yuyanLevel.value,
    };

    // 筛选各阶段维度
    const laggingDimensions = Object.entries(levels)
        .filter(([_, level]) => level >= 3);

    if (laggingDimensions.length === 0) {
        return `经评估，${props.displayName}在五大能区发育商数均处于同龄常模范围（±1SD），发展轨迹正常。`;
    }

    // 专业分级描述
    const severityLevel = {
        1: '可能需要注意',
        2: '可能需要注意',
        3: '可能需要注意',
        4: '可能需要注意'
    };

    // 构建专业描述
    const dimensionDesc = laggingDimensions.map(([name, level]) =>
        `${name}能区（${severityLevel[level]}）`
    ).join('、');

    const severityText = laggingDimensions.some(([_, l]) => l >= 5) ?
        '建议结合专项训练及定期发育监测' :
        '建议加强日常训练并观察进展';

    return `发育评估显示：${props.displayName}在${dimensionDesc}。${severityText}，必要时可进行标准化发育量表复核评估。`;
});
// 通用阶段计算函数
const getLevel = (score, ranges) => {
    if (score >= ranges[5]) return 1;
    if (score >= ranges[4]) return 2;
    if (score >= ranges[3]) return 3;
    if (score >= ranges[2]) return 4;
    if (score >= ranges[1]) return 5;
    return 6;
};

// 各维度阶段计算
const yundongLevel = computed(() => getLevel(props.motorScore, [7, 8, 16, 19, 25, 38]));
const yuyanLevel = computed(() => getLevel(props.languageScore, [4, 5, 10, 12, 16, 31]));

// 阶段到百分比的映射
const levelPercentage = {
    1: 16,
    2: 32,
    3: 48,
    4: 64,
    5: 80,
    6: 100
};

// 各维度百分比计算

const yundongPercentage = computed(() => levelPercentage[yundongLevel.value]);
const yuyanPercentage = computed(() => levelPercentage[yuyanLevel.value]);

// 结果文本

const yundongResult = computed(() => `${yundongLevel.value}阶`);
const yuyanResult = computed(() => `${yuyanLevel.value}阶`);


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
</style>