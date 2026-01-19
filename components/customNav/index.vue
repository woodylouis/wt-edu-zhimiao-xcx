<template>
    <!-- 导航 -->
    <view class="navigation" :style="navCustomStyle">
        <!-- 装饰元素 -->
        <view class="deco-circles">
            <view class="circle c1"></view>
            <view class="circle c2"></view>
            <!-- <view class="circle c3"></view> -->
            <view class="circle c4"></view>
        </view>
        
        <view class="header" :style="xcxNameMarginTopStyle">
            <!-- 返回按钮 -->
            <view class="back-wrap" @click.stop="handleBack" v-if="needBack">
                <view class="back-btn">
                    <image class="back-arrow" src="/static/general/back.png" mode="aspectFit" />
                </view>
            </view>
            <view class="title-wrap">
                <text class="title">{{ xcxName }}</text>
                <view class="title-underline"></view>
            </view>
        </view>
        
        <!-- 底部波浪装饰 -->
        <view v-if="needBar" class="wave-decoration">
            <view class="wave"></view>
        </view>
    </view>
</template>

<script>
export default {
    props: {
        xcxName: {
            type: String,
            default: "创建班级",
        },
        needBack: {
            type: Boolean,
            default: false,
        },
        needBar: {
            type: Boolean,
            default: true,
        },
        backHandler: {
            type: Function,
            default: null
        },
        navCustomStyle: {
            type: String,
            default: ''
        }
    },
    data() {
        return {
            xcxNameMarginTopStyle: '',
            navStyle: '',
        };
    },
    mounted() {
        const menuButtonInfo = uni.getMenuButtonBoundingClientRect();
        this.xcxNameMarginTopStyle = `height:${menuButtonInfo.height}px;margin-top:${menuButtonInfo.top}px;`;
    },
    methods: {
        handleBack() {
            if (this.backHandler) {
                this.backHandler()
            } else {
                uni.navigateBack()
            }
        }
    },
}
</script>

<style scoped lang="scss">
.navigation {
    height: calc(100vh / 7);
    position: relative;
    background: linear-gradient(135deg, #FFF9E6 0%, #FFE4D6 50%, #E8F5E9 100%);
    display: flex;
    overflow: hidden;
    
    // 装饰圆圈
    .deco-circles {
        position: absolute;
        width: 100%;
        height: 100%;
        pointer-events: none;
        
        .circle {
            position: absolute;
            border-radius: 50%;
            opacity: 0.4;
        }
        
        .c1 {
            width: 120rpx;
            height: 120rpx;
            background: linear-gradient(135deg, #FFD54F 0%, #FFB74D 100%);
            top: -30rpx;
            right: 60rpx;
        }
        
        .c2 {
            width: 80rpx;
            height: 80rpx;
            background: linear-gradient(135deg, #81C784 0%, #66BB6A 100%);
            top: 20rpx;
            right: 160rpx;
        }
        
        .c3 {
            width: 60rpx;
            height: 60rpx;
            background: linear-gradient(135deg, #64B5F6 0%, #42A5F5 100%);
            bottom: 40rpx;
            left: 40rpx;
        }
        
        .c4 {
            width: 40rpx;
            height: 40rpx;
            background: linear-gradient(135deg, #FF8A65 0%, #FF7043 100%);
            top: 30rpx;
            left: 120rpx;
        }
    }

    .header {
        display: flex;
        width: 100%;
        position: relative;
        justify-content: center;
        align-items: center;
        height: 100%;
        z-index: 10;

        .back-wrap {
            position: absolute;
            left: 24rpx;
            top: 50%;
            transform: translateY(-50%);
            z-index: 10;
            
            .back-btn {
                width: 64rpx;
                height: 64rpx;
                background: rgba(255, 255, 255, 0.9);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4rpx 12rpx rgba(255, 183, 77, 0.25);
                transition: all 0.2s ease;
                
                &:active {
                    transform: scale(0.92);
                    background: rgba(255, 255, 255, 1);
                }
                
                .back-arrow {
                    width: 28rpx;
                    height: 28rpx;
                }
            }
        }

        .title-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            
            .title {
                font-size: 36rpx;
                font-weight: 700;
                color: #3D3D3D;
                letter-spacing: 2rpx;
            }
            
            .title-underline {
                margin-top: 8rpx;
                width: 48rpx;
                height: 6rpx;
                background: linear-gradient(90deg, #FFB74D 0%, #FF8A65 100%);
                border-radius: 6rpx;
            }
        }
    }

    // 波浪装饰
    .wave-decoration {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 28rpx;
        z-index: 5;
        
        .wave {
            width: 100%;
            height: 100%;
            background: #FFFFFF;
            border-radius: 40rpx 40rpx 0 0;
            box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.03);
        }
    }
}
</style>