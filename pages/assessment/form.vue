<template>
    <view class="assessment">
        <custom-nav :xcxName="'儿童成长评估'" :navCustomStyle="navCustomStyle" :needBar="false" :needBack="true" />
        <view class="content">
            <view class="progress">
                <view class="title">
                    <view>进度</view>
                    <view> {{ persentage }} </view>
                </view>
                <view class="progress-bar">
                    <u-line-progress :percentage="30" activeColor="#6EDE8A" inactiveColor="#C9E8D1" :showText="false"></u-line-progress>
                </view>
                <view class="current">{{ current }}/{{ count }} 问题</view>
            </view>
            <view class="question-part">
                <view class="section"> {{ section }} </view>
                <view class="question"> {{ question }} </view>
            </view>
            <u-button @click="handleSubmit" :custom-style="buttonStyle1">是</u-button>
            <u-button @click="handleSubmit" :custom-style="buttonStyle2">否</u-button>



        </view>
    </view>
</template>

<script setup>
import customNav from '@/components/customNav';
import { onLoad } from '@dcloudio/uni-app'
import { ref, onMounted, computed, onUnmounted } from "vue";

let childId = ref('');
let assessmentId = ref('');
// let current = ref(3);
// let count = ref(10);
// let section = ref('运动');
// let persentage = ref('30%');
// let question = ref('喜欢长时间的自身旋转。');
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
    backgroundColor: "#DEF2E3",
    color: "rgba(0, 33, 77, 1)",
    borderRadius: "48rpx",
    fontWeight: "500",
    fontSize: "32rpx",
    padding: "26rpx 0",
    height: "48px",
    marginTop: "40rpx"
}


const navCustomStyle = 'background: #F2F7F6;height: calc(100vh / 8)'

// 新增状态管理
const questions = ref([]);          // 题目列表
const currentIndex = ref(0);        // 当前题目索引
const answers = ref({});            // 答案存储对象

// 计算属性改造
const persentage = computed(() => {
    return ((currentIndex.value + 1) / questions.value.length * 100).toFixed(0) + '%';
});

const current = computed(() => currentIndex.value + 1);
const count = computed(() => questions.value.length);
const section = computed(() => questions.value[currentIndex.value]?.section || '');
const question = computed(() => questions.value[currentIndex.value]?.content || '');

// 新增数据加载逻辑
const loadQuestions = async () => {
    try {
        const cacheKey = `assessment_${assessmentId.value}`;
        const cachedData = uni.getStorageSync(cacheKey);

        if (cachedData) {
            questions.value = cachedData.questions;
            answers.value = cachedData.answers;
            currentIndex.value = cachedData.currentIndex;
        } else {
            const res = await uniCloud.callFunction({
                name: 'wt-fetch-assessment',
                data: { assessmentId: assessmentId.value }
            });

            questions.value = res.result.data;
            uni.setStorageSync(cacheKey, {
                questions: res.result.data,
                answers: {},
                currentIndex: 0
            });
        }
    } catch (e) {
        uni.showToast({ title: '题目加载失败', icon: 'none' });
    }
};

// 改造提交处理
const handleSubmit = (answer) => {
    const cacheKey = `assessment_${assessmentId.value}`;

    // 记录答案
    answers.value[questions.value[currentIndex.value]._id] = answer;

    // 更新缓存
    uni.setStorageSync(cacheKey, {
        questions: questions.value,
        answers: answers.value,
        currentIndex: currentIndex.value
    });

    // 跳转下一题或提交
    if (currentIndex.value < questions.value.length - 1) {
        currentIndex.value++;
    } else {
        // 提交逻辑
        uni.showToast({ title: '评估完成', icon: 'success' });
        uni.removeStorageSync(cacheKey);
        uni.navigateBack();
    }
};

// 新增生命周期处理
onUnmounted(() => {
    const cacheKey = `assessment_${assessmentId.value}`;
    uni.removeStorageSync(cacheKey);
});

// 改造onLoad
onLoad(async (options) => {
    assessmentId.value = options.assessmentId;
    childId.value = options.childId;
    await loadQuestions();
});
</script>

<style lang="scss" scoped>
.assessment {
    .content {
        padding: 0 40rpx;
        background-color: #F2F7F6;
        height: calc(100vh - 100vh / 8);

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
</style>