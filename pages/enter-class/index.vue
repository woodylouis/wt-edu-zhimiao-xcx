<template>
    <view class="enter-class">
        <!-- 导航 -->
        <view class="navigation">
            <view class="title" :style="xcxNameMarginTopStyle">
                {{ $t('xcxName') }}
            </view>
            <!-- banner -->
            <unicloud-db ref="bannerdb" v-slot:default="{ data, loading, error, options }" collection="opendb-banner" field="_id,bannerfile,open_url,title">
                <!-- 当无banner数据时显示占位图 -->
                <image v-if="!(loading || data.length)" class="banner-image" src="/static/uni-center/headers.png" mode="aspectFill" :draggable="false" />

                <swiper v-else class="swiper-box" @change="changeSwiper" :current="current" indicator-dots>
                    <swiper-item v-for="(item, index) in data" :key="item._id">
                        <image class="banner-image" :src="item.bannerfile.url" mode="aspectFill" @click="clickBannerItem(item)" :draggable="false" />
                        <view class="banner-mask"></view>
                    </swiper-item>
                </swiper>
            </unicloud-db>

        </view>
        <view class="enter-class-option">
            <view class="option" @click="onClickCreate">
                <view class="title">{{ $t('enterClassMethod.create') }}</view>
                <image class="image" src="../../static/enter-class/create.svg" />

            </view>
            <view class="option">
                <view class="title"> {{ $t('enterClassMethod.apply') }}</view>
                <image class="image" src="../../static/enter-class/apply.svg" />

            </view>
        </view>
        <up-overlay :show="show">
            <view class="warp">
                <modal-box-mcq :confirmText="'立即创建'" :list="modalOptionsList" @cancel="show = false" @create="onConfirm" />
            </view>
        </up-overlay>

    </view>
</template>

<script>
// 导入modlBox组件
import modalBoxMcq from '../../components/modalBox-MCQ';

export default {
    components: {
        modalBoxMcq
    },
    data() {
        return {
            current: 0,
            bannerData: [],
            bannerHeight: 0,
            titleHeight: 0,
            titleMarginTop: 0,
            menuButtonInfoStyle: '',
            sysconfigMap: {},
            xcxNameMarginTopStyle: '',
            show: false,
            modalOptionsList: ['我是老师'],
        }
    },
    onLoad() {
        // console.log('hasLogin', getApp().hasLogin)
        const menuButtonInfo = uni.getMenuButtonBoundingClientRect();
        this.xcxNameMarginTopStyle = `top:${menuButtonInfo.top + menuButtonInfo.height / 2}px;`


    },
    methods: {
        onClickCreate() {
            // 点击创建按钮的逻辑
            this.show = true;
            // console.log('创建按钮被点击 show', show.value);
        },
        onConfirm() {
            console.log('确认按钮被点击');
            this.show = false;
            uni.navigateTo({
                url: '/pages/enter-class/createClassForm1'
            })
        }
    }
}
</script>

<style scoped lang="scss">
.enter-class {
    background-color: #F2F7F6;
    height: 100vh;
}

.navigation {
    flex-direction: column;
    align-items: center;
    position: relative; // 新增相对定位容器
    height: calc(100vh / 3); // 添加与轮播图相同的高度

    .title {
        width: 100%;
        text-align: center;
        margin-bottom: 0; // 移除下边距
        position: absolute; // 新增绝对定位
        left: 50%; // 水平居中
        transform: translate(-50%, -50%); // 精确居中
        z-index: 1; // 确保标题在轮播图之上
    }

    .swiper-box {
        height: 100%;
        width: 100%;
        position: absolute; // 新增绝对定位
        top: 0;
        left: 0;

        .banner-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 0; // 移除圆角;
        }

        .banner-mask {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 100rpx;
            background: linear-gradient(to top, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 100%);
            z-index: 1;
        }
    }
}

.enter-class-option {
    // 左右、上面分别空出40rpx
    margin: 40rpx 40rpx 0 40rpx;

    .option {
        width: calc(100vw - 80rpx);
        height: 118px;
        flex-shrink: 0;
        border-radius: 12px;
        background: #FFF;
        box-shadow: 0px 0px 1px 0px rgba(193, 197, 210, 0.20);
        margin-bottom: 32rpx;
        display: flex;
        align-items: center;
        justify-content: space-between;

        .title {
            color: #100D40;
            font-family: "PingFang SC";
            font-size: 20px;
            font-style: normal;
            font-weight: 600;
            line-height: normal;
            margin-left: 80rpx;
            margin-right: 90rpx;
            // font-size: 28rpx;
        }

        .image {
            width: 170rpx;
            height: 170rpx;
            margin-right: 40rpx;
        }
    }
}

.warp {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
}

.rect {
    width: 120px;
    height: 120px;
    background-color: #fff;
}
</style>