<template>
    <view class="growth-assessment">
        <u-sticky>
            <custom-nav />
        </u-sticky>
        <!-- <view class="assessment-header">成长评估</view> -->
        <view class="selection-container">
            <!-- School Section -->
            <view class="section-group">
                <view class="section-header">
                    <view class="indicator-bar"></view>
                    <text class="section-title">选择学段</text>
                </view>
                <view class="options-wrap">
                    <button v-for="(section, idx) in schoolSections" :key="idx" class="option-button" :class="{ 'option-selected': selectedSection === section }" @tap="selectSection(section)">
                        {{ section }}
                    </button>
                </view>
            </view>

            <!-- Grade Selection -->
            <view class="section-group">
                <view class="section-header">
                    <view class="indicator-bar"></view>
                    <text class="section-title">选择年级</text>
                </view>
                <view class="options-grid">
                    <button v-for="(grade, idx) in grades" :key="idx" class="option-button" :class="{ 'option-selected': selectedGrade === grade }" @tap="selectGrade(grade)">
                        {{ grade }}
                    </button>
                </view>
            </view>

            <!-- Class Selection -->
            <view class="section-group">
                <view class="section-header">
                    <view class="indicator-bar"></view>
                    <text class="section-title">选择班级</text>
                </view>
                <view class="options-grid">
                    <button v-for="(classNum, idx) in classes" :key="idx" class="option-button" :class="{ 'option-selected': selectedClass === classNum }" @tap="selectClass(classNum)">
                        {{ classNum }}班
                    </button>
                </view>
            </view>

            <!-- Action Buttons -->
            <view class="action-buttons">
                <button class="cancel-button" @tap="handleCancel">取消</button>
                <button class="confirm-button" @tap="handleConfirm">确定</button>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    data() {
        return {
            schoolSections: ["幼儿园"],
            grades: ["幼托", "小小班", "小班", "中班", "大班"],
            classes: Array.from({ length: 18 }, (_, i) => i + 1),
            selectedSection: "",
            selectedGrade: "",
            selectedClass: "",
        };
    },
    methods: {
        selectSection(section) {
            this.selectedSection = section;
        },
        selectGrade(grade) {
            this.selectedGrade = grade;
        },
        selectClass(classNum) {
            this.selectedClass = classNum;
        },
        handleCancel() {
            uni.navigateBack();
        },
        handleConfirm() {
            if (!this.selectedSection || !this.selectedGrade || !this.selectedClass) {
                uni.showToast({
                    title: "请完成所有选择",
                    icon: "none",
                });
                return;
            }

            const result = {
                section: this.selectedSection,
                grade: this.selectedGrade,
                class: this.selectedClass,
            };

            uni.$emit("classSelected", result);
            uni.navigateBack();
        },
    },
};
</script>

<style scoped>
.growth-assessment {
    display: flex;
    flex-direction: column;
    min-height: 100vh;

}

.assessment-header {
    background-color: rgba(242, 247, 246, 1);
    padding: 40rpx 140rpx;
    font-size: 36rpx;
    color: rgba(0, 33, 77, 1);
    font-weight: 600;
    text-align: center;
}

.selection-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    border-radius: 48rpx 48rpx 0 0;
    background-color: rgba(255, 255, 255, 1);
    padding: 38rpx 40rpx;
    font-size: 28rpx;
    color: rgba(111, 115, 116, 1);
    /* margin-top: -20px; */
    z-index: 1;
}

.section-group {
    margin-bottom: 32rpx;
}

.section-header {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-bottom: 24rpx;
}

.indicator-bar {
    border-radius: 8rpx;
    background-color: rgba(110, 221, 138, 1);
    width: 8rpx;
    height: 24rpx;
}

.section-title {
    font-size: 24rpx;
    color: rgba(0, 33, 77, 1);
}

.options-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 32rpx;
    margin-top: 24rpx;
}

.options-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 32rpx;
    margin-top: 24rpx;
}

.option-button {
    border-radius: 12rpx;
    background-color: rgba(242, 247, 246, 1);
    padding: 20rpx 74rpx;
    border: none;
    color: inherit;
    font-size: inherit;
    line-height: 1;
}

.option-selected {
    background-color: rgba(219, 242, 226, 1);
    color: rgba(0, 33, 77, 1);
}

.action-buttons {
    margin-top: auto;
    display: flex;
    gap: 24rpx;
    padding: 40rpx 0 0;
}

.cancel-button {
    flex: 1;
    border-radius: 48rpx;
    border: 2rpx solid rgba(0, 33, 77, 1);
    padding: 26rpx 0;
    background: transparent;
    color: rgba(0, 33, 77, 1);
    font-size: 32rpx;
    font-weight: 500;
}

.confirm-button {
    flex: 1;
    border-radius: 48rpx;
    background-color: rgba(110, 221, 138, 1);
    padding: 26rpx 0;
    border: none;
    color: rgba(0, 33, 77, 1);
    font-size: 32rpx;
    font-weight: 500;
}
</style>