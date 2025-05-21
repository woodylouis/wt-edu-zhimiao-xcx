<template>
    <!-- // abc 量表报告 -->
    <view class="assessment">
        <custom-nav :xcxName="currentSection" :navCustomStyle="navCustomStyle" :needBar="false" :needBack="true"
            :backHandler="handleNavBack" />
        <view class="content">
            <view class="steps-container">
                <scroll-view scroll-x class="steps-scroll" show-scrollbar="false">
                    <view class="steps-wrapper">
                        <view v-for="(item, index) in currentAbllsNameList" :key="index" class="step-item"
                            :class="{ active: index === stepCurrentIndex }" @click="handleStepClick(item, index)">
                            {{ item.sectionName }}
                        </view>
                    </view>
                </scroll-view>
            </view>
            <!-- 题目 -->
            <view class="question-container">
                <view style="display: flex;width: 100%;padding-top: 40rpx;align-items: center;">
                    <p>第{{ current }}题/共{{ count }}题</p>
                    <u-tag :text="section" plain type="warning" borderColor="#6EDD8A" bgColor="#6EDD8A" color="#00214D"
                        shape="circle" style="padding-left: 22rpx;"></u-tag>
                </view>
                <view class="" style="padding-top: 42rpx;">
                    <view class="section">
                        <p
                            style="color: #3D464A;font-size: 22px;font-style: normal;font-weight: 600;line-height: normal;">
                            {{ taskName }}</p>
                    </view>
                    <view class="" style="padding-top: 18rpx;">
                        <p
                            style="color: #3D464A;font-size: 13px;font-style: normal;font-weight: 400;line-height: 20px; /* 153.846% */">
                            {{ taskObject }}</p>
                    </view>
                </view>

                <u-divider></u-divider>

                <view class="question-part">
                    <p style="color: #3D464A;font-size: 18px;font-style: normal;font-weight: 600;line-height: 24px;">
                        {{ question }} </p>
                    <view style="padding-top: 6rpx;">
                        <up-radio-group v-model="selectedAnswer" placement="column" @change="groupChange">
                            <up-radio :customStyle="{ marginBottom: '8px' }" activeColor="#6EDD8A"
                                v-for="(item, index) in questions[currentIndex]?.options" :key="index"
                                :label="item.name" :name="item.name" @change="radioChange">
                            </up-radio>
                        </up-radio-group>
                    </view>
                    {{ selectedAnswer }}
                </view>
            </view>

            <view class="bottom">
                <view class="nav-buttons">
                    <view style="display: flex;width: 100%;">
                        <u-button v-if="currentIndex > 0" @click="backToPrevious" :custom-style="{
                            ...buttonStyle2,
                            position: 'fixed',
                            bottom: '60rpx',
                            width: '300rpx'
                        }">上一题</u-button>
                        <u-button @click="goToNext" :custom-style="{
                            ...buttonStyle1,
                            position: 'fixed',
                            bottom: '60rpx',
                            right: '40rpx',
                            width: '300rpx'
                        }">下一题</u-button>
                    </view>
                </view>
            </view>




        </view>
    </view>
</template>

<script setup>
import customNav from '@/components/customNav';
import { onLoad } from '@dcloudio/uni-app'
import { ref, reactive, onMounted, computed, watch } from "vue";
import { generatePartialPlan } from '@/common/ai-model/deepseek.js';
import { ASSESS_STUDENT } from '@/lib/types/local_storage.js';

let childId = ref(''); // 通过childId获取儿童名字以及年龄
let classId = ref(''); // 通过班级idwatch
const initialReport = ref('');
const detailedAdvice = ref('');
const interventionPlan = ref('');
const loading = ref(false);
const accessStudentInfo = uni.getStorageSync(ASSESS_STUDENT);
// console.log('accessStudentInfo:', accessStudentInfo)
const allAssessmentSections = accessStudentInfo.allAssessmentSections;
const childAgeInt = accessStudentInfo.ageInt;
const currentSectionId = accessStudentInfo.section.currentSection.currentSectionId
const currentSection = accessStudentInfo.section.currentSection.currentSection
const currentAbllsSectionAlphabet = accessStudentInfo.section.currentAbllsSection.abllsSectionAlphabet;
const currentAbllsSectionName = accessStudentInfo.section.currentAbllsSection.sectionName;
const sections = Object.values(allAssessmentSections).map(section => ({
    sectionId: section.section_id,
    sectionName: section.abllsSections.map(item => item.sectionName)
}));
const currentAbllsNameList = accessStudentInfo.section.abllsSectionsObj;
const stepCurrentIndex = ref(
    currentAbllsNameList.findIndex(item => item.abllsSectionAlphabet === currentAbllsSectionAlphabet)
);
// 新增状态管理
const questions = ref([]);          // 题目列表
const currentIndex = ref(0);        // 当前题目索引
const answers = ref([]);
const selectedAnswer = ref('在10秒钟之内，能模仿5个音');        // 所有答案
const current = computed(() => currentIndex.value + 1);
const count = computed(() => questions.value.length);
const section = computed(() => questions.value[currentIndex.value]?.ablls_r_section || '');
const question = computed(() => questions.value[currentIndex.value]?.content || '');
const options = reactive(() => questions[currentIndex]?.options || [])
const expectedScore = computed(() => questions.value[currentIndex.value]?.expected_score || 0);
const taskName = computed(() => questions.value[currentIndex.value]?.task_name || '');
const taskObject = computed(() => questions.value[currentIndex.value]?.task_object || '');

