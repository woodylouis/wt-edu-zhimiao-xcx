<template>
    <view class="enter-class">
        <!-- 导航 -->
        <view class="navigation">
            <view class="title" :style="xcxNameMarginTopStyle">
                {{ $t('xcxName') }}
            </view>
            <!-- banner -->
            <unicloud-db ref="bannerdb" v-slot:default="{ data, loading, error, options }" collection="opendb-banner" field="_id,bannerfile,open_url,title" @load="onqueryload">
                <!-- 当无banner数据时显示占位图 -->
                <image v-if="!(loading || data.length)" class="banner-image" src="/static/uni-center/headers.png" mode="aspectFill" :draggable="false" />

                <swiper v-else class="swiper-box" @change="changeSwiper" :current="current" indicator-dots>
                    <swiper-item v-for="(item, index) in data" :key="item._id">
                        <image class="banner-image" :src="item.bannerfile.url" mode="aspectFill" @click="clickBannerItem(item)" :draggable="false" />
                    </swiper-item>
                </swiper>
            </unicloud-db>

        </view>


    </view>
</template>

<script>
export default {
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
        }
    },
    onLoad() {
        const menuButtonInfo = uni.getMenuButtonBoundingClientRect();
        console.log(menuButtonInfo);
        this.xcxNameMarginTopStyle = `top:${menuButtonInfo.top + menuButtonInfo.height / 2}px;`

    },
    methods: {

    }
}
</script>

<style scoped lang="scss">
.enter-class {}

.navigation {
    flex-direction: column;
    align-items: center;
    position: relative; // 新增相对定位容器
    height: calc(100vh / 3); // 添加与轮播图相同的高度

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
    }
}

.title {
    width: 100%;
    text-align: center;
    margin-bottom: 0; // 移除下边距
    position: absolute; // 新增绝对定位
    left: 50%; // 水平居中
    transform: translate(-50%, -50%); // 精确居中
    z-index: 1; // 确保标题在轮播图之上
}
</style>