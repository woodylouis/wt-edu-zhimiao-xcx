<template>
    <!-- // abc 量表报告 -->
    <view class="assessment">
        <custom-nav :xcxName="'儿童成长评估'" :navCustomStyle="navCustomStyle" :needBar="false" :needBack="true"
            :backHandler="handleNavBack" />
        <view class="content">
            <view class="">
                <u-steps current="0" inactiveIcon="/static/assessment-list/active.svg"
                    activeIcon="/static/assessment-list/inactive.svg">
                    <u-steps-item title="" v-for="(item, index) in 3" :key="index" iconSize="24">
                    </u-steps-item>
                </u-steps>
            </view>
            <!-- <view class="progress">
                <view class="title">
                    <view>进度</view>
                    <view> {{ persentage }}% </view>
                </view>
                <view class="progress-bar">
                    <u-line-progress :percentage="persentage" activeColor="#6EDE8A" inactiveColor="#C9E8D1"
                        :showText="false"></u-line-progress>
                </view>
                <view class="current">{{ current }}/{{ count }} 问题</view>
            </view> -->
            <!-- 题目 -->
            <view class=""
                style="border-radius: 24px 24px 0px 0px;background: #FFF;height: 75vh;margin-top: 30rpx;padding: 0 34rpx;">
                <view style="display: flex;width: 100%;padding-top: 40rpx;align-items: center;">
                    <p>第{{ current }}题/共{{ count }}题</p>
                    <u-tag text="语言理解" plain style="padding-left: 22rpx;"></u-tag>
                </view>
                <view class="" style="padding-top: 42rpx;">
                    <view class="section">
                        <p
                            style="color: #3D464A;font-size: 22px;font-style: normal;font-weight: 600;line-height: normal;">
                            {{ section }}</p>
                    </view>
                    <view class="" style="padding-top: 18rpx;">
                        <p
                            style="color: #3D464A;font-size: 13px;font-style: normal;font-weight: 400;line-height: 20px; /* 153.846% */">
                            {{ question }}</p>
                    </view>
                </view>

                <u-divider></u-divider>

                <view class="question-part">
                    <p style="color: #3D464A;font-size: 18px;font-style: normal;font-weight: 600;line-height: 24px;">
                        {{ question }} </p>
                    <view style="padding-top: 6rpx;">
                        <u-radio-group v-model="radiovalue1" placement="column" @change="groupChange">
                            <u-radio :customStyle="{ marginBottom: '8px' }"
                                v-for="(item, index) in questions[currentIndex]?.options" :key="index"
                                :label="item.text" :name="item.text" @change="radioChange">
                            </u-radio>
                        </u-radio-group>
                    </view>
                </view>

                <!-- <view class="button-group">
				     <u-button v-for="(option, index) in questions[currentIndex]?.options" :key="index"
				         @click="handleSubmit(option.score)" :custom-style="getButtonStyle(option.score)">
				         {{ option.text }}
				     </u-button>
				 </view> -->

            </view>

            <view class="nav-buttons">
                <!-- <u-button v-if="true" @click="backToPrevious" :custom-style="{
                    ...buttonStyle1,
                    position: 'fixed',
                    bottom: '60rpx',
                    width: 'calc(100% - 80rpx)'
                }">返回上一题</u-button> -->
                <view style="display: flex;width: 100%;">
                    <u-button v-if="true" @click="backToPrevious" :custom-style="{
                        ...buttonStyle1,
                        position: 'fixed',
                        bottom: '60rpx',
                        width: '250rpx'
                    }">上一题</u-button>
                    <!-- <u-button @click="backToPrevious" :custom-style="{
					    ...buttonStyle1,
					    position: 'fixed',
					    bottom: '60rpx',
						width:'250rpx'
					}">下一题</u-button> -->
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


onLoad(async (options) => {
    console.log("options", options)
    // 新增加载提示
    uni.showLoading({
        title: options.currentAbllsSection + '题目',
        mask: true
    });

    try {

        await loadQuestions(options.currentSectionId, options.currentAbllsSectionAlphabet, Number(options.age));
    } catch (e) {
        uni.showToast({ title: '加载失败，请返回重试', icon: 'none' });
    } finally {
        // uni.hideLoading(); // 无论成功失败都关闭加载
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