<template>
    <view class="dashboard">
        <custom-nav :xcxName="'成长评估'" :navCustomStyle="navCustomStyle" :needBar="false" />
        <view class="user-profile">
            <!-- 左侧内容容器 -->

            <view class="profile-left">
                <image class="avatar-image" :src="avatarUrl" />
                <view class="info">
                    <view class="name">{{ displayName }}</view>
                    <view class="class">{{ classDisplay }}<view class="invite">邀请加入本班</view>
                    </view>
                </view>
            </view>

            <!-- 右侧切换按钮 -->
            <view class="switch-class">
                <image class="switch-class-image" :src="switchIconUrl"></image>
            </view>
        </view>
        <view class="assessment-option">
            <view v-for="item in assessmentList" :key="item.id" class="option" @click="handleAssessmentClick(item)">
                <view class="title">{{ item.title }}</view>
                <image class="image" src="../../../static/assessment-list/child-assess.svg" />
            </view>
        </view>

    </view>
</template>

<script setup>
import customNav from '@/components/customNav'
import { ref, onMounted, computed } from "vue";
import { onShow } from '@dcloudio/uni-app'

const CACHE_KEY = 'teacher_assessment_list';
const CACHE_EXPIRY = 3600 * 1000; // 1小时有效期
const assessmentList = ref([]);
const pagination = ref({ page: 1, pageSize: 10, total: 0 });
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
// 新增用户信息获取
const userInfo = ref(uni.getStorageSync('uni-id-pages-userInfo') || {});
const currentClass = ref(uni.getStorageSync('currentClass') || {});

// 修改用户信息显示部分
const displayName = computed(() => {
    return userInfo.value.nickname || userInfo.value.username || '老师';
});

// 修改班级显示逻辑
const classDisplay = computed(() => {
    if (currentClass.value.grade && currentClass.value.class) {
        return `${currentClass.value.grade}${currentClass.value.class}班`;
    }
    return '暂无班级信息';
});

const loadAssessments = async () => {
    try {
        // 尝试读取缓存
        const cachedData = uni.getStorageSync(CACHE_KEY);
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_EXPIRY) {
            assessmentList.value = cachedData.list;
            pagination.value.total = cachedData.total;
            return;
        }
        const res = await uniCloud.callFunction({
            name: 'wt-fetch-assessment-list',
            data: {
                page: pagination.value.page,
                pageSize: pagination.value.pageSize
            }
        });

        if (res.result.code === 0) {
            assessmentList.value = res.result.data.list;
            pagination.value.total = res.result.data.total;

            // 更新缓存（包含时间戳）
            uni.setStorageSync(CACHE_KEY, {
                list: res.result.data.list,
                total: res.result.data.total,
                timestamp: Date.now()
            });
        }
    } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' });
    }
};

// 添加定时清理过期缓存的逻辑
let cacheTimer = null;

onShow(() => {
    checkLoginStatus();

})

const checkLoginStatus = () => {
    try {
        // 获取本地存储的登录信息
        const token = uni.getStorageSync('uni_id_token');
        const userInfo = uni.getStorageSync('uni-id-pages-userInfo');
        const tokenExpired = uni.getStorageSync('uni_id_token_expired');

        // 三重校验条件
        const isValid = token &&
            userInfo?._id &&
            tokenExpired > Date.now();

        if (!isValid) {
            this.navigateToLogin();
            return false;
        }
        return true;
    } catch (e) {
        console.error('登录状态检查失败:', e);
        this.navigateToLogin();
        return false;
    }
}

onMounted(() => {
    loadAssessments();
    cacheTimer = setInterval(() => {
        const cachedData = uni.getStorageSync(CACHE_KEY);
        if (cachedData && Date.now() - cachedData.timestamp > CACHE_EXPIRY) {
            uni.removeStorageSync(CACHE_KEY);
        }
    }, 60000); // 每分钟检查一次
});

const handleAssessmentClick = (item) => {
    console.log("item", item)
    if (!currentClass.value?.id) {
        uni.showToast({ title: '请先选择班级', icon: 'none' });
        return;
    }
    console.log("currentClass", currentClass)
    uni.navigateTo({
        url: `/pages/assessment/chooseChild?classId=${currentClass.value.id}&className=${classDisplay.value}&assessmentId=${item.id}&assessmentTitle=${item.title}`
    });
};

</script>

<style lang="scss" scoped>
.dashboard {
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

        .switch-class {
            display: flex;
            height: 60%;
            align-items: center;

            .switch-class-image {
                width: 90rpx;
                height: 90rpx;
            }
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

                .invite {
                    background: #DBE9FF;
                    color: #2A64E9;
                    padding: 4px 4px;
                    border-radius: 4px;
                    font-family: "PingFang SC";
                    font-size: 14px;
                    font-style: normal;
                    line-height: 20px;
                    margin-left: 8px;
                }
            }
        }
    }

    .assessment-option {
        margin: 0 40rpx 0 40rpx;
        border-radius: 12px;

        .option {
            border: 1px solid #100D40;
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
            }

            .image {
                width: 170rpx;
                height: 170rpx;
                margin-right: 40rpx;
            }
        }



    }
}

.dashboard__title {}
</style>