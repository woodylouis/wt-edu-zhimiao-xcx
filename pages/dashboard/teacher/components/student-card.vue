<template>
    <view class="student-card">
        <!-- 装饰圆点 -->
        <view class="deco-dot dot-1"></view>
        <view class="deco-dot dot-2"></view>
        <view class="deco-dot dot-3"></view>
        
        <!-- 头像区域 -->
        <view class="avatar-area">
            <view class="avatar-ring">
                <image class="avatar" :src="props.student.avatar" mode="aspectFill" />
            </view>
            <view class="star-badge">
                <text class="star">⭐</text>
            </view>
        </view>
        
        <!-- 信息区域 -->
        <view class="info-area">
            <text class="student-name">{{ props.student.name }}</text>
            <view class="stats-row">
                <view class="stat-item">
                    <text class="stat-icon">📅</text>
                    <text class="stat-text">{{ props.student.lastAssessmentDate }}</text>
                </view>
            </view>
            <view class="count-badge">
                <text class="count-text">{{ props.student.assessmentNumber }}</text>
            </view>
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
</script>

<style lang="scss" scoped>
.student-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 28rpx 20rpx 24rpx;
    background: linear-gradient(145deg, #FFFFFF 0%, #FFF9F0 100%);
    border-radius: 28rpx;
    box-shadow: 0 8rpx 24rpx rgba(255, 183, 77, 0.15),
                0 2rpx 6rpx rgba(0, 0, 0, 0.04);
    overflow: hidden;
    transition: all 0.25s ease;
    
    &:active {
        transform: scale(0.96);
        box-shadow: 0 4rpx 12rpx rgba(255, 183, 77, 0.2);
    }
    
    // 装饰圆点
    .deco-dot {
        position: absolute;
        border-radius: 50%;
        opacity: 0.6;
    }
    
    .dot-1 {
        width: 12rpx;
        height: 12rpx;
        background: #FFB74D;
        top: 16rpx;
        right: 20rpx;
    }
    
    .dot-2 {
        width: 8rpx;
        height: 8rpx;
        background: #81C784;
        top: 24rpx;
        right: 38rpx;
    }
    
    .dot-3 {
        width: 6rpx;
        height: 6rpx;
        background: #64B5F6;
        top: 12rpx;
        right: 50rpx;
    }
    
    // 头像区域
    .avatar-area {
        position: relative;
        margin-bottom: 16rpx;
        
        .avatar-ring {
            width: 100rpx;
            height: 100rpx;
            border-radius: 50%;
            padding: 6rpx;
            background: linear-gradient(135deg, #FFD54F 0%, #FF8A65 50%, #FF7043 100%);
            box-shadow: 0 4rpx 12rpx rgba(255, 138, 101, 0.3);
            
            .avatar {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                border: 4rpx solid #FFFFFF;
            }
        }
        
        .star-badge {
            position: absolute;
            bottom: -4rpx;
            right: -8rpx;
            width: 36rpx;
            height: 36rpx;
            background: #FFFFFF;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
            
            .star {
                font-size: 20rpx;
            }
        }
    }
    
    // 信息区域
    .info-area {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        
        .student-name {
            font-size: 30rpx;
            font-weight: 700;
            color: #3D3D3D;
            margin-bottom: 8rpx;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .stats-row {
            display: flex;
            align-items: center;
            margin-bottom: 12rpx;
            
            .stat-item {
                display: flex;
                align-items: center;
                gap: 4rpx;
                
                .stat-icon {
                    font-size: 22rpx;
                }
                
                .stat-text {
                    font-size: 22rpx;
                    color: #888;
                }
            }
        }
        
        .count-badge {
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #81C784 0%, #66BB6A 100%);
            padding: 8rpx 20rpx;
            border-radius: 24rpx;
            box-shadow: 0 2rpx 8rpx rgba(102, 187, 106, 0.3);
            
            .count-text {
                font-size: 22rpx;
                color: #FFFFFF;
                font-weight: 600;
                line-height: 1;
            }
        }
    }
}
</style>