<template>
    <view class="container">
        <view v-if="studentList" class="student-list">
            <view v-for="(student, index) in studentList" :key="index" class="student-item"
                @click="handleStudentClick(student)">
                <StudentCard :student="student" />
            </view>
        </view>
    </view>
</template>

<script setup>
import StudentCard from './student-card'
const $emits = defineEmits(['handleStudentClick'])
const props = defineProps({
    studentList: {
        type: Array,
        default: () => [

        ]
    }
})

const handleStudentClick = (student) => {
    const plainStudent = JSON.parse(JSON.stringify(student));
    $emits('handleStudentClick', plainStudent); // 修改这里，使用emit而不是$emits
}

</script>

<style lang="scss" scoped>
.container {
    .student-list {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        // padding: 20rpx;

        .student-item {
            width: 48%;
            margin-bottom: 28rpx;
        }
    }
}
</style>
