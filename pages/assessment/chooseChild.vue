<template>
    <view class="assessment">
        <custom-nav :xcxName="'信息填写'" :navCustomStyle="navCustomStyle" :needBar="false" :needBack="true" />
        <view class="content">
            <view class="header-info">
                <view class="hello">Hi, {{ displayName }} !</view>
                <view class="class"> {{ currentClass }} </view>
            </view>
            <view class="info">
                <view class="title">个人信息</view>
                <view class="instruction">请输入您要进行儿童量表评估的小朋友姓名，系统将根据您的选择进入相应的评估流程。</view>
            </view>
            <view class="search" style="z-index:999">
                <search v-model="searchKeyword" :list="filteredStudents" labelName="name" valueName="_id" placeholder="请输入小朋友姓名" @select="handleSelectChild"></search>
            </view>
            <view class="searchHistory" v-if="searchHistory.length">
                <u-tag v-for="(item, index) in searchHistory" :key="index" :text="item" size="medium" @click="handleClickTag(item)" borderColor="#8696A3" bgColor="#FFFFFF" color="#8696A3" style="margin:20rpx;box-sizing: border-box;"></u-tag>
            </view>
        </view>
    </view>
</template>

<script setup>
import customNav from '@/components/customNav';
import search from '../../uni_modules/z-search/components/z-search/z-search'
import { ref, onMounted, computed } from "vue";
import { onLoad, onUnload } from '@dcloudio/uni-app'

const navCustomStyle = 'background: #F2F7F6;height: calc(100vh / 8)'
// 新增用户信息引用
const userInfo = ref(uni.getStorageSync('uni-id-pages-userInfo') || {});

// 修改为计算属性
const currentClass = computed(() => className.value || '暂无班级信息');
const displayName = computed(() => userInfo.value.nickname ? userInfo.value.nickname + '老师' : '老师');

const classId = ref('');        // 存储传入的班级ID
const className = ref('');      // 存储传入的班级名称
const assessmentId = ref('');   // 存储评估ID
const assessmentTitle = ref(''); // 存储评估标题
const students = ref([]);        // 原始学生列表
const filteredStudents = ref([]); // 过滤后的学生列表
const searchKeyword = ref('');   // 搜索关键词
const searchHistory = ref(['杨浩宇', '李文津']);   // 搜索历史

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

        // 新增加载时同步学生姓名到搜索历史
        students.value.forEach(child => {
            const existing = searchHistory.value.find(name => name === child.name);
            if (!existing) {
                searchHistory.value.unshift(child.name);
            }
        });
        uni.setStorageSync('childSearchHistory', searchHistory.value);
    } catch (e) {
        console.error('加载失败:', e);
    }
};
// 处理搜索输入
let timeoutId = null
// 在onLoad中初始化搜索历史
onLoad((options) => {
    uni.removeStorageSync('childSearchHistory')
    classId.value = options.classId;
    className.value = options.className;
    assessmentId.value = options.assessmentId;
    assessmentTitle.value = options.assessmentTitle;
    loadStudents();

    // 新增加载本地历史
    searchHistory.value = uni.getStorageSync('childSearchHistory') || [];

});

onUnload(() => {
    // 清空本地缓存
    uni.removeStorageSync('childSearchHistory')
    // 清空当前页面数据
    searchHistory.value = []
})

const handleClickTag = (tag) => {
    searchKeyword.value = tag;
    // 新增：手动触发搜索组件过滤
    filteredStudents.value = students.value.filter(child =>
        child.name.includes(tag)
    );
};

// 新增搜索历史管理方法
const updateSearchHistory = (name) => {
    // 去重处理
    const index = searchHistory.value.indexOf(name);
    if (index > -1) {
        searchHistory.value.splice(index, 1);
    }

    // 新增：将最新记录插入到数组开头
    searchHistory.value.unshift(name);

    // 限制最多10条（修改为删除最后一条）
    // if (searchHistory.value.length > 10) {
    //     searchHistory.value.pop();
    // }

    // 保存到本地
    uni.setStorageSync('childSearchHistory', searchHistory.value);
};

const handleSelectChild = (id) => {
    const selectedChild = students.value.find(child => child._id === id);

    // 新增加入搜索历史
    if (selectedChild?.name) {
        updateSearchHistory(selectedChild.name);
    }
    const timestamp = parseInt(selectedChild.birthdate, 10);
    if (isNaN(timestamp)) {
        console.error('无效的生日时间戳:', selectedChild.birthdate);
        return uni.showToast({ title: '学生数据异常', icon: 'none' });
    }
    const birthDate = new Date(timestamp);
    const today = new Date();

    // 计算总月数
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    if (today.getDate() < birthDate.getDate()) months--;
    if (months < 0) {
        years--;
        months += 12;
    }
    const totalMonths = years * 12 + months;

    // 格式化年龄显示
    let ageDisplay;
    if (totalMonths >= 24) { // 2岁以上显示岁+月
        const displayYears = Math.floor(totalMonths / 12);
        const displayMonths = totalMonths % 12;
        ageDisplay = displayMonths === 0 ?
            `${displayYears}.0` :
            `${displayYears}.${Math.round(displayMonths / 1.2)}`; // 将月份转换为0-9的小数位
    } else { // 2岁以下显示月数
        ageDisplay = (totalMonths / 10).toFixed(1); // 保留一位小数
    }

    uni.navigateTo({
        url: `/pages/assessment/form?classId=${classId.value}` +
            `&className=${className.value}` +
            `&childId=${id}` +
            `&childName=${selectedChild.name}` +
            `&childAge=${ageDisplay}` +  // 修改后的年龄参数
            `&assessmentId=${assessmentId.value}` +
            `&assessmentTitle=${assessmentTitle.value}`
    });
};

// 修改标签关闭事件处理
const handleCloseTag = (index) => {
    searchHistory.value.splice(index, 1);
    uni.setStorageSync('childSearchHistory', searchHistory.value);
};

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

        .searchHistory {
            // display: flex;
            justify-content: space-between;
            margin-top: 36rpx
        }
    }
}
</style>