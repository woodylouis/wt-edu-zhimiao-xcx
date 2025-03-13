<template>
    <view class="assessment">
        <custom-nav :xcxName="'儿童成长评估'" :navCustomStyle="navCustomStyle" :needBar="false" :needBack="true" />
        <view class="content">
            <view class="progress">
                <view class="title">
                    <view>进度</view>
                    <view> {{ persentage }} </view>
                </view>
                <view class="progress-bar"></view>
                <view class="current">{{ current }}/{{ count }} 问题</view>
            </view>
            <view class="question-part">
                <view class="section"> {{ section }} </view>
                <view class="question"> {{ question }} </view>
            </view>
            <u-button @click="handleSubmit" :custom-style="buttonStyle1">是</u-button>
            <u-button @click="handleSubmit" :custom-style="buttonStyle2">否</u-button>



        </view>
    </view>
</template>

<script setup>
import customNav from '@/components/customNav';
import { onLoad } from '@dcloudio/uni-app'
import { ref, onMounted, computed } from "vue";

let childId = ref('');
let current = ref(3);
let count = ref(10);
let section = ref('运动');
let persentage = ref('30%');
let question = ref('喜欢长时间的自身旋转。');
let buttonStyle1 = {
    backgroundColor: "rgba(110, 221, 138, 1)",
    color: "rgba(0, 33, 77, 1)",
    borderRadius: "48rpx",
    fontWeight: "500",
    fontSize: "32rpx",
    padding: "26rpx 0",
    height: "48px",
    marginTop: "40rpx"
}
let buttonStyle2 = {
    backgroundColor: "#DEF2E3",
    color: "rgba(0, 33, 77, 1)",
    borderRadius: "48rpx",
    fontWeight: "500",
    fontSize: "32rpx",
    padding: "26rpx 0",
    height: "48px",
    marginTop: "40rpx"
}


const navCustomStyle = 'background: #F2F7F6;height: calc(100vh / 8)'

onLoad((options) => {
    console.log(options)
    childId.value = options.childId;

});

</script>

<style lang="scss" scoped>
.assessment {
    .content {
        padding: 0 40rpx;
        background-color: #F2F7F6;
        height: calc(100vh - 100vh / 8);

        .progress {
            margin-bottom: 36rpx;

            .title {
                color: #00214D;
                font-size: 16px;
                font-style: normal;
                font-weight: 500;
                line-height: 24px;
                justify-content: space-between;
                display: flex;
                margin-bottom: 30rpx;
            }

            .progress {}

            .current {
                color: #459C5C;
                font-feature-settings: 'dlig' on;
                font-family: "Plus Jakarta Sans";
                font-size: 14px;
                font-style: normal;
                font-weight: 400;
                line-height: 21px;
                /* 150% */
            }
        }

        .question-part {
            margin-bottom: 280rpx;

            .section {
                color: #00214D;
                font-size: 24px;
                font-style: normal;
                font-weight: 700;
                line-height: 30px;
                margin-bottom: 24rpx;
                /* 125% */
            }

            .question {
                color: #0D1C12;
                font-size: 16px;
                font-style: normal;
                font-weight: 400;
                line-height: 24px;
                /* 150% */
            }
        }
    }
}
</style>