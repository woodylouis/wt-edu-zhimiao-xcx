<template>
    <view class="development-section">
        <view class="development-card">
            <view class="card-title">能力达标情况</view>
            <view class="analysis-text">
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

const analysisText = ref(`${props.displayName}的适应自理能力发育符合当前月龄宝宝的正常水平,语言能力落后于当前月龄宝宝的正常水平，需要注意`)

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

.analysis-text {
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
</style>