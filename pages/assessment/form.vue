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

let childId = ref(''); // 通过childId获取儿童名字以及年龄
let classId = ref(''); // 通过班级id获取班级名字
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

const testAI = async (answers) => {
    uni.showLoading({ title: 'AI分析中...' });
    let aiResponse = '';
    let loadingAI = false;

    try {
        const res = await uni.request({
            url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
            method: 'POST',
            header: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer 005aeb28-621e-425f-8540-14503fe172a6'
            },
            data: {
                model: "deepseek-v3-250324",
                messages: [
                    {
                        role: "system",
                        content: "你是BACB的专家，现在需要分析基本语言和学习技能评估(ABLLS-R)的量表评估结果。目前量表里不是完整的题目，只挑了部份的运动和语言的题目。得分大于0表示选择'是'。不要再把每个题目在写一遍。针对个体的年龄，请以精简和专业的话术给出个性化专业建议，必要时在报告里可以提个体的年龄。分析有三个部分，第一个的标题是分析， 第二个是建议，第三个是干预计划。" // 直接使用字符串
                    },
                    {
                        role: "user",
                        content: JSON.stringify(answers)
                    }
                ]
            }
        });

        if (res.statusCode === 200 && res.data?.choices?.[0]?.message?.content) {
            aiResponse = res.data.choices[0].message.content;
            return aiResponse;
        }
        return '';
    } catch (e) {
        const shouldRetry = await new Promise((resolve) => {
            uni.showModal({
                title: '提示',
                content: '服务异常，是否重试？',
                confirmText: '重试',
                cancelText: '取消',
                success: ({ confirm }) => {
                    resolve(confirm);
                }
            });
        });

        if (shouldRetry) {
            return await testAI(answers); // 递归调用重试
        }
        return '';
    } finally {
        uni.hideLoading();
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

        uni.showModal({
            title: '评估完成',
            content: `总得分：${totalScore}，确定要查看报告吗？`,
            success: async (res) => { // 改为async函数
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
                    const answersArray = Object.values(finalData.answers).map(answer => ({
                        childName: assessmentMeta.value.childName, // 新增儿童姓名
                        childAge: assessmentMeta.value.childAge,   // 新增儿童年龄
                        question: answer.question?.content || '未知题目',
                        answer: answer.score > 0 ? '是' : '否',
                    }));
                    uni.showLoading({ title: '生成报告中...' }); // 新增加载提示
                    const analysisTextAIRes = await testAI(answersArray);
                    console.log('analysisTextAIRes:', analysisTextAIRes);
                    uni.hideLoading();

                    // 这里需要加一个uni.loading.hide()，因为testAI是一个异步函数，它可能会在一段时间后才返回结果
                    uni.navigateTo({
                        url: `/pages/assessment/report?assessmentId=${assessmentId.value}&analysisTextAI=${analysisTextAIRes}`
                    });
                }
            }
        });
    }
};

const updateCache = () => {
    const cacheData = {
        ...assessmentMeta.value,
        classId: assessmentMeta.value.classId,
        className: assessmentMeta.value.className,
        childId: assessmentMeta.value.childId,
        childName: assessmentMeta.value.childName,
        childAge: assessmentMeta.value.childAge, // 新增年龄存储
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