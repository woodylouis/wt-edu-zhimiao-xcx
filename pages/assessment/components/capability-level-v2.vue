<template>
    <view class="development-section">
        <view class="development-card">
            <view class="card-title">能力达标情况</view>
            <view class="capability-bar">
                <view class="bar">
                    <view class="title">感知</view>
                    <u-line-progress :percentage="ganzhijuePercentage" activeColor="#02C3FF" height="16">
                        <text class="u-percentage-slot"> {{ ganzhijueResult }} </text>
                    </u-line-progress>
                </view>
                <view class="bar">
                    <view class="title">社交</view>
                    <u-line-progress :percentage="shejiaoPercentage" activeColor="#9265FD" height="16">
                        <text class="u-percentage-slot"> {{ shejiaoResult }} </text>
                    </u-line-progress>
                </view>
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
                <view class="bar">
                    <view class="title">自理</view>
                    <u-line-progress :percentage="ziliPercentage" activeColor="#FF3ABB" height="16">
                        <text class="u-percentage-slot"> {{ ziliResult }} </text>
                    </u-line-progress>
                </view>
            </view>
            <view class="analysis-text-overall">
                <rich-text v-if="nodes" :nodes="nodes" :tag-style="{ p: 'margin: 8px 0; line-height: 1.6;' }" />
                <template v-else>
                    {{ analysisText }}
                </template>
            </view>
            <!-- <div class="analysis-section"> -->
            <!-- 优势领域 -->
            <!-- <div class="strength-section" v-if="strengthDimensions.length > 0">
                    <div class="section-header">
                        <span class="indicator strength"></span>
                        <span>优势领域</span>
                    </div>
                    <div class="analysis-item" v-for="dim in strengthDimensions" :key="dim">
                        <h4 class="analysis-title">{{ dim }}能力：</h4>
                        <p class="analysis-text">
                            {{ dimensionDetails[dim][1] }}（{{ dim }}1阶段）
                        </p>
                    </div>
                </div> -->

            <!-- 需要关注 -->
            <!-- <div class="concern-section" v-if="concernDimensions.length > 0">
                    <div class="section-header">
                        <span class="indicator concern"></span>
                        <span>需要关注</span>
                    </div>
                    <div class="analysis-item" v-for="item in concernDimensions" :key="item.name">
                        <h4 class="analysis-title">{{ item.name }}能力：</h4>
                        <p class="analysis-text">
                            {{ dimensionDetails[item.name][item.level] }}
                            <span class="professional-advice" v-if="professionalAdvice[item.name]?.[item.level]">
                                （{{ professionalAdvice[item.name][item.level] }}）
                            </span>
                        </p>
                    </div>
                </div> -->
            <!-- </div> -->
        </view>
    </view>
</template>

<script setup>
import { ref, computed, watchEffect } from "vue";
import { MarkdownIt, parseTokens } from "@/uni_modules/wtto-markdown/js_sdk/index";
import "@/uni_modules/wtto-markdown/js_sdk/markdown.css";

