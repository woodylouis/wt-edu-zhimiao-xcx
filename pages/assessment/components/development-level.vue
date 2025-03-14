<template>
    <view class="development-section">
        <view class="development-card">
            <view class="card-title">整体发育水平</view>
            <view class="card-header">
                <view>
                    <view class="development-status" :style="{ color: statusColors.main }">
                        {{ developmentStatus }}
                    </view>
                    <view class="result-label">评估结果</view>

                </view>
                <view>
                    <image class="status-face" :src="statusImages.face" mode="scaleToFill" />
                </view>
            </view>
            <view class="progress-bar">
                <u-line-progress :percentage="percentage" :activeColor="statusColors.progress[0]" :inactiveColor="statusColors.progress[1]" :showText="false" :height="50" :borderRadius="12"></u-line-progress>
            </view>
            <view class="status-info">
                <view class="status-text">
                    <image class="status-icon" :src="statusImages.icon" mode="scaleToFill" />
                    <span>达到了</span>
                    <span class="highlight" :style="{ color: statusColors.main }">
                        阶段{{ level }}
                    </span>
                    <span>水平</span>
                </view>
            </view>
        </view>
    </view>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from "vue";

const statusIcon = ref('../images/serious-icon.png');

const props = defineProps({
    totalScore: {
        type: Number,
        default: 45
    }
});

// 新增图片路径计算
const statusImages = computed(() => {
    switch (developmentStatus.value) {
        case '正常':
            return {
                face: '../../../static/report/normal-face.png',
                icon: '../../../static/report/normal-icon.png'
            };
        case '需注意':
            return {
                face: '../../../static/report/warn-face.png',
                icon: '../../../static/report/warn-icon.png'
            };
        default:
            return {
                face: '../../../static/report/serious-face.png',
                icon: '../../../static/report/serious-icon.png'
            };
    }
});

// 阶段计算
const level = computed(() => {
    const s = props.totalScore;
    if (s >= 158) return 6;
    if (s >= 103) return 5;
    if (s >= 77) return 4;
    if (s >= 64) return 3;
    if (s >= 31) return 2;
    return 1; // 0-30分
});

// 进度百分比计算
const percentage = computed(() => {
    const s = props.totalScore;
    switch (level.value) {
        case 1: return 20;   // 阶段1固定100%
        case 2: return 30;    // 阶段2固定80%
        case 3: return 50;    // 阶段3固定60%
        case 4: return 70;    // 阶段4固定40%
        case 5: return 80;    // 阶段5固定20%
        case 6: return 90;      // 阶段6固定0%
        default: return 0;
    }
});

// 状态及颜色计算
const developmentStatus = computed(() => {
    const s = props.totalScore;
    if (s < 31) return '正常';
    if (s <= 53) return '需注意';
    return s <= 66 ? '警惕' : '严重';
});

const statusColors = computed(() => {
    switch (developmentStatus.value) {
        case '正常': return { main: '#00BF71', progress: ['#00BF71', '#D9F5EA'] };
        case '需注意': return { main: '#0C61F7', progress: ['#0C61F7', '#DBE7FE'] };
        default: return { main: '#FF5470', progress: ['#FF5470', '#FFE5EA'] };
    }
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
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
    margin-bottom: 10px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
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
    /* 新增水平居中 */
    gap: 8px;
    margin-top: 26rpx;
}

.status-icon {
    width: 16px;
    height: 16px;
    margin-right: 16rpx;
}

.status-text {
    color: #3d464a;
    font-size: 14px;
    line-height: 20px;
    display: flex;
}

.highlight {
    color: #00bf71;
    font-weight: bolder;
    margin-left: 4px;
    margin-right: 4px;
    font-size: 34rpx;
}

.status-face {
    width: 56px;
    height: 56px;
}
</style>