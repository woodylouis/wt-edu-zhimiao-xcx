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
                            <view><span style="font-weight: bold;">年龄：</span>{{ formattedAge }}</view>
                        </view>
                    </view>
                </view>
            </view>
            <view class="report">
                <view class="part">
                    <developmentLevel :totalScore="51" />
                    <capability-level :displayName="displayName" :perception-score="4" :social-score="15" :motor-score="8" :language-score="18" :selfcare-score="6" />
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

const totalScore = ref(0);
const sectionScores = ref({});
const completionTime = ref('');
const formattedAge = ref('');

const navCustomStyle = 'background: linear-gradient(to right, #F5FDF8, #F1FCF5, #F9FCEF);height: calc(100vh / 8)'
// 在setup中添加卸载生命周期
const assessmentId = ref('');

const handleNavBack = () => {
    uni.redirectTo({ url: '/pages/dashboard/teacher/teacher' })

};

onLoad((options) => {
    assessmentId.value = options.assessmentId; // 存储assessmentId
    const cacheKey = `assessment_${options.assessmentId}`;
    const cachedData = uni.getStorageSync(cacheKey);

    // 初始化数据绑定
    if (cachedData) {
        displayName.value = cachedData.childName || '未知姓名';
        classDisplay.value = cachedData.className || '未知班级';
        totalScore.value = cachedData.totalScore || 0;
        sectionScores.value = cachedData.sectionScores || {};

        // 格式化年龄显示
        if (cachedData.childAge >= 2) {
            const years = Math.floor(cachedData.childAge);
            const months = Math.round((cachedData.childAge - years) * 10 * 1.2);
            formattedAge.value = months === 0 ?
                `${years}岁` :
                `${years}岁${months}个月`;
        } else {
            formattedAge.value = `${Math.round(cachedData.childAge * 10 * 1.2)}个月`;
        }

        // 格式化完成时间
        completionTime.value = new Date(cachedData.completionTime).toLocaleString();
    }

    // 添加调试日志
    console.log('缓存数据:', cachedData);
});

onUnmounted(() => {
    // 清除当前量表的缓存
    const cacheKey = `assessment_${assessmentId.value}`;
    uni.removeStorageSync(cacheKey);
    console.log('已清除评估缓存:', cacheKey);
});

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