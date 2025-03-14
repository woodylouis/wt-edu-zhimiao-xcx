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
        1: '能准确识别常见颜色、形状和声音',
        3: '对复杂信息处理需要更多时间',
        4: '偶尔会混淆相似形状或声音'
    },
    '社交': {
        1: '能主动与人互动交流',
        3: '社交互动时稍显被动',
        4: '需要鼓励才会参与互动'
    },
    '运动': {
        1: '动作协调性良好',
        3: '复杂动作完成稍慢',
        4: '需要指导完成精细动作'
    },
    '语言': {
        1: '语言表达清晰流畅',
        3: '词汇量正在发展中',
        4: '使用简单句子表达需求'
    },
    '自理': {
        1: '能独立完成日常事务',
        3: '需要少量提醒帮助',
        4: '需要较多生活协助'
    }
};

// 新增专业建议映射
// 简化专业建议
const professionalAdvice = {
    '感知': {
        3: '建议多进行观察类游戏',
        4: '可尝试拼图类益智玩具'
    },
    '社交': {
        3: '建议增加亲子互动游戏',
        4: '鼓励参与集体活动'
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