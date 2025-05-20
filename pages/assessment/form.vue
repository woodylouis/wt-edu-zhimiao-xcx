<template>
    <!-- // abc 量表报告 -->
    <view class="assessment">
        <custom-nav :xcxName="'儿童成长评估'" :navCustomStyle="navCustomStyle" :needBar="false" :needBack="true"
            :backHandler="handleNavBack" />
        <view class="content">
            <view class="">
                <!-- <u-steps current="0" inactiveIcon="/static/assessment-list/active.svg"
                    activeIcon="/static/assessment-list/inactive.svg">
                    <u-steps-item title="" v-for="(item, index) in sectionNames" :key="index" iconSize="24" />
                </u-steps> -->
                <u-steps current="0">
                    <view v-for="(item, index) in sectionNames">
                        <u-steps-item :desc="item" />
                    </view>
                </u-steps>
            </view>
            <!-- 题目 -->
            <view class=""
                style="border-radius: 24px 24px 0px 0px;background: #FFF;height: 75vh;margin-top: 30rpx;padding: 0 34rpx;">
                <view style="display: flex;width: 100%;padding-top: 40rpx;align-items: center;">
                    <p>第{{ current }}题/共{{ count }}题</p>
                    <u-tag :text="section" plain style="padding-left: 22rpx;"></u-tag>
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
                        <u-radio-group v-model="answers[currentIndex]" placement="column" @change="groupChange">
                            <u-radio :customStyle="{ marginBottom: '8px' }"
                                v-for="(item, index) in questions[currentIndex]?.options" :key="index"
                                :label="item.text" :name="item.text">
                            </u-radio>
                        </u-radio-group>
                    </view>
                </view>
            </view>

            <view class="nav-buttons">
                <view style="display: flex;width: 100%;">
                    <u-button v-if="currentIndex > 0" @click="backToPrevious" :custom-style="{
                        ...buttonStyle1,
                        position: 'fixed',
                        bottom: '60rpx',
                        width: '250rpx'
                    }">上一题</u-button>
                    <u-button @click="goToNext" :custom-style="{
                        ...buttonStyle1,
                        position: 'fixed',
                        bottom: '60rpx',
                        right: '40rpx',
                        width: '250rpx'
                    }">下一题</u-button>
                </view>
            </view>



        </view>
    </view>
</template>

<script setup>
import customNav from '@/components/customNav';
import { onLoad } from '@dcloudio/uni-app'
import { ref, onMounted, computed, onUnmounted } from "vue";
import { generatePartialPlan } from '@/common/ai-model/deepseek.js';
import { ASSESS_STUDENT } from '@/lib/types/local_storage.js';

let childId = ref(''); // 通过childId获取儿童名字以及年龄
let classId = ref(''); // 通过班级id获取班级名字
let assessmentId = ref('');
const initialReport = ref('');
const detailedAdvice = ref('');
const interventionPlan = ref('');
const loading = ref(false);
const accessStudentInfo = uni.getStorageSync(ASSESS_STUDENT);
const allSections = accessStudentInfo.allAssessmentSections;
const result = Object.values(allSections).map(section => ({
    sectionId: section.section_id,
    sectionName: section.abllsSections.map(item => item.sectionName)
}));
const sectionNames = computed(() => {
    const currentSection = result.find(item => item.sectionId === tempQuestions.value.sectionId);
    return currentSection?.sectionName || [];
});
// const sectionNames = ["语言理解", "要求表达", "要求", "命名"];

console.log('sectionNames:', sectionNames);


