<template>
    <!-- 导航 -->
    <view class="navigation" :style="navStyle">
        <view class="header" :style="xcxNameMarginTopStyle">
            <image class="back-arrow" src="/static/general/back.png" isBack />
            <view class="title">
                {{ xcxName }}
            </view>
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
        isBack: {
            type: Boolean,
            default: true,
        },
    },
    data() {
        return {
            xcxNameMarginTopStyle: '',
            navStyle: '',
        };

    },
    // 组件加载时执行
    mounted() {
        const menuButtonInfo = uni.getMenuButtonBoundingClientRect();
        this.xcxNameMarginTopStyle = `height:${menuButtonInfo.height}px;margin-top:${menuButtonInfo.top}px;`;
        // this.navStyle = `height:${menuButtonInfo.height * 3}px`;
        console.log('xcxNameMarginTopStyle', this.xcxNameMarginTopStyle)
        console.log('menuButtonInfo', menuButtonInfo)

    },

}

</script>
<style scoped lang="scss">
.navigation {
    height: calc(100vh / 8);
    // text-align: center;
    // flex-direction: column;
    // align-items: center;
    position: relative;
    background-color: #F2F7F6;
    display: flex;
    // justify-content: center; // 新增水平居中

    .header {
        display: flex;
        width: 100%;
        position: relative;
        justify-content: center;
        align-items: center;
        height: 100%;

        .title {
            z-index: 1;
            /* 移除margin-left */
            text-align: center; // 新增文本居中
            width: 100%; // 确保文本容器宽度
        }

        .back-arrow {
            width: 32rpx;
            height: 32rpx;
            position: absolute;
            left: 20rpx;
            top: 50%; // 垂直居中
            transform: translateY(-50%); // 精确居中
        }
    }

}
</style>