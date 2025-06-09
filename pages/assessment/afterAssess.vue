<template>
    <view class="assessment">
        <custom-nav :xcxName="assessmentTitle" :navCustomStyle="navCustomStyle" :needBar="false" :needBack="true"
            :backHandler="handleNavBack" />
        <view class="content">
            <view class="user-profile">
                <!-- 左侧内容容器 -->
                <view class="profile-left">
                    <image class="avatar-image" :src="avatarUrl" />
                    <view class="info">
                        <view class="name">{{ displayName }}</view>
                        <view class="class">
                            <view style="display: flex;">
                                <view style="margin-right: 40rpx"><span style="font-weight: bold;">班级：</span>{{
                                    classDisplay
                                    }}</view>
                                <view><span style="font-weight: bold;">年龄：</span>{{ childAge }}</view>
                            </view>
                        </view>
                    </view>
                </view>

            </view>
            <view class="report">

            </view>
        </view>
        <!-- <view style="z-index: 9999;">
            <popup :historyReports="historyReports" :show="showHistory" @update:show="val => showHistory = val"
                @onclickReportCard="onclickReportCard" />
        </view> -->
    </view>
</template>

<script setup>

import { onLoad } from '@dcloudio/uni-app'
import { ref, onUnmounted } from "vue";
import customNav from '@/components/customNav';
import { ASSESS_STUDENT } from '@/lib/types/local_storage.js';

const assessStudent = uni.getStorageSync(ASSESS_STUDENT);
let displayName = assessStudent.childName;
let classDisplay = assessStudent.className;
let avatarUrl = assessStudent.avatar;
let childAge = assessStudent.childAge;
let assessmentTitle = assessStudent.assessmentTitle;


const navCustomStyle = 'background: linear-gradient(to right, #F5FDF8, #F1FCF5, #F9FCEF);height: calc(100vh / 8)'


const handleNavBack = () => {
    uni.redirectTo({ url: '/pages/dashboard/teacher/teacher' })
};





onLoad(async function (options) {

});

onUnmounted(() => {


});

</script>

<style lang="scss" scoped>
.assessment {
    .content {
        background-color: linear-gradient(to right, #F5FDF8, #F1FCF5, #F9FCEF);
        height: calc(100vh - 100vh / 8);

        .user-profile {
            // height: calc(100vh / 8);
            background:
                linear-gradient(to right, #F5FDF8, #F1FCF5, #F9FCEF);
            display: flex;
            justify-content: space-between;
            align-items: center; // 新增这行实现垂直居中
            padding: 0 40rpx 20rpx 40rpx;
            box-shadow: inset 0 -20rpx 30rpx rgba(255, 255, 255, 0.8);


            .profile-left {
                display: flex;
                gap: 24rpx;
                height: 60%;
                align-items: center;
            }

            .profile-right {
                height: 60%;
                align-items: center;

                .report-list-image {
                    width: 90rpx;
                    height: 90rpx;
                }
            }

            .avatar-image {
                width: 120rpx;
                height: 120rpx;
            }

            .info {
                display: flex;
                flex-direction: column;
                gap: 8rpx;

                .name {
                    color: #00214D;
                    font-family: "PingFang SC";
                    font-size: 18px;
                    font-style: normal;
                    font-weight: 600;
                    line-height: 24px;
                }

                .class {
                    gap: 8rpx;
                    color: #3D464A;
                    font-family: "PingFang SC";
                    font-size: 14px;
                    font-style: normal;
                    font-weight: 400;
                    line-height: 20px;
                    align-items: center;
                }
            }
        }


    }
}
</style>