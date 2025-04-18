<template>
    <view class="container">
        <view v-if="studentList" class="student-list">
            <view v-for="(student, index) in studentList" :key="index" class="student-item">
                <StudentCard :student="student" />
            </view>
        </view>
    </view>
</template>

<script setup>
import StudentCard from './student-card'

const props = defineProps({
    studentList: {
        type: Array,
        default: () => [
            {
                avatar: 'https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/girl.png',
                name: '李思思',
                lastAssessmentDate: '2025年3月22日',
                assessmentNumber: '共6次'
            },
            {
                avatar: 'https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/girl.png',
                name: '李小思',
                lastAssessmentDate: '2025年3月22日',
                assessmentNumber: '共6次'
            },
            {
                avatar: 'https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/girl.png',
                name: '李平平',
                lastAssessmentDate: '2025年3月22日',
                assessmentNumber: '共6次'
            },
            {
                avatar: 'https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/girl.png',
                name: '李小平',
                lastAssessmentDate: '2025年3月22日',
                assessmentNumber: '共6次'
            },
            {
                avatar: 'https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/girl.png',
                name: '刘小平',
                lastAssessmentDate: '2025年3月22日',
                assessmentNumber: '共6次'
            },
        ]
    }
})

</script>

<style lang="scss" scoped>
.container {
    .student-list {
        display: flex;
        flex-direction: column;
        // gap: 30rpx;
    }
}
</style>
