<template>
    <view class="dashboard">
        <u-sticky>
            <custom-nav :xcxName="'成长评估'" :navCustomStyle="navCustomStyle" :needBar="false" />
            <view class="user-profile">
                <!-- 左侧内容容器 -->

                <view class="profile-left" @click="onClickProfile">
                    <image class="avatar-image" :src="avatarUrl" />
                    <view class="info">
                        <view class="name">{{ displayName }}</view>
                        <view class="class">{{ classDisplay }}
                            <view class="invite" @click.stop="onClickInvite">邀请加入本班</view>
                        </view>
                    </view>
                </view>

                <!-- 右侧切换按钮 -->
                <view class="switch-class" @click="onClickSwitch">
                    <image class="switch-class-image" :src="switchIconUrl"></image>
                </view>
            </view>
        </u-sticky>
        <view class="student-list">
            <view v-if="loading" class="u-demo-block">
                <view class="u-demo-block__content">
                    <u-skeleton rows="6" :title="false" :rowsWidth="['100%', '100%', '100%', '100%', '100%', '100%']"
                        :rowsHeight="['160rpx', '160rpx', '160rpx', '160rpx', '160rpx', '160rpx']" loading
                        :animate="true"></u-skeleton>
                </view>
            </view>
            <StudentList :studentList="studentList" @handleStudentClick="handleStudentClick" />
        </view>

        <view v-if="loadingMore">
            <view class="u-page__loading-item">
                <u-loading-icon mode="circle" timingFunction="linear"></u-loading-icon>
            </view>
        </view>

        <view style=" right: 30rpx; bottom: 120rpx; z-index: 9999;">
            <view style=" z-index: 9999;">
                <QcSuspendBtn :mainBtn="btnConfig.suspen.mainBtn" :childSize="btnConfig.suspen.childSize"
                    :childBtns="btnConfig.suspen.childBtns" :openType="btnConfig.suspen.openType"
                    :padding="btnConfig.suspen.padding" @childClick="btnConfig.childClick">
                </QcSuspendBtn>
            </view>
        </view>

    </view>
</template>

<script setup>
import customNav from '@/components/customNav'
import { ref, onMounted, computed, reactive } from "vue";
import { onShow, onLoad, onUnload, onReachBottom } from '@dcloudio/uni-app'
import QcSuspendBtn from '@/components/qc-suspendBtn/qc-suspendBtn.vue'
import StudentList from './components/student-list'
import btnConfig from '@/common/suspen-btn/config.js'

const navCustomStyle = 'background: linear-gradient(to right, #F5FDF8, #F1FCF5, #F9FCEF);height: calc(100vh / 8);'
const defaultAvatarUrl = ref("https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/profile.png");
const switchIconUrl = "../../../static/general/switch.png";
const page = ref(1)
const pageSize = ref(14)
const loading = ref(true); // 新增加载状态
const loadingMore = ref(false) // 新增加载更多状态
const noMoreData = ref(false) // 新增无更多数据标志

const studentList = ref([])
// 新增用户信息获取
const userInfo = ref(uni.getStorageSync('uni-id-pages-userInfo') || {});
const currentClass = ref(uni.getStorageSync('currentClass') || {});
const role = ref('teacher'); // 默认值设为teacher
// 修改用户信息显示部分
let userNickname = ref('');
const displayName = computed(() => {
    return userNickname.value ? userNickname.value : userInfo.value.nickname || '小程序用户';
});


const navigateToLogin = () => {
    uni.navigateTo({
        url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd'
    });
}

const avatarUrl = computed(() => {
    // 添加双重保护逻辑
    return (userInfo.value.avatar_file && userInfo.value.avatar_file.url)
        ? userInfo.value.avatar_file.url
        : defaultAvatarUrl.value;
});

const handleStudentClick = (student) => {
    console.log('点击了学生', student);
    uni.setStorageSync('currentStudentReport', student);
    uni.navigateTo({
        url: `/pages/assessment/report?isHistory=yes}`
    });
}

const onClickInvite = () => {
    if (!currentClass.value?.code) {
        uni.showToast({ title: '暂无班级码', icon: 'none' });
        return;
    }

    // 复制班级码到剪贴板
    uni.setClipboardData({
        data: currentClass.value.code,
        success: () => {
            uni.showToast({ title: '班级码已复制', icon: 'success' });
        },
        fail: () => {
            uni.showToast({ title: '复制失败', icon: 'none' });
        }
    });
};
// 修改班级显示逻辑
const classDisplay = computed(() => {
    if (currentClass.value.grade && currentClass.value.class) {
        return `${currentClass.value.grade}${currentClass.value.class}班`;
    }
    return '暂无班级信息';
});