const props = defineProps({
    perceptionScore: Number,   // 感知维度得分
    socialScore: Number,       // 社交维度得分
    motorScore: Number,        // 运动维度得分
    languageScore: Number,     // 语言维度得分
    selfcareScore: Number,      // 自理维度得分
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
        '感知': ganzhijueLevel.value,
        '社交': shejiaoLevel.value,
        '运动': yundongLevel.value,
        '语言': yuyanLevel.value,
        '自理': ziliLevel.value
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
const ganzhijueLevel = computed(() => getLevel(props.perceptionScore, [4, 5, 10, 12, 16, 26]));
const shejiaoLevel = computed(() => getLevel(props.socialScore, [7, 8, 16, 19, 25, 38]));
const yundongLevel = computed(() => getLevel(props.motorScore, [7, 8, 16, 19, 25, 38]));
const yuyanLevel = computed(() => getLevel(props.languageScore, [4, 5, 10, 12, 16, 31]));
const ziliLevel = computed(() => getLevel(props.selfcareScore, [4, 5, 10, 12, 16, 25]));

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
const ganzhijuePercentage = computed(() => levelPercentage[ganzhijueLevel.value]);
const shejiaoPercentage = computed(() => levelPercentage[shejiaoLevel.value]);
const yundongPercentage = computed(() => levelPercentage[yundongLevel.value]);
const yuyanPercentage = computed(() => levelPercentage[yuyanLevel.value]);
const ziliPercentage = computed(() => levelPercentage[ziliLevel.value]);

// 结果文本
const ganzhijueResult = computed(() => `${ganzhijueLevel.value}阶`);
const shejiaoResult = computed(() => `${shejiaoLevel.value}阶`);
const yundongResult = computed(() => `${yundongLevel.value}阶`);
const yuyanResult = computed(() => `${yuyanLevel.value}阶`);
const ziliResult = computed(() => `${ziliLevel.value}阶`);

// 新增阶段分类逻辑
const strengthDimensions = computed(() => {
    return Object.entries({
        '感知': ganzhijueLevel.value,
        '社交': shejiaoLevel.value,
        '运动': yundongLevel.value,
        '语言': yuyanLevel.value,
        '自理': ziliLevel.value
    }).filter(([_, level]) => level === 1)
        .map(([name]) => name);
});

const concernDimensions = computed(() => {
    return Object.entries({
        '感知': ganzhijueLevel.value,
        '社交': shejiaoLevel.value,
        '运动': yundongLevel.value,
        '语言': yuyanLevel.value,
        '自理': ziliLevel.value
    }).filter(([_, level]) => level >= 3)
        .map(([name, level]) => ({ name, level }));
});

// 阶段描述映射
const levelDescriptions = {
    6: {
        type: '优势领域',
        text: '表现优于同龄平均水平'
    },
    3: {
        type: '需关注',
        text: '略低于同龄平均水平'
    },
    2: {
        type: '明显落后',
        text: '明显低于同龄水平'
    },
    1: {
        type: '严重落后',
        text: '远低于发展里程碑'
    }
};

const dimensionDetails = {
    '感知': {
        6: '能准确识别常见颜色和形状；对日常声音反应迅速；喜欢观察细节',
        5: '能区分基本几何图形；对音量变化敏感；开始注意环境变化',
        4: '处理复杂信息较慢；需要重复指令；容易分心',
        3: '偶尔混淆相似形状；方向感较弱；多任务处理困难',
        2: '经常认错常见物品；对视觉提示反应迟钝',
        1: '基础感官识别障碍；需要专业干预训练'
    },
    '社交': {
        6: '主动发起游戏；能维持眼神交流；理解轮流规则',
        5: '喜欢模仿他人；能简单回应问候；开始分享玩具',
        4: '互动需要引导；眼神交流短暂；理解简单规则',
        3: '回避集体活动；社交主动性不足；需明确指令',
        2: '极少主动交流；难以维持对话；社交焦虑明显',
        1: '完全回避互动；需要行为干预计划'
    },
    '运动': {
        6: '能单脚跳3步以上；熟练使用餐具；接球反应快',
        5: '双脚跳协调；会使用剪刀；能画简单图形',
        4: '平衡能力待加强；精细动作稍慢；需分解步骤',
        3: '经常摔倒；书写困难；动作计划能力弱',
        2: '基础移动能力不足；需要辅助工具',
        1: '运动功能严重受限；需康复治疗'
    },
    '语言': {
        6: '使用复合句表达；词汇量丰富；发音清晰',
        5: '会说4-5词句子；能简单描述事件',
        4: '词汇量正在积累；偶尔语法错误；表达简短',
        3: '主要使用单词沟通；长句理解困难',
        2: '语言理解明显落后；交流以手势为主',
        1: '功能性语言缺失；需言语治疗评估'
    },
    '自理': {
        6: '独立穿衣吃饭；如厕控制良好；整理个人物品',
        5: '会穿简单衣物；自主进食干净；提醒下如厕',
        4: '需要步骤提示；用餐时间较长；偶尔小意外',
        3: '完全依赖协助；如厕事故频繁；进食困难',
        2: '生活完全不能自理；需要持续看护',
        1: '基本生存技能缺失；需专业护理支持'
    }
};

// 新增专业建议映射
// 简化专业建议
const professionalAdvice = {
    '感知': {
        4: '多玩找不同游戏，练习颜色形状配对',
        3: '尝试拼图游戏，从4片开始逐步增加',
        2: '建议进行专业感统训练评估',
        1: '立即预约儿科发育行为专科'
    },
    '社交': {
        4: '每天安排30分钟亲子互动时间',
        3: '鼓励参与同龄人游戏小组',
        2: '建议进行社交能力专项评估',
        1: '需发育行为科专家会诊'
    },
    '运动': {
        4: '每天练习单脚跳和抛接球',
        3: '用夹子夹豆子练习精细动作',
        2: '建议进行运动功能评估',
        1: '立即进行神经运动发育检查'
    },
    '语言': {
        4: '每天亲子共读并提问互动',
        3: '鼓励用短句表达需求',
        2: '建议进行语言发育评估',
        1: '需耳鼻喉科及言语治疗联合评估'
    },
    '自理': {
        4: '制定穿衣穿鞋分步练习计划',
        3: '用模拟餐具进行用餐练习',
        2: '建议进行生活技能评估',
        1: '需儿童康复科专业指导'
    }
};
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