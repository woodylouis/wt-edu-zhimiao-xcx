<template>
    <view class="dashboard">
        <custom-nav :xcxName="'成长评估'" :navCustomStyle="navCustomStyle" :needBar="false" />
        <view class="user-profile">
            <image class="avatar-image" :src="avatarUrl" />

            <view class="info">
                <view class="name">李小思爸爸</view>
                <view class="class">小班3班 <view class="invite">邀请加入本班</view>
                </view>
            </view>
            <image class="switch-class-image" :src="switchIconUrl"></image>

        </view>


    </view>
</template>

<script setup>
import customNav from '@/components/customNav'
import { ref } from "vue";
import { useRoute } from "vue-router";
import profileHeader from "./profileHeader.vue";
import notificationBanner from "./notificationBanner.vue";
import growthReportCard from "./growthReportCard.vue";

const navCustomStyle = 'background: linear-gradient(to right, #F5FDF8, #F1FCF5, #F9FCEF);height: calc(100vh / 8)'
let avatarUrl = ref("https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/profile.png");
const switchIconUrl = "../../../static/general/switch.png";
const reports = [
    {
        date: "2025年02月21日",
        teacher: "何嘉琪老师",
    },
    {
        date: "2025年02月21日",
        teacher: "何嘉琪老师",
    },
    {
        date: "2025年02月21日",
        teacher: "何嘉琪老师",
    },
];
</script>

<style lang="scss" scoped>
.dashboard {
    .user-profile {
        height: calc(100vh / 3);
        background-color: red;
        display: flex;
        padding-left: 40rpx;
        padding-right: 40rpx;

        .avatar-image {
            width: 120rpx;
            height: 120rpx;
        }

        .switch-class-image {
            width: 60rpx;
            height: 60rpx;
        }
    }
}

.dashboard__title {}
</style>