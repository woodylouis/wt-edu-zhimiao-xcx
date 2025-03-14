<template>
    <view class="development-section">
        <view class="development-card">
            <view class="card-title">能力达标情况</view>
            <view class="analysis-text-overall">
                {{ analysisText }}
            </view>
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
            <div class="analysis-section">
                <!-- 优势领域 -->
                <div class="strength-section" v-if="strengthDimensions.length > 0">
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
                </div>

                <!-- 需要关注 -->
                <div class="concern-section" v-if="concernDimensions.length > 0">
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
                </div>
            </div>
        </view>
    </view>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
    perceptionScore: Number,   // 感知维度得分
    socialScore: Number,       // 社交维度得分
    motorScore: Number,        // 运动维度得分
    languageScore: Number,     // 语言维度得分
    selfcareScore: Number,      // 自理维度得分
    displayName: String
});

const analysisText = computed(() => {
    // 获取各维度阶段值
    const levels = {
        '感知': ganzhijueLevel.value,
        '社交': shejiaoLevel.value,
        '运动': yundongLevel.value,
        '语言': yuyanLevel.value,
        '自理': ziliLevel.value
    };

    // 筛选阶段≥3的维度
    const laggingDimensions = Object.entries(levels)
        .filter(([_, level]) => level >= 3)
        .map(([name]) => name);

    // 构造描述语句
    if (laggingDimensions.length === 0) {
        return `${props.displayName}的五大能力维度发育均符合当前月龄宝宝的正常水平`;
    }

    const normalText = `${props.displayName}的${laggingDimensions.join('、')}能力`;
    const laggingText = laggingDimensions.length > 1 ? '等方面' : '方面';

    return `${normalText}${laggingText}落后于当前月龄宝宝的正常水平，需要特别关注并加强训练`;
});
// 通用阶段计算函数
const getLevel = (score, ranges) => {
    if (score >= ranges[5]) return 6;
    if (score >= ranges[4]) return 5;
    if (score >= ranges[3]) return 4;
    if (score >= ranges[2]) return 3;
    if (score >= ranges[1]) return 2;
    return 1;
};

// 各维度阶段计算
const ganzhijueLevel = computed(() => getLevel(props.perceptionScore, [4, 5, 10, 12, 16, 26]));
const shejiaoLevel = computed(() => getLevel(props.socialScore, [7, 8, 16, 19, 25, 38]));
const yundongLevel = computed(() => getLevel(props.motorScore, [7, 8, 16, 19, 25, 38]));
const yuyanLevel = computed(() => getLevel(props.languageScore, [4, 5, 10, 12, 16, 31]));
const ziliLevel = computed(() => getLevel(props.selfcareScore, [4, 5, 10, 12, 16, 25]));

// 阶段到百分比的映射
const levelPercentage = {
    1: 20,
    2: 30,
    3: 50,
    4: 70,
    5: 80,
    6: 90
};

// 各维度百分比计算
const ganzhijuePercentage = computed(() => levelPercentage[ganzhijueLevel.value]);
const shejiaoPercentage = computed(() => levelPercentage[shejiaoLevel.value]);
const yundongPercentage = computed(() => levelPercentage[yundongLevel.value]);
const yuyanPercentage = computed(() => levelPercentage[yuyanLevel.value]);
const ziliPercentage = computed(() => levelPercentage[ziliLevel.value]);

// 结果文本
const ganzhijueResult = computed(() => `${ganzhijueLevel.value}阶段`);
const shejiaoResult = computed(() => `${shejiaoLevel.value}阶段`);
const yundongResult = computed(() => `${yundongLevel.value}阶段`);
const yuyanResult = computed(() => `${yuyanLevel.value}阶段`);
const ziliResult = computed(() => `${ziliLevel.value}阶段`);

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
    1: {
        type: '优势领域',
        text: '表现优于同龄平均水平'
    },
    3: {
        type: '需关注',
        text: '略低于同龄平均水平'
    },
    4: {
        type: '明显落后',
        text: '明显低于同龄水平'
    },
    5: {
        type: '严重落后',
        text: '远低于发展里程碑'
    }
};

const dimensionDetails = {
    '感知': {
        1: '能准确识别常见颜色和形状；对日常声音反应迅速；喜欢观察细节',
        2: '能区分基本几何图形；对音量变化敏感；开始注意环境变化',
        3: '处理复杂信息较慢；需要重复指令；容易分心',
        4: '偶尔混淆相似形状；方向感较弱；多任务处理困难',
        5: '经常认错常见物品；对视觉提示反应迟钝',
        6: '基础感官识别障碍；需要专业干预训练'
    },
    '社交': {
        1: '主动发起游戏；能维持眼神交流；理解轮流规则',
        2: '喜欢模仿他人；能简单回应问候；开始分享玩具',
        3: '互动需要引导；眼神交流短暂；理解简单规则',
        4: '回避集体活动；社交主动性不足；需明确指令',
        5: '极少主动交流；难以维持对话；社交焦虑明显',
        6: '完全回避互动；需要行为干预计划'
    },
    '运动': {
        1: '能单脚跳3步以上；熟练使用餐具；接球反应快',
        2: '双脚跳协调；会使用剪刀；能画简单图形',
        3: '平衡能力待加强；精细动作稍慢；需分解步骤',
        4: '经常摔倒；书写困难；动作计划能力弱',
        5: '基础移动能力不足；需要辅助工具',
        6: '运动功能严重受限；需康复治疗'
    },
    '语言': {
        1: '使用复合句表达；词汇量丰富；发音清晰',
        2: '会说4-5词句子；能简单描述事件',
        3: '词汇量正在积累；偶尔语法错误；表达简短',
        4: '主要使用单词沟通；长句理解困难',
        5: '语言理解明显落后；交流以手势为主',
        6: '功能性语言缺失；需言语治疗评估'
    },
    '自理': {
        1: '独立穿衣吃饭；如厕控制良好；整理个人物品',
        2: '会穿简单衣物；自主进食干净；提醒下如厕',
        3: '需要步骤提示；用餐时间较长；偶尔小意外',
        4: '完全依赖协助；如厕事故频繁；进食困难',
        5: '生活完全不能自理；需要持续看护',
        6: '基本生存技能缺失；需专业护理支持'
    }
};

// 新增专业建议映射
// 简化专业建议
const professionalAdvice = {
    '感知': {
        3: '多玩找不同游戏，练习颜色形状配对',
        4: '尝试拼图游戏，从4片开始逐步增加',
        5: '建议进行专业感统训练评估',
        6: '立即预约儿科发育行为专科'
    },
    '社交': {
        3: '每天安排30分钟亲子互动时间',
        4: '鼓励参与同龄人游戏小组',
        5: '建议进行社交能力专项评估',
        6: '需发育行为科专家会诊'
    },
    '运动': {
        3: '每天练习单脚跳和抛接球',
        4: '用夹子夹豆子练习精细动作',
        5: '建议进行运动功能评估',
        6: '立即进行神经运动发育检查'
    },
    '语言': {
        3: '每天亲子共读并提问互动',
        4: '鼓励用短句表达需求',
        5: '建议进行语言发育评估',
        6: '需耳鼻喉科及言语治疗联合评估'
    },
    '自理': {
        3: '制定穿衣穿鞋分步练习计划',
        4: '用模拟餐具进行用餐练习',
        5: '建议进行生活技能评估',
        6: '需儿童康复科专业指导'
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
    font-size: 10px;
    margin-right: -5px;
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