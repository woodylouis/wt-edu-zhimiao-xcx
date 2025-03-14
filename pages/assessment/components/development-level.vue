<template>
    <view class="development-section">
        <view class="development-card">
            <view class="card-title">整体发育水平</view>
            <view class="development-status" :style="{ color: statusColor }">
                {{ developmentStatus }}
            </view>
            <view class="result-label">评估结果</view>
            <view class="progress-bar">
                <u-line-progress :percentage="percentage" activeColor="#00BF71" inactiveColor="#D9F5EA" :showText="false" :height="50" :borderRadius="12"></u-line-progress>
            </view>
            <view class="status-info">
                <view class="status-text">
                    <span>本次评估达到了</span><span class="highlight"> {{ level }} </span><span>阶水平</span>
                </view>
            </view>
        </view>
    </view>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from "vue";

const props = defineProps({
    score: {
        type: Number,
        default: 55
    }
});

// 阶段计算逻辑
const level = computed(() => {
    if (props.score === 0) return 1;
    if (props.score <= 32) return 2;
    if (props.score <= 64) return 3;
    if (props.score <= 77) return 4;
    if (props.score <= 102) return 5;
    return 6;
});

// 进度百分比计算
const percentage = computed(() => {
    switch (level.value) {
        case 1: return 100;
        case 2: return (props.score / 31) * 100;
        case 3: return ((props.score - 32) / 33) * 100; // 32-64分区间共33分
        case 4: return ((props.score - 65) / 13) * 100; // 65-77分区间共13分
        case 5: return ((props.score - 78) / 25) * 100; // 78-102分区间共25分
        case 6: return ((props.score - 103) / 56) * 100; // 103-158分区间共56分
        default: return 0;
    }
});

// 发育状态及颜色
// 拆分状态计算为独立函数
const getStatusInfo = (score) => {
    if (score <= 30) return ['正常', '#00BF71'];
    if (score <= 53) return ['需注意', '#0C61F7'];
    if (score <= 66) return ['警惕', '#FF0000'];
    return ['严重', '#8B0000'];
};

// 调整计算属性
const developmentStatus = computed(() => getStatusInfo(props.score)[0]);
const statusColor = computed(() => getStatusInfo(props.score)[1]);
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
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
}

.development-status {
    color: #00bf71;
    font-size: 24px;
    font-weight: 600;
    line-height: 28px;
    margin-top: 8px;
}

.result-label {
    color: #3d464a;
    font-size: 14px;
    line-height: 20px;
    margin-top: 8px;
}

.progress-bar {
    position: relative;
    width: 100%;
    height: 48px;
    margin-top: 8px;
}

.progress-bg {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 12px;
}



.status-info {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
}

.status-icon {
    width: 16px;
    height: 16px;
}

.status-text {
    color: #3d464a;
    font-size: 14px;
    line-height: 20px;
}

.highlight {
    color: #00bf71;
    font-weight: bolder;
    margin-left: 4px;
    margin-right: 4px;
    font-size: 36rpx;
}
</style>