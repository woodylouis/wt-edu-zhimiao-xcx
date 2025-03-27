<template>
    <view class="growth-assessment">
        <u-sticky>
            <!-- 添加自定义返回处理 -->
            <custom-nav :xcxName="'申请加入'" :needBack="true" :back-handler="handleCustomBack" />
        </u-sticky>
        <!-- <view class="assessment-header">成长评估</view> -->
        <view class="selection-container">
            <view class="title">
                班级码
            </view>



            <!-- Action Buttons -->
            <view class="action-buttons">
                <button class="cancel-button" @click="handleCancel">取消</button>
                <button class="confirm-button" @click="handleConfirm">确定</button>
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
    onShow() {
        // 新增缓存初始化逻辑
        const cacheData = uni.getStorageSync('classFormData');
        if (cacheData) {
            this.selectedSection = cacheData.section;
            this.selectedGrade = cacheData.grade;
            this.selectedClass = cacheData.class;
        }
    },
    methods: {
        selectSection(section) {
            this.selectedSection = section;
            // 实时更新缓存
            this.updateLocalStorage();
        },
        selectGrade(grade) {
            this.selectedGrade = grade;
            this.updateLocalStorage();
        },
        selectClass(classNum) {
            this.selectedClass = classNum;
            this.updateLocalStorage();
        },
        // 修改缓存更新方法（保留其他字段）
        updateLocalStorage() {
            const currentCache = uni.getStorageSync('classFormData') || {};
            const newData = {
                ...currentCache,  // 保留已有字段
                section: this.selectedSection,
                grade: this.selectedGrade,
                class: this.selectedClass
            };
            uni.setStorageSync('classFormData', newData);
        },
        handleConfirm() {
            console.log("确认按钮被点击");
            if (!this.selectedSection || !this.selectedGrade || !this.selectedClass) {
                uni.showToast({
                    title: "请完成所有选择",
                    icon: "none",
                });
                return;
            }

            const currentCache = uni.getStorageSync('classFormData') || {};  // 新增获取当前缓存
            const result = {
                ...currentCache,  // 合并已有缓存
                section: this.selectedSection,
                grade: this.selectedGrade,
                class: this.selectedClass
            };

            uni.setStorageSync('classFormData', result);  // 替换原有设置方式
            uni.navigateTo({
                url: "/pages/enter-class/createClassForm2"
            });
        },
        // 新增自定义返回处理
        handleCustomBack() {
            uni.removeStorageSync('classFormData')
            uni.navigateBack()
        },
    },
};
</script>

<style scoped>
.growth-assessment {
    display: flex;
    flex-direction: column;
    height: 100vh;

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
    /* padding: 38rpx 40rpx; */
    font-size: 28rpx;
    color: rgba(111, 115, 116, 1);
    margin-top: -10px;
    z-index: 1;
}


.action-buttons {
    margin-top: auto;
    display: flex;
    gap: 24rpx;
    padding: 40rpx 0 60rpx;
    box-shadow: 0px -7px 24px 0px rgba(103, 11, 3, 0.06);
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
    height: 48px;
    /* 新增居中属性 */
    display: flex;
    justify-content: center;
    align-items: center;
    line-height: 1;
    margin-left: 20rpx;
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
    height: 48px;
    /* 新增居中属性 */
    display: flex;
    justify-content: center;
    align-items: center;
    line-height: 1;
    margin-right: 20rpx;
}
</style>