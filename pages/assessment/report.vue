<template>
    <view class="assessment">
        <custom-nav :xcxName="'儿童成长评估'" :navCustomStyle="navCustomStyle" :needBar="false" :needBack="true" :backHandler="handleNavBack" />
        <view class="content">
            <view class="user-profile">
                <!-- 左侧内容容器 -->
                <view class="profile-left">
                    <image class="avatar-image" :src="avatarUrl" />
                    <view class="info">
                        <view class="name">{{ displayName }}的评估报告</view>
                        <view class="class">
                            <view style="margin-right: 40rpx"><span style="font-weight: bold;">班级：</span>{{ classDisplay }}</view>
                            <view><span style="font-weight: bold;">年龄：</span>{{ age }}</view>
                        </view>
                    </view>
                </view>
            </view>
            <view class="report">
                <view class="part">
                    <developmentLevel :totalScore="78" />
                    <capability-level :displayName="displayName" :perception-score="2" :social-score="18" :motor-score="22" :language-score="8" :selfcare-score="10" />
                </view>
            </view>
        </view>
    </view>
</template>

<script setup>
import customNav from '@/components/customNav';
import developmentLevel from './components/development-level';
import capabilityLevel from './components/capability-level';
import { onLoad } from '@dcloudio/uni-app'
import { ref, onMounted, computed, onUnmounted } from "vue";

let displayName = ref('李思'); // 
let classDisplay = ref('小班3班');
let age = ref('36个月');
let avatarUrl = ref("https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/girl.png");

const navCustomStyle = 'background: linear-gradient(to right, #F5FDF8, #F1FCF5, #F9FCEF);height: calc(100vh / 8)'



</script>

<style lang="scss" scoped>
.assessment {
    .content {
        background-color: linear-gradient(to right, #F5FDF8, #F1FCF5, #F9FCEF);
        height: calc(100vh - 100vh / 8);

        .user-profile {
            height: calc(100vh / 8);
            background:
                linear-gradient(to right, #F5FDF8, #F1FCF5, #F9FCEF);
            display: flex;
            justify-content: space-between;
            padding: 0 40rpx;
            box-shadow: inset 0 -20rpx 30rpx rgba(255, 255, 255, 0.8);

            .profile-left {
                display: flex;
                gap: 24rpx;
                height: 60%;
                align-items: center;
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
                    display: flex;
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