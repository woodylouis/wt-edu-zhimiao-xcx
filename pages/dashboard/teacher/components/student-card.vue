<template>
    <view class="student-card">
        <!-- 头像区域 -->
        <view class="avatar-area">
            <view class="avatar-ring">
                <image class="avatar" :src="student.avatar" mode="aspectFill" />
            </view>
            <view class="star-badge">
                <text class="star">⭐</text>
            </view>
        </view>
        
        <!-- 信息区域 -->
        <view class="info-area">
            <view class="name-row">
                <text class="student-name">{{ student.name }}</text>
                <view v-if="student.isNew" class="new-tag">
                    <text class="new-tag-text">刚刚创建</text>
                </view>
            </view>
            <view class="meta-row">
                <view class="date-tag">
                    <text class="date-icon">📅</text>
                    <text class="date-text">{{ student.lastAssessmentDate }}</text>
                </view>
                <view class="count-badge">
                    <text class="count-text">{{ student.assessmentNumber }}</text>
                </view>
            </view>
        </view>
        
        <!-- 操作按钮区域 -->
        <view class="action-area">
            <button class="action-btn report-btn" hover-class="action-btn--pressed" @click="handleReportClick">
                <text class="btn-icon">📊</text>
            </button>
            <button class="action-btn assess-btn" hover-class="action-btn--pressed" @click="handleAssessClick">
                <text class="btn-icon">✍️</text>
            </button>
        </view>
    </view>
</template>

<script setup>
const props = defineProps({
    student: {
        type: Object,
        required: true,
        default: () => ({
            avatar: 'https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/girl.png',
            name: '李思思',
            lastAssessmentDate: '3月22日',
            assessmentNumber: '共6次'
        })
    }
});

const emit = defineEmits(['reportClick', 'assessClick']);

const handleReportClick = () => {
    console.log('student-card: 点击查看报告');
    emit('reportClick');
};

const handleAssessClick = () => {
    console.log('student-card: 点击开始评估');
    emit('assessClick');
};
</script>

<style lang="scss" scoped>
.student-card {
    position: relative;
    display: flex;
    align-items: center;
    padding: 24rpx;
    background: linear-gradient(135deg, #FFFFFF 0%, #FFF9F0 50%, #FFF5E6 100%);
    border-radius: 24rpx;
    box-shadow: 0 6rpx 20rpx rgba(255, 183, 77, 0.15),
                0 2rpx 6rpx rgba(0, 0, 0, 0.04);
    overflow: visible;
}

// 头像区域
.avatar-area {
    position: relative;
    flex-shrink: 0;
}

.avatar-ring {
    width: 88rpx;
    height: 88rpx;
    border-radius: 50%;
    padding: 5rpx;
    background: linear-gradient(135deg, #FFD54F 0%, #FF8A65 50%, #FF7043 100%);
    box-shadow: 0 4rpx 12rpx rgba(255, 138, 101, 0.35);
}

.avatar {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 3rpx solid #FFFFFF;
}

.star-badge {
    position: absolute;
    bottom: -2rpx;
    right: -6rpx;
    width: 32rpx;
    height: 32rpx;
    background: #FFFFFF;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.12);
}

.star {
    font-size: 18rpx;
}

// 信息区域
.info-area {
    flex: 1;
    margin-left: 20rpx;
    min-width: 0;
}

.name-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 10rpx;
}

.student-name {
    font-size: 30rpx;
    font-weight: 700;
    color: #3D3D3D;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 200rpx;
}

.new-tag {
    background: rgba(255, 112, 67, 0.1);
    border: 1rpx solid rgba(255, 112, 67, 0.3);
    padding: 2rpx 12rpx;
    border-radius: 8rpx;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32rpx;
}

.new-tag-text {
    font-size: 18rpx;
    color: #FF7043;
    font-weight: 600;
    line-height: 1;
}

.meta-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
}

.date-tag {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4rpx;
    background: rgba(255, 255, 255, 0.8);
    padding: 6rpx 12rpx;
    border-radius: 16rpx;
}

