<template>
    <view class="container">
        <view class="student-card">
            <view class="student-avatar">
                <image class="avatar" :src="props.student.avatar" />
            </view>
            <view class="student-info">
                <view class="student-name">{{ props.student.name }}</view>
                <view class="assessment-statistics">
                    <view class="assessment-date">
                        {{ props.student.lastAssessmentDate }}
                    </view>
                    <view class="assessment-number">
                        {{ props.student.assessmentNumber }}
                    </view>
                </view>
            </view>

        </view>
    </view>
</template>

<script setup>
import { ref, computed, watchEffect, onMounted, watch } from "vue";
import { MarkdownIt, parseTokens } from "@/uni_modules/wtto-markdown/js_sdk/index";


const props = defineProps({
    student: {
        type: Object,
        required: true,
        default: () => ({
            avatar: 'https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/girl.png',
            name: '李思思',
            lastAssessmentDate: '2025年3月22日',
            assessmentNumber: '共6次'
        })
    }
});





onMounted(() => {

});



</script>



<style lang="scss" scoped>
.container {
    background-color: coral;
    border: 1px solid #ccc;
    border-radius: 10px;

    width: calc(100vw / 2 - 40rpx * 2);



    .student-card {
        display: flex;
        flex-direction: row;
        align-items: center;

        .student-avatar {
            width: 65px;
            height: 60px;

            .avatar {
                width: 100%;
                height: 100%;
                border-radius: 50%;
            }
        }
    }


}
</style>