const tempQuestions = ref(
    {
        "abllsSectionAlphabet": "C",
        "age": 3,
        "questions": [
            {
                "ablls_r_section": "语言理解",
                "ablls_r_section_alphabet": "C",
                "ablls_r_section_order": 3,
                "age_standards": [
                    { age: 2, expected_score: 2 },
                    { age: 3, expected_score: 2 },
                    { age: 4, expected_score: 2 },
                    { age: 5, expected_score: 2 },
                    { age: 6, expected_score: 2 },
                    { age: 7, expected_score: 2 },
                ],
                "content": "如果你拿着一个强化物，并要求学生看着它，学生会看着它吗?",
                "description": "",
                "expected_score": 2,
                "options": [
                    { text: "在3秒钟以内，看着在任何位置的强化物(上、下、左、右)", score: 2 },
                    { text: "看着强化物，但要求额外的提示才看或者超过3秒钟才做出反应", score: 1 },
                    { text: "无法完成", score: 0 }
                ],
                "section_id": "LANG_1",
                "task_name": "听从命令看着某个强化物",
                "task_name_eng": "Follow instructions tolook at a reinforcing item",
                "task_object": "按照要求，学生会看到老师拿着的某个强化物。",
                "task_sample": "nan",
                "type": "radio",
                "_id": "6826dda51021b06f3150457c",
            },
            {
                "ablls_r_section": "语言理解",
                "ablls_r_section_alphabet": "C",
                "ablls_r_section_order": 4,
                "age_standards": [
                    { age: 2, expected_score: 2 },
                    { age: 3, expected_score: 2 },
                    { age: 4, expected_score: 2 },
                    { age: 5, expected_score: 2 },
                    { age: 6, expected_score: 2 },
                    { age: 7, expected_score: 2 },
                ],
                "content": "如果你拿着一个学生渴望的东西，在他面前不同位置移动，学生会根据指令伸出手，摸或抓该东西吗?",
                "description": "",
                "expected_score": 2,
                "options": [
                    { text: "在3秒钟以内，看着在任何位置的强化物(上、下、左、右)", score: 2 },
                    { text: "看着强化物，但要求额外的提示才看或者超过3秒钟才做出反应", score: 1 },
                    { text: "无法完成", score: 0 }
                ],
                "section_id": "LANG_1",
                "task_name": "听从命令看着某个强化物",
                "task_name_eng": "Follow instructions tolook at a reinforcing item",
                "task_object": "按照要求，学生会看到老师拿着的某个强化物。",
                "task_sample": "nan",
                "type": "radio",
                "_id": "6826dda51021b06f3150457c",
            },

        ],
        "sectionId": "LANG_1",
        "totalQuestions": 45
    },
    {
        "abllsSectionAlphabet": "C",
        "age": 3,
        "questions": [
            {
                "ablls_r_section": "要求表达",
                "ablls_r_section_alphabet": "E",
                "ablls_r_section_order": 3,
                "age_standards": [
                    { age: 2, expected_score: 2 },
                    { age: 3, expected_score: 2 },
                    { age: 4, expected_score: 2 },
                    { age: 5, expected_score: 2 },
                    { age: 6, expected_score: 2 },
                    { age: 7, expected_score: 2 },
                ],
                "content": "如果你拿着一个强化物，并要求学生看着它，学生会看着它吗?",
                "description": "",
                "expected_score": 2,
                "options": [
                    { text: "在3秒钟以内，看着在任何位置的强化物(上、下、左、右)", score: 2 },
                    { text: "看着强化物，但要求额外的提示才看或者超过3秒钟才做出反应", score: 1 },
                    { text: "无法完成", score: 0 }
                ],
                "section_id": "LANG_1",
                "task_name": "听从命令看着某个强化物",
                "task_name_eng": "Follow instructions tolook at a reinforcing item",
                "task_object": "按照要求，学生会看到老师拿着的某个强化物。",
                "task_sample": "nan",
                "type": "radio",
                "_id": "6826dda51021b06f3150457c",
            },
            {
                "ablls_r_section": "语言理解",
                "ablls_r_section_alphabet": "C",
                "ablls_r_section_order": 4,
                "age_standards": [
                    { age: 2, expected_score: 2 },
                    { age: 3, expected_score: 2 },
                    { age: 4, expected_score: 2 },
                    { age: 5, expected_score: 2 },
                    { age: 6, expected_score: 2 },
                    { age: 7, expected_score: 2 },
                ],
                "content": "如果你拿着一个学生渴望的东西，在他面前不同位置移动，学生会根据指令伸出手，摸或抓该东西吗?",
                "description": "",
                "expected_score": 2,
                "options": [
                    { text: "在3秒钟以内，看着在任何位置的强化物(上、下、左、右)", score: 2 },
                    { text: "看着强化物，但要求额外的提示才看或者超过3秒钟才做出反应", score: 1 },
                    { text: "无法完成", score: 0 }
                ],
                "section_id": "LANG_1",
                "task_name": "听从命令看着某个强化物",
                "task_name_eng": "Follow instructions tolook at a reinforcing item",
                "task_object": "按照要求，学生会看到老师拿着的某个强化物。",
                "task_sample": "nan",
                "type": "radio",
                "_id": "6826dda51021b06f3150457c",
            },

        ],
        "sectionId": "LANG_1",
        "totalQuestions": 45
    }
);

