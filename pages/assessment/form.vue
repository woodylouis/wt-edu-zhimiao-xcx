<template>
    <!-- // abc 量表报告 -->
    <view class="assessment">
        <custom-nav :xcxName="'儿童成长评估'" :navCustomStyle="navCustomStyle" :needBar="false" :needBack="true"
            :backHandler="handleNavBack" />
        <view class="content">
            <view class="progress">
                <view class="title">
                    <view>进度</view>
                    <view> {{ persentage }}% </view>
                </view>
                <view class="progress-bar">
                    <u-line-progress :percentage="persentage" activeColor="#6EDE8A" inactiveColor="#C9E8D1"
                        :showText="false"></u-line-progress>
                </view>
                <view class="current">{{ current }}/{{ count }} 问题</view>
            </view>
            <view class="question-part">
                <view class="section"> {{ section }} </view>
                <view class="question"> {{ question }} </view>
            </view>

            <view class="button-group">
                <u-button v-for="(option, index) in questions[currentIndex]?.options" :key="index"
                    @click="handleSubmit(option.score)" :custom-style="getButtonStyle(option.score)">
                    {{ option.text }}
                </u-button>
            </view>

            <view class="nav-buttons">
                <u-button v-if="currentIndex > 0" @click="backToPrevious" :custom-style="{
                    ...buttonStyle1,
                    position: 'fixed',
                    bottom: '60rpx',
                    width: 'calc(100% - 80rpx)'
                }">返回上一题</u-button>
            </view>



        </view>
    </view>
</template>

<script setup>
import customNav from '@/components/customNav';
import { onLoad } from '@dcloudio/uni-app'
import { ref, onMounted, computed, onUnmounted } from "vue";
import { generatePartialPlan } from '@/common/ai-model/deepseek.js';

let childId = ref(''); // 通过childId获取儿童名字以及年龄
let classId = ref(''); // 通过班级id获取班级名字
let assessmentId = ref('');
const initialReport = ref('');
const detailedAdvice = ref('');
const interventionPlan = ref('');
const loading = ref(false);

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
const optionStyles = ref({
    selected: {
        backgroundColor: "#6EDE8A",
        color: "#00214D",
        border: "2px solid #6EDE8A"
    },
    unselected: {
        backgroundColor: "#DEF2E3",
        color: "#00214D",
        border: "none"
    },
    base: {
        borderRadius: "48rpx",
        fontSize: "32rpx",
        padding: "26rpx 0",
        height: "48px",
        marginTop: "40rpx",
        width: "100%"
    }
});


const navCustomStyle = 'background: #F2F7F6;height: calc(100vh / 8)'

// 新增状态管理
const questions = ref([]);          // 题目列表
const currentIndex = ref(0);        // 当前题目索引
const answers = ref({});            // 答案存储对象

// 计算属性改造
const persentage = computed(() => {
    return ((currentIndex.value + 1) / questions.value.length * 100).toFixed(0);
});

const current = computed(() => currentIndex.value + 1);
const count = computed(() => questions.value.length);
const section = computed(() => questions.value[currentIndex.value]?.section || '');
const question = computed(() => questions.value[currentIndex.value]?.content || '');

const assessmentMeta = ref({
    assessmentId: '',
    startTimestamp: 0,
    duration: 0,
    uuid: Date.now().toString(36) + Math.random().toString(36).substr(2) // 新增基于时间的UUID
});

async function handleGenerateReport(answers) {


    try {
        loading.value = true;
        uni.showLoading({ title: '生成报告中...' });

        const result = await generatePartialPlan(JSON.stringify(answers), 1, 3);


        console.log('result:', result);
        uni.showToast({ title: '生成成功', icon: 'success' });
        await uploadAIResponse(result);
    } catch (err) {
        console.error(err);
        uni.showToast({ title: '生成失败', icon: 'error' });
    } finally {
        uni.hideLoading();
        loading.value = false;
    }
}

const uploadAIResponse = async (aiResponse) => {
    try {
        console.log('上传AI分析结果');
        const cacheKey = `assessment_${assessmentId.value}`;
        const cachedData = uni.getStorageSync(cacheKey);

        if (!cachedData) {
            throw new Error('未找到评估数据');
        }

        const res = await uniCloud.callFunction({
            name: 'wt-business-report-gen',
            data: {
                uuid: assessmentMeta.value.uuid,
                assessmentData: {
                    ...cachedData,
                    aiResponse: aiResponse,
                    assessorId: cachedData.assessorId // 确保上传时包含评估者ID
                }
            }
        });

        if (res.result.code) {
            console.error('AI分析结果上传失败:', res.result.message);
            throw new Error(res.result.message);
        }
    } catch (e) {
        console.error('AI分析结果上传异常:', e);
        throw e;
    }
};

