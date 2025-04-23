<template>
    <view>
        <u-popup :safeAreaInsetBottom="true" :safeAreaInsetTop="true" :mode="popupData.mode" :show="show"
            :round="popupData.round" :overlay="popupData.overlay" :borderRadius="popupData.borderRadius"
            :closeable="popupData.closeable" :closeOnClickOverlay="popupData.closeOnClickOverlay" @close="close"
            @open="open">
            <view class="u-popup-slot">
                <scroll-view class="report" scroll-y>
                    <!-- <view class="title">查看历史报告</view> -->
                    <view v-for="(report, index) in historyReports" :key="index" class="report-list"
                        @click="onclickReportCard(index)">
                        <view class="report-card">
                            <view class="report-title">
                                {{ report.title }} <span class="current-tag">{{ index === currentReportIndex ? '(当前报告)'
                                    : '' }} </span>
                            </view>
                            <view class="report-date">
                                {{ report.date }}
                            </view>
                        </view>
                    </view>
                </scroll-view>
            </view>
        </u-popup>
    </view>
</template>

<script>
export default {
    props: {
        show: {
            type: Boolean,
            default: false,
        },
        historyReports: {
            type: Array,
            default: () => [

            ]
        }
    },
    data() {
        return {
            currentReportIndex: 0, // 新增这行，默认第一个报告为当前报告
            popupData: {
                overlay: true,
                mode: 'left',
                borderRadius: '',
                closeable: true,
                closeOnClickOverlay: true
            },
        }
    },
    methods: {
        openPopup(popupData) {
            this.popupData = popupData
            uni.$u.sleep().then(() => {
                this.show = !this.show
            })
        },
        navigateBack() {
            uni.navigateBack()
        },
        open() {
            // console.log('open');
        },
        close() {
            this.$emit('update:show', false)  // 修改为emit事件
        },
        onclickReportCard(i) {
            this.currentReportIndex = i;
            this.$emit('onclickReportCard', i);
        }
    }
}
</script>

<style lang="scss">
.u-popup-slot {
    width: 60vw;
    height: 92vh;
    display: flex;
    justify-content: center;


    .report {
        width: 100%;
        height: 100%;



        .title {
            font-size: 32rpx;
            color: #00214d;
            font-weight: 500;
            text-align: center;
        }

        .report-list {
            margin-top: 40rpx;
            // 这里实现居中
            display: flex;
            justify-content: center;
            align-items: center;


            .report-card {
                width: 80%;
                background: linear-gradient(to right, #F1FCF5, #F9FCEF);
                border-radius: 10px;
                padding: 12px;
                margin: 0 10rpx;
                height: 120rpx;
                position: relative;
                box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1); //


                .report-title {
                    font-size: 30rpx;
                    color: #272727;
                    font-weight: bold;
                    align-items: center;
                    justify-content: center;

                    .current-tag {
                        color: coral;
                        font-size: 24rpx;
                        font-weight: 500;

                    }
                }

                .report-date {
                    font-size: 26rpx;
                    color: #868582;
                    margin-top: 10rpx;
                    position: absolute; // 新增这行
                    right: 12px; // 新增这行
                    bottom: 12px; // 新增这行
                }
            }


        }

        // width:
    }
}
</style>