const onClickSwitch = () => {
    uni.navigateTo({
        url: '/pages/enter-class/switchClass'
    }).then(() => {
        // 新增返回后强制更新
        userInfo.value = uni.getStorageSync('uni-id-pages-userInfo') || {};
        currentClass.value = uni.getStorageSync('currentClass') || {};
    });
}

const onClickProfile = () => {
    uni.navigateTo({
        url: '/uni_modules/uni-id-pages/pages/userinfo/userinfo'
    }).then(() => {
        // 新增返回后强制更新
        userInfo.value = uni.getStorageSync('uni-id-pages-userInfo') || {};
        currentClass.value = uni.getStorageSync('currentClass') || {};
    });
}

const loadStudentsWithData = async (classId, pageNum, pageSizeNum) => {
    try {
        // 检查是否有缓存数据
        const cacheKey = `current_class_students`;
        const cachedData = uni.getStorageSync(cacheKey);
        
        // 检查缓存是否有效：存在缓存数据且缓存中的学生属于当前班级
        const isCacheValid = cachedData && cachedData.some(student => 
            student.class_id === currentClass.value._id
        );

        // 如果是第一页且缓存有效，则使用缓存
        if (pageNum === 1 && isCacheValid) {
            studentList.value = cachedData;
            loading.value = false;
            return;
        }

        loading.value = pageNum === 1;
        loadingMore.value = pageNum > 1;

        const res = await uniCloud.callFunction({
            name: 'wt-fetch-report-history',
            data: {
                classId,
                page: pageNum,
                pageSize: pageSizeNum
            }
        })

        if (res.result.code === 0) {
            if (pageNum === 1) {
                studentList.value = res.result.data.list;
                // 缓存第一页数据
                uni.setStorageSync(cacheKey, res.result.data.list);
            } else {
                studentList.value = [...studentList.value, ...res.result.data.list];
            }

            noMoreData.value = res.result.data.list.length < pageSizeNum;
        }
    } catch (e) {
        console.error('加载失败:', e);
    } finally {
        loading.value = false;
        loadingMore.value = false;
    }
};

// 在切换班级或需要刷新数据时清除缓存
const clearStudentsCache = (classId) => {
    const cacheKey = `class_${classId}_students`;
    uni.removeStorageSync(cacheKey);
};


onShow(() => {
    // 新增用户信息更新逻辑
    userInfo.value = uni.getStorageSync('uni-id-pages-userInfo') || {};
    currentClass.value = uni.getStorageSync('currentClass') || {};
    checkLoginStatus();
})

onReachBottom(() => {
    console.log('onReachBottom');
    if (loadingMore.value) return;

    if (noMoreData.value) {
        uni.showToast({
            title: '没有更多数据了~',
            icon: 'none',
            duration: 1500
        });
        return;
    }

    page.value += 1
    loadStudentsWithData(currentClass.value._id, page.value, pageSize.value)
})

onLoad((options) => {
    console.log('onLoad options:', options);
    // 读取从switchClass页面传递的selectedClass参数
    if (options.userNickname) {
        try {
            // 给displayName
            userNickname.value = options.userNickname;
        } catch (e) {
            console.error('解析selectedClass参数失败:', e);
        }
    }
    if (options.role) {
        role.value = options.role;
    }

    // 保持原有的currentClass逻辑不变
    userInfo.value = uni.getStorageSync('uni-id-pages-userInfo') || {};
    currentClass.value = uni.getStorageSync('currentClass') || {};

    loadStudentsWithData(currentClass.value._id, page.value, pageSize.value);
    uni.$on('reachBottom', onReachBottom)
});

onUnload(() => {
    uni.$off('reachBottom', onReachBottom)
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
            navigateToLogin();
            return false;
        }
        return true;
    } catch (e) {
        console.error('登录状态检查失败:', e);
        navigateToLogin();
        return false;
    }
}

onMounted(() => {
    userInfo.value = uni.getStorageSync('uni-id-pages-userInfo') || {};
    currentClass.value = uni.getStorageSync('currentClass') || {};
});



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

    .student-list {
        // margin-top: 40rpx;
        padding: 5rpx 40rpx;
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

.no-data {
    margin-top: 100rpx;
    width: 100%;
    text-align: center;
    color: #6F7374;
    font-size: 32rpx;
    padding: 60rpx 0;
    font-family: "PingFang SC";
}

.help-container {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-top: 58rpx;
}

.help-link {
    color: #6F7374;
    font-size: 32rpx;
    // text-decoration: underline;
}

.u-skeleton-slot {
    @include flex;
    align-items: flex-start;

    &__image {
        width: 40px;
        height: 40px;
        border-radius: 100px;
    }

    &__content {
        margin-left: 10px;
        flex: 1;
    }
}

.u-demo-block__content {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
}
</style>