const loadQuestions = async () => {
    try {
        const cacheKey = `assessment_${assessmentId.value}`;
        const cachedData = uni.getStorageSync(cacheKey);

        if (cachedData) {
            // 合并所有元数据字段
            assessmentMeta.value = {
                ...assessmentMeta.value,
                childAge: cachedData.childAge, // 恢复年龄数据
                assessmentId: cachedData.assessmentId || assessmentId.value,
                classId: cachedData.classId,         // 新增
                className: cachedData.className,     // 新增
                childId: cachedData.childId,         // 新增
                childName: cachedData.childName,     // 新增
                startTimestamp: cachedData.startTimestamp || Date.now(),
                duration: cachedData.duration || 0,
                uuid: cachedData.uuid || Date.now().toString(36) + Math.random().toString(36).substr(2)
            };

            // 更新缓存结构确保包含最新字段
            updateCache();
        } else {
            const res = await uniCloud.callFunction({
                name: 'wt-fetch-assessment',
                data: { assessmentId: assessmentId.value }
            });

            // 新的初始化结构
            const initialAnswers = res.result.data.reduce((acc, cur) => {
                acc[cur._id] = {
                    score: null,
                    question: cur // 存储完整题目对象
                };
                return acc;
            }, {});

            questions.value = res.result.data;
            answers.value = initialAnswers;

            uni.setStorageSync(cacheKey, {
                questions: res.result.data,
                answers: initialAnswers,
                currentIndex: 0,
                totalScore: 0,
                sectionScores: {}
            });
        }
    } catch (e) {
        uni.showToast({ title: '题目加载失败', icon: 'none' });
    }
};

// 重构跳转逻辑
const handleNextQuestion = () => {
    if (currentIndex.value < questions.value.length - 1) {
        currentIndex.value++;
    } else {
        const totalScore = calculateTotalScore();
        const sectionScores = calculateSectionScores();

        // 构建分数详情字符串
        let scoreDetails = '';
        for (const [section, score] of Object.entries(sectionScores)) {
            scoreDetails += `${section}得分：${score}\n`;
        }

        uni.showModal({
            title: '评估完成，确定要查看报告吗？',
            content: `${scoreDetails}\n`,
            success: async (res) => {
                if (res.confirm) {
                    // 强制提交最后一次答案
                    updateCache();

                    const cacheKey = `assessment_${assessmentId.value}`;
                    const cachedData = uni.getStorageSync(cacheKey);

                    const finalData = {
                        ...cachedData,
                        completionTime: Date.now()
                    };

                    uni.setStorageSync(cacheKey, finalData);
                    try {
                        const res = await uniCloud.callFunction({
                            name: 'wt-business-report-gen',
                            data: {
                                uuid: assessmentMeta.value.uuid,
                                assessmentData: finalData // 使用包含完成时间的最新数据
                            }
                        });

                        if (res.result.code) {
                            console.error('最终保存失败:', res.result.message);
                        }
                    } catch (e) {
                        console.error('最终云函数调用失败:', e);
                    }

                    // 整理答案数据
                    const answersObj = {
                        answers: Object.values(finalData.answers).map(answer => ({
                            question: answer.question?.content || '未知题目',
                            answer: answer.score > 0 ? '是' : '否'
                        })),
                        childName: assessmentMeta.value.childName,
                        childAge: assessmentMeta.value.childAge,
                        sectionScores: cachedData.sectionScores
                    };
                    console.log('answersObj:', answersObj);
                    uni.showLoading({
                        title: '生成报告中...',
                        mask: true
                    });// 新增加载提示
                    const analysisTextAIRes = await handleGenerateReport(answersObj);
                    uni.hideLoading();
                    uni.removeStorageSync('current_class_students')
                    uni.navigateTo({
                        url: `/pages/assessment/report?assessmentId=${assessmentId.value}&analysisTextAI=${analysisTextAIRes}&childId=${assessmentMeta.value.childId}`
                    });
                }
            }
        });
    }
};

