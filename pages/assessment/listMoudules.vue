<template>
    <view class="dashboard">
        <u-sticky>
            <custom-nav :xcxName="currentStudent.assessmentTitle" :navCustomStyle="navCustomStyle" :needBar="false"
                :needBack="true" />
            <view class="user-profile">
                <!-- 左侧内容容器 -->

                <view class="profile-left">
                    <image class="avatar-image" :src="currentStudent.avatar" />
                    <view class="info" style="width: 100%;">
                        <view class="name">{{ currentStudent.childName }}</view>
                        <view class="class">班级：{{ currentStudent.className }}

                            <view class="class">年龄：{{ currentStudent.childAge }}

                            </view>
                        </view>

                    </view>
                </view>
            </view>
        </u-sticky>

        <!-- 折叠模板和列表 -->
        <view class="collapse" v-for="(section, index) in assessmentSections" :key="index">
            <u-collapse @change="handleCollapseChange" @close="closeCollapse" @open="openCollapse" :border=false
                :value="activeCollapse">
                <u-collapse-item :title="section.section" :name="section.name">
                    <text>{{ section.desc }}</text>
                    <view v-for="(ablls, idx) in section.abllsSections" :key="idx">
                        <uni-list>
                            <uni-list-item :title="ablls.sectionName" :rightText="`共${ablls.questionCount}项`"
                                @click="handleOnClickSection(section.section_id, section.section, section.abllsSections.length, idx, ablls, section.abllsSections)"
                                :clickable="true">
                            </uni-list-item>
                        </uni-list>
                    </view>
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
import { ref, onMounted } from "vue";
import { onShow, onLoad, onUnload, onReachBottom } from '@dcloudio/uni-app'
import modalBox from '../../components/modalBox-v3/modalBox.vue';
import { ASSESS_STUDENT, CURRENT_ASSESSMENT_SECTION } from '@/lib/types/local_storage.js';

const navCustomStyle = 'background: linear-gradient(to right, #F5FDF8, #F1FCF5, #F9FCEF);height: calc(100vh / 8);'
const defaultAvatarUrl = ref("https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/profile.png");
// 新增用户信息获取
const userInfo = ref(uni.getStorageSync('uni-id-pages-userInfo') || {});
const currentStudent = ref({
    // ageInt: "3",
    // assessmentId: "6826d1093d029cca22a1ee0b",
    // assessmentTitle: "ABLLS-R",
    // avatar: "https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/boy.png",
    // childAge: "3岁10个月",
    // childId: "6803b3a02ab442235e289bc5",
    // childName: "武昊天1",
    // classId: "67d2841d8a5c78c37ff0b54b",
    // className: "小班8班"
});
const assessmentSections = ref([]);
let activeCollapse = ['语言与沟通技能'];
// {
//     abllsSections: [
//         {
//             questionCount: "10题",
//             sectionName: "语言理解"
//         },
//         {
//             questionCount: "10题",
//             sectionName: "要求"
//         }
//     ],
//     assessment_id: "6826d1093d029cca22a1ee0b",
//     create_time: 1710000000000,
//     desc: "本模块根据ABLLS-R量表编排，包含语言理解、要求表达、要求、命名、内部语言、自发性语言和语句和语法。",
//     order: 1,
//     section: "语言与沟通技能",
//     section_id: "LANG_1",
//     update_time: 1710000000000,
//     _id: "681b033621821bbfdb469a48",
// },
// {
//     assessment_id: "6826d1093d029cca22a1ee0b",
//     create_time: 1710000000000,
//     desc: "本模块根据ABLLS-R量表编排，包含语言理解、要求表达、要求、命名、内部语言、自发性语言和语句和语法。",
//     order: 1,
//     section: "语言与沟通技能2",
//     section_id: "LANG_1",
//     update_time: 1710000000000,
//     _id: "681b033621821bbfdb469a48",
// }


const abllsSections = []

