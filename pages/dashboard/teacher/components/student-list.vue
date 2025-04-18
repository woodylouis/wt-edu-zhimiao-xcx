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

        ]
    }
})

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
            margin-bottom: 20rpx;
        }
    }
}
</style>
