<template>
    <view class="student-card">
        <!-- 装饰圆点 -->
        <!-- <view class="deco-dot dot-1"></view>
        <view class="deco-dot dot-2"></view>
        <view class="deco-dot dot-3"></view>
         -->
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
            <view class="meta-row">
                <view class="date-tag">
                    <text class="date-icon">📅</text>
                    <text class="date-text">{{ props.student.lastAssessmentDate }}</text>
                </view>
                <view class="count-badge">
                    <text class="count-text">{{ props.student.assessmentNumber }}</text>
                </view>
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
    align-items: center;
    padding: 24rpx;
    background: linear-gradient(135deg, #FFFFFF 0%, #FFF9F0 50%, #FFF5E6 100%);
    border-radius: 24rpx;
    box-shadow: 0 6rpx 20rpx rgba(255, 183, 77, 0.15),
                0 2rpx 6rpx rgba(0, 0, 0, 0.04);
    overflow: hidden;
    transition: all 0.25s ease;
    
    &:active {
        transform: scale(0.97);
        box-shadow: 0 3rpx 10rpx rgba(255, 183, 77, 0.2);
    }
    
    // 装饰圆点
    .deco-dot {
        position: absolute;
        border-radius: 50%;
        opacity: 0.5;
    }
    
    .dot-1 {
        width: 40rpx;
        height: 40rpx;
        background: linear-gradient(135deg, #FFD54F 0%, #FFB74D 100%);
        top: -10rpx;
        right: 30rpx;
    }
    
    .dot-2 {
        width: 24rpx;
        height: 24rpx;
        background: linear-gradient(135deg, #81C784 0%, #66BB6A 100%);
        top: 20rpx;
        right: 80rpx;
    }
    
    .dot-3 {
        width: 16rpx;
        height: 16rpx;
        background: linear-gradient(135deg, #64B5F6 0%, #42A5F5 100%);
        bottom: 20rpx;
        right: 20rpx;
    }
    
    // 头像区域
    .avatar-area {
        position: relative;
        flex-shrink: 0;
        
        .avatar-ring {
            width: 88rpx;
            height: 88rpx;
            border-radius: 50%;
            padding: 5rpx;
            background: linear-gradient(135deg, #FFD54F 0%, #FF8A65 50%, #FF7043 100%);
            box-shadow: 0 4rpx 12rpx rgba(255, 138, 101, 0.35);
            
            .avatar {
                width: 100%;
                height: 100%;
                border-radius: 50%;
                border: 3rpx solid #FFFFFF;
            }
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
            
            .star {
                font-size: 18rpx;
            }
        }
    }
    
    // 信息区域
    .info-area {
        flex: 1;
        margin-left: 20rpx;
        min-width: 0;
        
        .student-name {
            display: block;
            font-size: 30rpx;
            font-weight: 700;
            color: #3D3D3D;
            margin-bottom: 10rpx;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .meta-row {
            display: flex;
            align-items: center;
            gap: 12rpx;
            
            .date-tag {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4rpx;
                background: rgba(255, 255, 255, 0.8);
                padding: 6rpx 12rpx;
                border-radius: 16rpx;
                
                .date-icon {
                    font-size: 18rpx;
                    line-height: 1;
                }
                
                .date-text {
                    font-size: 22rpx;
                    color: #888;
                    line-height: 1;
                }
            }
            
            .count-badge {
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #81C784 0%, #66BB6A 100%);
                padding: 6rpx 14rpx;
                border-radius: 16rpx;
                box-shadow: 0 2rpx 6rpx rgba(102, 187, 106, 0.3);
                
                .count-text {
                    font-size: 22rpx;
                    color: #FFFFFF;
                    font-weight: 600;
                    line-height: 1;
                }
            }
        }
    }
}
</style>