<template>
    <view class="dashboard">
        <u-sticky>
            <custom-nav :xcxName="'成长评估'" :navCustomStyle="navCustomStyle" :needBar="false" />
            <view class="user-profile">
                <!-- 左侧内容容器 -->

                <view class="profile-left" @click="onClickProfile">
                    <image class="avatar-image" :src="avatarUrl" />
                    <view class="info" style="width: 100%;">
                        <view class="name">{{ displayName }}</view>
                        <view class="class">班级：{{ classDisplay }}

                            <view class="class">年龄：{{ classDisplay }}

                            </view>
                        </view>

                    </view>
                </view>


            </view>
        </u-sticky>

        <!-- 折叠模板和列表 -->
        <view class="collapse" v-for="(item, index) in 5" :key="index">
            <u-collapse @change="change" @close="close" @open="open" :border=false>
                <u-collapse-item title="语言与沟通技能" name="Docs guide">
                    <text class="u-collapse-content"
                        style="font-size: 26rpx;">本模块根据ABLLS-R量表编排，包含语言理解、要求表达、要求、命名、内部语言、自发性语言和语句和语法。</text>

                    <uni-list>
                        <uni-list-item title="心理健康" rightText="共57项" @click="toForm" :clickable="true"
                            :show-switch="true"></uni-list-item>
                    </uni-list>
                </u-collapse-item>
            </u-collapse>
        </view>

        <up-overlay :show="show">
            <view class="warp">
                <modal-box v-if="show" confirmText="确定" @cancel="show = false" cancelText="先不退出"
                    @create="handleConfirm" />
            </view>
        </up-overlay>
    </view>
</template>

<script setup>
import customNav from '@/components/customNav'
import { ref, onMounted, computed, reactive } from "vue";
import { onShow, onLoad, onUnload, onReachBottom } from '@dcloudio/uni-app'
import modalBox from '../../components/modalBox-v3/modalBox.vue';

const navCustomStyle = 'background: linear-gradient(to right, #F5FDF8, #F1FCF5, #F9FCEF);height: calc(100vh / 8);'
const defaultAvatarUrl = ref("https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/profile.png");
const switchIconUrl = "../../../static/general/switch.png";

// 新增用户信息获取
const userInfo = ref(uni.getStorageSync('uni-id-pages-userInfo') || {});
const currentClass = ref(uni.getStorageSync('currentClass') || {});

// 修改用户信息显示部分
let userNickname = ref('');
const displayName = computed(() => {
    return userNickname.value ? userNickname.value : userInfo.value.nickname || '小程序用户';
});

const show = ref(false);
const confirmInfo = ref([
    {
        label: "",
        name: "系统检测评估还没有完成。如果退出，当前进度会保存30天。",
    }
]);

const toForm = () => {
    show.value = true
};


const navigateToLogin = () => {
    uni.navigateTo({
        url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd'
    });
}

const handleConfirm = () => {
    const { id, name, age } = selectedChildInfo.value;

    // 加入搜索历史
    updateSearchHistory(name);

    // 计算格式化年龄
    const ageParts = age.split('岁');
    const years = parseInt(ageParts[0]);
    const months = parseInt(ageParts[1].split('个月')[0]);
    const totalMonths = years * 12 + months;

    let ageDisplay;
    if (totalMonths >= 24) {
        const displayYears = Math.floor(totalMonths / 12);
        const displayMonths = totalMonths % 12;
        ageDisplay = displayMonths === 0 ?
            `${displayYears}.0` :
            `${displayYears}.${Math.round(displayMonths / 1.2)}`;
    } else {
        ageDisplay = (totalMonths / 10).toFixed(1);
    }

    uni.navigateTo({
        url: `/pages/assessment/form?classId=${classId.value}` +
            `&className=${className.value}` +
            `&childId=${id}` +
            `&childName=${name}` +
            `&childAge=${age}` +
            `&assessmentId=${assessmentId.value}` +
            `&assessmentTitle=${assessmentTitle.value}`
    });
};

const avatarUrl = computed(() => {
    // 添加双重保护逻辑
    return (userInfo.value.avatar_file && userInfo.value.avatar_file.url)
        ? userInfo.value.avatar_file.url
        : defaultAvatarUrl.value;
});


// 修改班级显示逻辑
const classDisplay = computed(() => {
    if (currentClass.value.grade && currentClass.value.class) {
        return `${currentClass.value.grade}${currentClass.value.class}班`;
    }
    return '暂无班级信息';
});


const onClickProfile = () => {
    uni.navigateTo({
        // url: '/uni_modules/uni-id-pages/pages/userinfo/userinfo'
        url: '/pages/assessment/listMoudule'
    }).then(() => {
        // 新增返回后强制更新
        userInfo.value = uni.getStorageSync('uni-id-pages-userInfo') || {};
        currentClass.value = uni.getStorageSync('currentClass') || {};
    });
}



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

    // 保持原有的currentClass逻辑不变
    userInfo.value = uni.getStorageSync('uni-id-pages-userInfo') || {};
    currentClass.value = uni.getStorageSync('currentClass') || {};

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
    .warp {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
    }

    .collapse {
        border-radius: 8px;
        border: 1px solid #E9E9E9;
        background: #FFF;
        box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
        margin: 22rpx 40rpx;
    }

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