const show = ref(false);
const confirmInfo = ref([
    {
        label: "",
        name: "系统检测评估还没有完成。如果退出，当前进度会保存30天。",
    }
]);

const openCollapse = (e) => {
    console.log('openCollapse', e)
}

const closeCollapse = (e) => {
    console.log('closeCollapse', e)
}

const handleCollapseChange = (value) => {
    activeCollapse = [value];
    console.log('当前展开的面板:', value);
};

const handleOnClickSection = (sectionId, currentSection, currentAbllsSectionLength, currentAbllsSectionIdx, currentAbllsSectionObj, abllsSectionsObj) => {
    console.log('assessmentSections', assessmentSections.value)
    currentStudent.value = {
        ...currentStudent.value,
        allAssessmentSections: { ...assessmentSections.value },
        section: {
            abllsSectionsObj, // 大类
            currentSection: {
                currentSectionId: sectionId,
                currentSection: currentSection,
            },
            currentAbllsSection: { ...currentAbllsSectionObj, currentAbllsSectionLength, currentAbllsSectionIdx },
        },
    }
    uni.setStorageSync(ASSESS_STUDENT, currentStudent.value)

    uni.navigateTo({
        url: `/pages/assessment/form?currentSectionId=${sectionId}` +
            `&currentSection=${currentSection}` +
            `&currentAbllsSectionAlphabet=${currentAbllsSectionObj.abllsSectionAlphabet}` +
            `&currentAbllsSectionIdx=${currentAbllsSectionIdx}` +
            `&currentAbllsSection=${currentAbllsSectionObj.sectionName}` +
            `&age=${currentStudent.value.ageInt}`
    });
};


const navigateToLogin = () => {
    uni.navigateTo({
        url: '/uni_modules/uni-id-pages/pages/login/login-withoutpwd'
    });
}

const loadAssessmentSections = async (assessmentId, age) => {
    console.log('loadAssessmentSections:', assessmentId, age)
    try {
        const res = await uniCloud.callFunction({
            name: 'wt-fetch-assessment-section',
            data: {
                assessmentId,
                age
            }
        })
        if (res.result.code === 200) {
            // 确保数据结构正确
            assessmentSections.value = res.result.data.section || [];
            // 给每个section添加一个新的name属性，以order为name的值
            assessmentSections.value.forEach((section, index) => {
                section.name = section.section;
            });

            console.log('assessmentSections:', assessmentSections.value)
        }

    } catch (e) {
        console.error('加载失败:', e);
    }
}



// 在切换班级或需要刷新数据时清除缓存
const clearStudentsCache = (classId) => {
    const cacheKey = `class_${classId} _students`;
    uni.removeStorageSync(cacheKey);
};


onShow(() => {
    // 新增用户信息更新逻辑
    userInfo.value = uni.getStorageSync('uni-id-pages-userInfo') || {};
    checkLoginStatus();
})

onReachBottom(() => {
    console.log('onReachBottom');

})

onLoad((options) => {
    console.log('onLoad options:', options);
    if (options) {
        currentStudent.value = {
            ...options,
            ageInt: Number(options.ageInt) || 0
        };
        uni.setStorageSync(ASSESS_STUDENT, currentStudent.value);
        loadAssessmentSections(options.assessmentId, Number(options.ageInt));
    }
    userInfo.value = uni.getStorageSync('uni-id-pages-userInfo') || {};
});


onUnload(() => {
    uni.$off('reachBottom', onReachBottom)
    uni.removeStorageSync(ASSESS_STUDENT)
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

.u-page {
    padding: 0;

    &__item {

        &__title {
            color: $u-tips-color;
            background-color: $u-bg-color;
            padding: 15px;
            font-size: 15px;

            &__slot-title {
                color: $u-primary;
                font-size: 14px;
            }
        }
    }
}

.u-collapse-content {
    color: $u-tips-color;
    font-size: 14px;
}
</style>