// 监听selectedAnswer变化
watch(selectedAnswer, (newValue, oldValue) => {
    console.log('selectedAnswer changed:', newValue, 'from:', oldValue);
})

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
    backgroundColor: "#FFFFFF",
    color: "#6EDD8A",
    border: "2px solid #6EDD8A",
    borderRadius: "48rpx",
    fontWeight: "500",
    fontSize: "32rpx",
    padding: "26rpx 0",
    height: "48px",
    marginTop: "40rpx",
    fontWeight: "500"
}

const navCustomStyle = 'background: #F2F7F6;height: calc(100vh / 8)'

const assessmentMeta = ref({
    assessmentId: '',
    startTimestamp: 0,
    duration: 0,
    uuid: Date.now().toString(36) + Math.random().toString(36).substr(2) // 新增基于时间的UUID
});

const groupChange = (value) => {
    console.log('groupChange', value)

}

const radioChange = (item) => {
    console.log('radioChange', item)
    answers.value[currentIndex.value] = item; // 确保更新answers数组
    selectedAnswer.value = item; // 更新选中值
};


// 在handleSubmit后添加返回上一题逻辑
const backToPrevious = () => {
    if (currentIndex.value > 0) {
        currentIndex.value--;
        selectedAnswer.value = answers.value[currentIndex.value] || ''; // 回填上一题的答案
        console.log('answers', answers.value, 'selectedAnswer', selectedAnswer.value, 'currentIndex', currentIndex.value)
    }
};

const goToNext = () => {
    if (!answers.value[currentIndex.value]) {
        uni.showToast({
            title: '请先选择答案',
            icon: 'none',
            duration: 2000
        });
        return;
    }

    if (currentIndex.value < questions.value.length - 1) {
        currentIndex.value++;
        selectedAnswer.value = answers.value[currentIndex.value] || '';
        console.log('answers', answers.value, 'selectedAnswer', selectedAnswer.value, 'currentIndex', currentIndex.value)

    }
};

const handleStepClick = async (item, index) => {
    if (stepCurrentIndex.value === index) return;

    uni.showLoading({ title: '加载题目...', mask: true });
    try {
        await loadQuestions(
            currentSectionId,
            item.abllsSectionAlphabet,
            childAgeInt
        );
        stepCurrentIndex.value = index;
        currentIndex.value = 0; // TO-DO: 需要根据当前自动跳转到某个题目，暂时先跳转到第一个题目
    } catch (e) {
        uni.showToast({ title: '加载失败', icon: 'none' });
    } finally {
        uni.hideLoading();
    }
};

const loadQuestions = async (sectionId, abllsSectionAlphabet, age) => {
    try {
        const res = await uniCloud.callFunction({
            name: 'wt-fetch-assessment-v2',
            data: { sectionId, abllsSectionAlphabet, age }
        });

        if (res.result && res.result.data) {
            questions.value = res.result.data.questions;
            // answers.value = new Array(questions.value.length).fill('');
            // 需要确保当前索引的答案被正确设置
            // selectedAnswer = answers.value[currentIndex.value] || '';
        }
    } catch (e) {
        console.log(e)
        uni.showToast({ title: '题目加载失败', icon: 'none' });
    }
};


onLoad(async (options) => {
    // 初始化questions为tempQuestions的questions数组
    // console.log("options", options)
    // 新增加载提示
    uni.showLoading({
        title: options.currentAbllsSection + '题目',
        mask: true
    });

    try {
        await loadQuestions(currentSectionId, currentAbllsSectionAlphabet, childAgeInt);
    } catch (e) {
        uni.showToast({ title: '加载失败，请返回重试', icon: 'none' });
    } finally {
        uni.hideLoading(); // 无论成功失败都关闭加载
    }
});
</script>

<style lang="scss" scoped>
.assessment {
    .content {
        // padding: 0 40rpx;
        background-color: #F2F7F6;
        height: calc(100vh - 100vh / 8);

        .steps-container {
            height: 4vh;
        }

        .button-group {
            position: fixed;
            top: 50%; // 固定在屏幕中间位置
            left: 40rpx;
            right: 40rpx;
            // gap: 32rpx; // 新增按钮间距
            display: flex;
            flex-direction: column;
        }


        .bottom {
            background-color: #FFFFFF;
            height: calc(100vh - calc(100vh / 8) - 4vh - 70vh - 30rpx);
            box-shadow: 0px -4px 12px 0px rgba(0, 0, 0, 0.08);

            .nav-buttons {
                position: fixed;
                bottom: 40rpx; // 调整底部导航位置
                left: 40rpx;
                right: 40rpx;
            }
        }


        .question-container {
            border-radius: 24px 24px 0px 0px;
            background: #FFF;
            height: 70vh;
            margin-top: 30rpx;
            padding: 0 34rpx;
            // 底部内阴影

        }

        .question-part {
            margin-bottom: 0; // 移除原有底部间距
            min-height: 40vh; // 确保题目区域最小高度
        }

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

            .progress-bar {
                margin-bottom: 24rpx;
            }

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

.steps-scroll {
    white-space: nowrap;
    width: 100%;
}

.steps-wrapper {
    display: flex;
    flex-direction: row;
    padding: 0 16rpx;
}

.step-item {
    flex-shrink: 0;
    padding: 16rpx 24rpx;
    border-bottom: 4rpx solid transparent;
    font-size: 26rpx;
    white-space: nowrap;
}

.step-item.active {
    color: rgba(0, 33, 77, 1);
    border-bottom-color: rgba(110, 221, 138, 1);
    font-weight: bold;
}
</style>