const tempRecords = ref(
    {
        assessmentId: '',
        assessorId: '',
        childId: '',
        childName: '',
        childAge: '',
        // 当前问题
        snapshot: {
            ablls_r_section_alphabet: '',
            ablls_r_section_order: '',
            index: 0,
        },
        // 时间戳毫秒，自动生成
        startTimestamp: Date.now(),
        completionTime: 0, // 完成时间，单位毫秒，最后提交执行Date.now()
        // 持续时间秒
        duration: 0,  // 持续时间，单位秒，最后提交执行Date.now() - startTimestamp
        assessmentRecords: {
            sections: [
                {
                    sectionId: 'LANG_1',
                    sectionName: '语言与沟通技能',
                    sectionExpectTotalScore: 120, // 预期总分, 通过迭代abllsSections.questions下的数组对象的expectedScore字段计算得出
                    sectionActualTotalScore: 110, // 实际总分, 通过迭代abllsSections.questions下的数组对象的score字段计算得出, 默认0
                    abllsSections: {
                        alphabet: 'C',
                        totalQuestions: 2, // 总问题数, 计算questions.length
                        expectedTotalScore: 20, // 预期总分, 系统计算
                        actualTotalScore: 20, // 实际总分, 通过选择计算得出，默认0
                        sectioName: '语言理解',
                        questions: [
                            {
                                order: 3,
                                taskName: "听从命令看着某个强化物",
                                taskNameEng: "Follow instructions tolook at a reinforcing item",
                                taskObject: "按照要求，学生会看到老师拿着的某个强化物。",
                                taskSample: "nan",
                                question: "如果你拿着一个强化物，并要求学生看着它，学生会看到它吗?",
                                options: [
                                    { text: "在3秒钟以内，看着在任何位置的强化物(上、下、左、右)", score: 2 },
                                    { text: "看着强化物，但要求额外的提示才看或者超过3秒钟才做出反应", score: 1 },
                                    { text: "无法完成", score: 0 }
                                ],
                                selectedAnswer: "看着强化物，但要求额外的提示才看或者超过3秒钟才做出反应", // 默认空字符串
                                score: 1, // 实际得分, 通过选择得出，默认0
                                expectedScore: 2, // 相当于通过expected_score字段
                                isStandard: false, // 系统计算得出，如果score小于expectedScore，则未达标，为false。默认false。
                                hasSelected: true, // 是否选择了答案，默认false
                            }
                        ]
                    }
                }
            ]
        }

    }
)

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
const current = computed(() => currentIndex.value + 1);
const count = computed(() => questions.value.length);
const section = computed(() => questions.value[currentIndex.value]?.ablls_r_section || '');
const question = computed(() => questions.value[currentIndex.value]?.content || '');
const taskName = computed(() => questions.value[currentIndex.value]?.task_name || '');
const taskObject = computed(() => questions.value[currentIndex.value]?.task_object || '');

const assessmentMeta = ref({
    assessmentId: '',
    startTimestamp: 0,
    duration: 0,
    uuid: Date.now().toString(36) + Math.random().toString(36).substr(2) // 新增基于时间的UUID
});

const radioChange = () => {
    handleSubmit(questions[currentIndex]?.options[current].score)
}

const loadQuestions = async (sectionId, abllsSectionAlphabet, age) => {
    try {
        const res = await uniCloud.callFunction({
            name: 'wt-fetch-assessment-v2',
            data: { sectionId, abllsSectionAlphabet, age }
        });

        console.log('res:', res);
        if (res.result && res.result.data) {
            questions.value = res.result.data; // 将返回的题目数据赋值给questions
        }
    } catch (e) {
        uni.showToast({ title: '题目加载失败', icon: 'none' });
    }
};

// 在handleSubmit后添加返回上一题逻辑
const backToPrevious = () => {
    if (currentIndex.value > 0) {
        currentIndex.value--;
    }
};

const goToNext = () => {
    if (currentIndex.value < questions.value.length - 1) {
        currentIndex.value++;
    } else {
        uni.showToast({ title: '已经是最后一题', icon: 'none' });
    }
};

onLoad(async (options) => {
    // 初始化questions为tempQuestions的questions数组
    questions.value = tempQuestions.value.questions;

    console.log("options", options)
    // 新增加载提示
    uni.showLoading({
        title: options.currentAbllsSection + '题目',
        mask: true
    });

    try {

        // await loadQuestions(options.currentSectionId, options.currentAbllsSectionAlphabet, Number(options.age));
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
            bottom: 40rpx; // 调整底部导航位置
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