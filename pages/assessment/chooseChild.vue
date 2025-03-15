<template>
    <view class="assessment">
        <custom-nav :xcxName="'信息填写'" :navCustomStyle="navCustomStyle" :needBar="false" :needBack="true" />
        <view class="content">
            <view class="header-info">
                <view class="hello">Hi, {{ displayName }}老师 !</view>
                <view class="class"> {{ currentClass }} </view>
            </view>
            <view class="info">
                <view class="title">个人信息</view>
                <view class="instruction">请输入您要进行儿童量表评估的小朋友姓名，系统将根据您的选择进入相应的评估流程。</view>
            </view>
            <view class="search">
                <search :list="filteredStudents" labelName="name" valueName="_id" placeholder="请输入小朋友姓名" @input="handleSearch" @select="handleSelectChild"></search>
            </view>
        </view>
    </view>
</template>

<script setup>
import customNav from '@/components/customNav';
import search from '../../uni_modules/z-search/components/z-search/z-search'
import { ref, onMounted, computed } from "vue";
import { onLoad } from '@dcloudio/uni-app'

const navCustomStyle = 'background: #F2F7F6;height: calc(100vh / 8)'
// 新增班级学生相关状态
const classId = ref('');        // 存储传入的班级ID
const assessmentId = ref('');   // 存储评估ID
const assessmentTitle = ref(''); // 存储评估标题
const students = ref([]);        // 原始学生列表
const filteredStudents = ref([]); // 过滤后的学生列表
const searchKeyword = ref('');   // 搜索关键词
let currentClass = '小班8班'
let displayName = '李萍萍'
// 更新模板绑定（修改search组件使用方式）
const formValue = ref({
    // ... 其他字段保持不变 ...
    childId: '' // 新增选中儿童ID存储
});

// 加载班级学生数据
const loadStudents = async () => {
    try {
        const res = await uniCloud.callFunction({
            name: 'wtdb-business-children-list',
            data: {
                classId: classId.value,
                keyword: searchKeyword.value
            }
        })

        students.value = res.result.data;
        filteredStudents.value = res.result.data;
    } catch (e) {
        console.error('加载失败:', e);
    }
};
// 处理搜索输入
let timeoutId = null
const handleSelectChild = (id) => {
    uni.navigateTo({
        url: `/pages/assessment/form?childId=${id}&assessmentId=${assessmentId.value}&assessmentTitle=${assessmentTitle.value}`
    });
};

// 新增路由参数接收
onLoad((options) => {
    console.log(options)
    classId.value = options.classId;
    assessmentId.value = options.assessmentId;
    assessmentTitle.value = options.assessmentTitle;
    loadStudents(); // 初始加载学生数据
});

onMounted((params) => {
    // TODO: 查询数据
    console.log(params)
})

</script>

<style lang="scss" scoped>
.assessment {
    .content {
        padding: 0 40rpx;
        background-color: #F2F7F6;
        height: calc(100vh - 100vh / 8);

        .header-info {
            margin-bottom: 64rpx;

            .hello {
                color: #00214D;
                font-family: "PingFang SC";
                font-size: 28px;
                font-style: normal;
                font-weight: 600;
                line-height: 35px;
                margin-bottom: 32rpx;
            }

            .class {
                color: #00214D;
                font-size: 16px;
                font-style: normal;
                font-weight: 400;
                line-height: 24px;
            }
        }

        .info {
            margin-bottom: 64rpx;

            .title {
                color: #00214D;
                font-family: "PingFang SC";
                font-size: 22px;
                font-style: normal;
                font-weight: 600;
                line-height: 28px;
                margin-bottom: 32rpx;

            }

            .instruction {
                color: #00214D;
                font-family: "PingFang SC";
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