.date-icon {
    font-size: 18rpx;
    line-height: 1;
}

.date-text {
    font-size: 22rpx;
    color: #888;
    line-height: 1;
}

.count-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #81C784 0%, #66BB6A 100%);
    padding: 6rpx 14rpx;
    border-radius: 16rpx;
    box-shadow: 0 2rpx 6rpx rgba(102, 187, 106, 0.3);
}

.count-text {
    font-size: 22rpx;
    color: #FFFFFF;
    font-weight: 600;
    line-height: 1;
}

// 操作按钮区域
.action-area {
    display: flex;
    flex-direction: column;
    gap: 12rpx;
    flex-shrink: 0;
    margin-left: 16rpx;
}

.action-btn {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    padding: 0;
    margin: 0;
    line-height: 1;
    
    &::after {
        border: none;
    }
}

.btn-icon {
    font-size: 28rpx;
    line-height: 1;
}

.report-btn {
    background: linear-gradient(135deg, #64B5F6 0%, #42A5F5 100%);
    box-shadow: 0 2rpx 8rpx rgba(66, 165, 245, 0.35);
}

.assess-btn {
    background: linear-gradient(135deg, #FFB74D 0%, #FF9800 100%);
    box-shadow: 0 2rpx 8rpx rgba(255, 152, 0, 0.35);
}
</style>

<style lang="scss" scoped>
.student-card {
    min-height: 162rpx;
    padding: 24rpx 22rpx;
    border: 4rpx solid #392f59;
    border-radius: 32rpx;
    background: linear-gradient(135deg, #fff 0%, #fffaf0 100%);
    box-shadow: 8rpx 8rpx 0 #ffd447;

    &::before {
        content: '';
        position: absolute;
        top: -18rpx;
        right: 132rpx;
        width: 48rpx;
        height: 30rpx;
        border: 3rpx solid #392f59;
        border-radius: 50%;
        background: #ff8f82;
        transform: rotate(-12deg);
    }
}

.avatar-ring {
    width: 92rpx;
    height: 92rpx;
    padding: 5rpx;
    border: 4rpx solid #392f59;
    background: #a58bff;
    box-shadow: 5rpx 5rpx 0 #ff8f82;
    box-sizing: border-box;
}

.avatar {
    border: 3rpx solid #fff;
    box-sizing: border-box;
}

.star-badge {
    right: -8rpx;
    bottom: -5rpx;
    width: 36rpx;
    height: 36rpx;
    border: 3rpx solid #392f59;
    background: #79dfc2;
    box-shadow: none;
}

.info-area {
    margin-left: 22rpx;
}

.student-name {
    max-width: 190rpx;
    color: #31284f;
    font-size: 31rpx;
    font-weight: 900;
}

.new-tag {
    height: 34rpx;
    padding: 2rpx 12rpx;
    border: 2rpx solid #392f59;
    border-radius: 999rpx;
    background: #ffb6ad;
}

.new-tag-text {
    color: #392f59;
    font-weight: 900;
}

.date-tag {
    padding: 7rpx 12rpx;
    border: 2rpx solid #392f59;
    border-radius: 999rpx;
    background: #eee9ff;
}

.date-text {
    color: #625a79;
    font-weight: 700;
}

.count-badge {
    padding: 7rpx 13rpx;
    border: 2rpx solid #392f59;
    border-radius: 999rpx;
    background: #79dfc2;
    box-shadow: none;
}

.count-text {
    color: #392f59;
    font-weight: 900;
}

.action-area {
    gap: 14rpx;
    margin-left: 12rpx;
}

.action-btn {
    width: 66rpx;
    height: 66rpx;
    border: 3rpx solid #392f59;
    border-radius: 21rpx;
    box-shadow: 4rpx 4rpx 0 #392f59;
}

.action-btn--pressed {
    transform: translate(3rpx, 3rpx);
    box-shadow: 1rpx 1rpx 0 #392f59;
}

.report-btn {
    background: #a58bff;
}

.assess-btn {
    background: #ffd447;
}
</style>
