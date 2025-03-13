<template>
    <view class="assessment">
        <custom-nav :xcxName="'信息填写'" :navCustomStyle="navCustomStyle" :needBar="false" :needBack="true" />
        <view class="content">
            <view class="header-info">
                <view class="hello">Hi, {{ displayName }}老师 !</view>
                <view class="class"> {{ currentClass }} </view>
            </view>
            <view class="info">
                <view class="title">个人信息</view>
                <view class="instruction">请输入您要进行儿童量表评估的小朋友姓名，系统将根据您的选择进入相应的评估流程。</view>
            </view>
            <view class="search">
                <search :list="list" labelName="flightNo" valueName="id" placeholder="请输入小朋友姓名" @select="formValue.flightNo = $event"></search>
            </view>
        </view>
    </view>
</template>

<script setup>
import customNav from '@/components/customNav';
import search from '../../uni_modules/z-search/components/z-search/z-search'
import { ref, onMounted, computed } from "vue";
import { onLoad } from '@dcloudio/uni-app'

const navCustomStyle = 'background: #F2F7F6;height: calc(100vh / 8)'
let currentClass = '小班8班'
let displayName = '李萍萍'
let formValue = ref({
    pageSize: 20,
    pageNumber: 1,
    flightNo: ''
})
let list = [{
    "id": "1",
    "flightNo": "CXA2212"
},
{
    "id": "2",
    "flightNo": "CXA2215"
}
]
// 新增路由参数接收
onLoad((options) => {
    console.log('接收到的路由参数:', {
        classId: options.classId,
        assessmentId: options.assessmentId
    });
});
onMounted((params) => {
    // TODO: 查询数据
    console.log(params)
})

</script>

<style lang="scss" scoped>
.assessment {
    .content {
        padding: 0 40rpx;
        background-color: #F2F7F6;
        height: calc(100vh - 100vh / 8);

        .header-info {
            margin-bottom: 64rpx;

            .hello {
                color: #00214D;
                font-family: "PingFang SC";
                font-size: 28px;
                font-style: normal;
                font-weight: 600;
                line-height: 35px;
                margin-bottom: 32rpx;
            }

            .class {
                color: #00214D;
                font-size: 16px;
                font-style: normal;
                font-weight: 400;
                line-height: 24px;
            }
        }

        .info {
            margin-bottom: 64rpx;

            .title {
                color: #00214D;
                font-family: "PingFang SC";
                font-size: 22px;
                font-style: normal;
                font-weight: 600;
                line-height: 28px;
                margin-bottom: 32rpx;

            }

            .instruction {
                color: #00214D;
                font-family: "PingFang SC";
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