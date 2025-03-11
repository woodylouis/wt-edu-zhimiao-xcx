<template>
    <!-- 导航 -->
    <view class="navigation" :style="navStyle">
        <view class="header" :style="xcxNameMarginTopStyle">
            <!-- 添加点击区域并调整层级 -->
            <view class="back-wrap" @click.stop="handleBack" v-if="needBack">
                <image class="back-arrow" src="/static/general/back.png" />
            </view>
            <view class="title">
                {{ xcxName }}
            </view>
        </view>
        <view class="decoration-bar"></view>
    </view>
</template>

<style scoped lang="scss">
.back-wrap {
    position: absolute;
    left: 20rpx;
    top: 50%;
    transform: translateY(-50%);
    padding: 20rpx;
    z-index: 2; // 提升层级
    
    .back-arrow {
        width: 32rpx;
        height: 32rpx;
    }
}
</style>

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
        backHandler: {
            type: Function,
            default: null
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
    },
    methods: {
        handleBack() {
            if (this.backHandler) {
                // 执行自定义返回逻辑
                this.backHandler()
            } else {
                // 默认返回行为
                uni.navigateBack()
            }
        }
    },

}

</script>
<style scoped lang="scss">
.navigation {
    height: calc(100vh / 7);
    // text-align: center;
    // flex-direction: column;
    // align-items: center;
    position: relative;
    background-color: #F2F7F6;
    display: flex;
    // justify-content: center; // 新增水平居中
    position: relative;

    .header {
        display: flex;
        width: 100%;
        position: relative;
        justify-content: center;
        align-items: center;
        height: 100%;
        z-index: 1; // 确保在header下方

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

    .decoration-bar {
        position: absolute;
        bottom: 0; // 改为顶部定位
        left: 0;
        width: 100%;
        height: 15%; // 修改高度
        background-color: rgba(255, 255, 255, 1);
        // background-color: red;
        z-index: 1; // 确保在header下方
        border-radius: 24px 24px 0px 0px;
    }



}
</style>