const updateCache = () => {
    // 获取当前用户信息
    const userInfo = uni.getStorageSync('uni-id-pages-userInfo') || {};

    const cacheData = {
        ...assessmentMeta.value,
        classId: assessmentMeta.value.classId,
        className: assessmentMeta.value.className,
        childId: assessmentMeta.value.childId,
        childName: assessmentMeta.value.childName,
        childAge: assessmentMeta.value.childAge,
        assessorId: userInfo._id, // 新增评估者ID
        questions: questions.value,
        answers: answers.value,
        currentIndex: currentIndex.value,
        totalScore: calculateTotalScore(),
        sectionScores: calculateSectionScores(),
        lastUpdated: Date.now()
    };
    uni.setStorageSync(`assessment_${assessmentId.value}`, cacheData);
};

const debounce = ref(false); // 新增防抖状态

const handleSubmit = async (score) => {
    if (debounce.value) return; // 防抖拦截
    debounce.value = true;      // 开启防抖

    const currentQid = questions.value[currentIndex.value]._id;

    answers.value = {
        ...answers.value,
        [currentQid]: {
            score: score,
            question: questions.value[currentIndex.value]
        }
    };

    updateCache(); // 统一使用缓存更新方法

    try {
        const cacheKey = `assessment_${assessmentId.value}`;
        const cachedData = uni.getStorageSync(cacheKey);

        const res = await uniCloud.callFunction({
            name: 'wt-business-report-gen',
            data: {
                uuid: assessmentMeta.value.uuid,
                assessmentData: cachedData
            }
        });

        if (res.result.code) {
            console.error('保存失败:', res.result.message);
        }
    } catch (e) {
        console.error('云函数调用失败:', e);
    }

    // 200ms后释放防抖
    setTimeout(() => {
        debounce.value = false;
        handleNextQuestion();
    }, 50);
};

// 新增分数计算逻辑
const calculateTotalScore = () => {
    return Object.values(answers.value).reduce((sum, item) => sum + (item?.score || 0), 0);
};

// 新增样式计算逻辑
const getButtonStyle = (score) => {
    const currentQid = questions.value[currentIndex.value]?._id;
    return {
        ...optionStyles.value.base,
        ...(answers.value[currentQid]?.score === score ?
            optionStyles.value.selected :
            optionStyles.value.unselected)
    };
};

// 新增维度分数计算
const calculateSectionScores = () => {
    return Object.values(answers.value).reduce((acc, item) => {
        if (item?.score && item.question) {
            const section = item.question.section;
            acc[section] = (acc[section] || 0) + item.score;
        }
        return acc;
    }, {});
};

// 在handleSubmit后添加返回上一题逻辑
const backToPrevious = () => {
    if (currentIndex.value > 0) {
        currentIndex.value--;
    }
};


const cacheKey = `assessment_${assessmentId.value}`;
// 在loadQuestions后添加导航返回拦截
const handleNavBack = () => {
    if (Object.keys(answers.value).length > 0) {
        uni.showModal({
            title: '提示',
            content: '评估进度将在30天后自动清除，确定要离开吗？',
            success: (res) => {
                if (res.confirm) {
                    uni.navigateBack();
                    const cacheKey = `assessment_${assessmentId.value}`;
                    uni.removeStorageSync(cacheKey);
                    // TODO-提交评估进度
                }
            }
        });
    } else {
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
    console.log("options", options)

    // 新增加载提示
    uni.showLoading({
        title: '题目加载中...',
        mask: true
    });

    try {
        assessmentId.value = options.assessmentId;
        childId.value = options.childId;

        assessmentMeta.value = {
            assessmentId: assessmentId.value,
            classId: options.classId,
            className: options.className,
            childId: options.childId,
            childName: options.childName,
            childAge: options.childAge,
            startTimestamp: Date.now(),
            duration: 0,
            uuid: Date.now().toString(36) + Math.random().toString(36).substr(2)
        };

        await loadQuestions();
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
        padding: 0 40rpx;
        background-color: #F2F7F6;
        height: calc(100vh - 100vh / 8);

        .button-group {
            position: fixed;
            top: 50%; // 固定在屏幕中间位置
            left: 40rpx;
            right: 40rpx;
            // gap: 32rpx; // 新增按钮间距
            display: flex;
            flex-direction: column;
        }

        .nav-buttons {
            position: fixed;
            bottom: 160rpx; // 调整底部导航位置
            left: 40rpx;
            right: 40rpx;
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
</style>