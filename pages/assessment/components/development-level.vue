<template>
    <view class="development-section">
        <view class="development-card">
            <view class="card-title">整体发育水平</view>
            <view class="development-status">正常</view>
            <view class="result-label">评估结果</view>
            <view class="progress-bar">
                <u-line-progress :percentage="30" activeColor="#00BF71" inactiveColor="#D9F5EA" :showText="false" :height="50" :borderRadius="12"></u-line-progress>
            </view>
            <view class="status-info">
                <view class="status-text">
                    <span>达到了</span><span class="highlight">24-26</span><span>月龄的发育水平</span>
                </view>
            </view>
        </view>
    </view>
</template>

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
}
</style>