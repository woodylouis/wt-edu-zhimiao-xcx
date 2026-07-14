<template>
    <view class="container">
        <view v-if="studentList.length > 0" class="student-list">
            <view v-for="(student, index) in studentList" :key="student._id || index" class="student-item">
                <StudentCard 
                    :student="student" 
                    @reportClick="onReportClick(student)"
                    @assessClick="onAssessClick(student)"
                />
            </view>
        </view>
        <view v-else>
            <u-empty mode="list" />
        </view>
    </view>
</template>

<script setup>
import StudentCard from './student-card.vue'

const props = defineProps({
    studentList: {
        type: Array,
        default: () => []
    }
})

const emit = defineEmits(['handleStudentClick', 'handleAssessClick'])

// 查看报告
const onReportClick = (student) => {
    console.log('student-list: 查看报告', student.name);
    emit('handleStudentClick', student);
}

// 开始评估
const onAssessClick = (student) => {
    console.log('student-list: 开始评估', student.name);
    emit('handleAssessClick', student);
}
</script>

<style lang="scss" scoped>
.container {
    .student-list {
        display: flex;
        flex-direction: column;
        gap: 24rpx;

        .student-item {
            width: 100%;
        }
    }
}
</style>
