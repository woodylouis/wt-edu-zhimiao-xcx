<template>
    <view class="growth-assessment">
        <u-sticky>
            <!-- 添加自定义返回处理 -->
            <custom-nav :needBack="true" :needBar="false" :xcxName="'创建班级'" :back-handler="handleCustomBack"
                navCustomStyle="background: linear-gradient(135deg, #FFF2B8 0%, #FFD778 48%, #FFB8AC 100%);height: calc(100vh / 8);" />
        </u-sticky>
        <dopamine-flow-header eyebrow="CREATE A HAPPY CLASS" title="先选好班级结构" subtitle="年份、学段和班级，一步就能配好" badge="01" tone="yellow" :step="1" :total-steps="2" />
        <!-- <view class="assessment-header">成长评估</view> -->
        <view class="selection-container">
            <!-- Year Selection -->
            <view class="section-group">
                <view class="section-header">
                    <view class="indicator-bar"></view>
                    <text class="section-title">选择年份</text>
                </view>
                <year-only-picker v-model="selectedYear" @change="updateLocalStorage" />
            </view>

            <!-- School Section -->
            <view class="section-group">
                <view class="section-header">
                    <view class="indicator-bar"></view>
                    <text class="section-title">选择学段 <text class="required-mark">*</text></text>
                </view>
                <view class="options-wrap">
                    <view v-for="(section, idx) in schoolSections" :key="idx" class="option-button" :class="{ 'option-selected': selectedSection === section }" @tap="selectSection(section)">
                        {{ section }}
                    </view>
                </view>
            </view>

            <!-- Grade Selection -->
            <view class="section-group">
                <view class="section-header">
                    <view class="indicator-bar"></view>
                    <text class="section-title">选择年级 <text class="required-mark">*</text></text>
                </view>
                <view class="options-grid">
                    <view v-for="(grade, idx) in grades" :key="idx" class="option-button" :class="{ 'option-selected': selectedGrade === grade }" @tap="selectGrade(grade)">
                        {{ grade }}
                    </view>
                </view>
            </view>

            <!-- Class Selection -->
            <view class="section-group">
                <view class="section-header">
                    <view class="indicator-bar"></view>
                    <text class="section-title">选择班级 <text class="required-mark">*</text></text>
                </view>
                <view class="options-grid">
                    <view v-for="(classNum, idx) in classes" :key="idx" class="option-button" :class="{ 'option-selected': selectedClass === classNum }" @tap="selectClass(classNum)">
                        {{ classNum }}班
                    </view>
                </view>
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
import YearOnlyPicker from "../../components/year-only-picker/year-only-picker.vue";
import DopamineFlowHeader from "./components/dopamineFlowHeader.vue";

export default {
    components: {
        YearOnlyPicker,
        DopamineFlowHeader,
    },
    data() {
        const currentYear = new Date().getFullYear();
        return {
            schoolSections: ["幼儿园"],
            grades: ["幼托", "小小班", "小班", "中班", "大班"],
            classes: Array.from({ length: 18 }, (_, i) => i + 1),
            selectedYear: String(currentYear),
            selectedSection: "",
            selectedGrade: "",
            selectedClass: "",
            loading: false,
        };
    },
    onShow() {
        // 新增缓存初始化逻辑
        const cacheData = uni.getStorageSync('classFormData');
        if (cacheData) {
            this.selectedYear = cacheData.year || this.selectedYear;
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
                year: this.selectedYear,
                section: this.selectedSection,
                grade: this.selectedGrade,
                class: this.selectedClass
            };
            uni.setStorageSync('classFormData', newData);
        },
        handleConfirm() {
            if (this.loading) return;
            console.log("确认按钮被点击");
            if (!this.selectedYear || !this.selectedSection || !this.selectedGrade || !this.selectedClass) {
                uni.showToast({
                    title: "请完成所有选择",
                    icon: "none",
                });
                return;
            }

            this.loading = true;
            const currentCache = uni.getStorageSync('classFormData') || {};  // 新增获取当前缓存
            const result = {
                ...currentCache,  // 合并已有缓存
                year: this.selectedYear,
                section: this.selectedSection,
                grade: this.selectedGrade,
                class: this.selectedClass
            };

            uni.setStorageSync('classFormData', result);  // 替换原有设置方式
            uni.navigateTo({
                url: "/pages/enter-class/createClassForm2",
                complete: () => {
                    this.loading = false;
                }
            });
        },
        handleCancel() {
            this.handleCustomBack();
        },
        // 新增自定义返回处理
        handleCustomBack() {
            uni.removeStorageSync('classFormData')
            uni.navigateBack()
        },
    },
};
</script>

<style scoped lang="scss">
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
    overflow-y: auto;
    border-radius: 48rpx 48rpx 0 0;
    background-color: rgba(255, 255, 255, 1);
    /* padding: 38rpx 40rpx; */
    font-size: 28rpx;
    color: rgba(111, 115, 116, 1);
    margin-top: -10px;
    z-index: 1;
}

.section-group {
    /* margin-bottom: 32rpx; */
    padding: 38rpx 40rpx;
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

.required-mark {
    color: #E35D6A;
    font-weight: 700;
}

.options-grid,
.options-wrap {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    /* 强制三列布局 */
    gap: 20rpx;
    width: 100%;
}

.option-button {
    width: 100%;
    /* 确保填满网格单元格 */
    min-width: 0;
    /* 防止内容溢出 */
    flex: 0 0 calc(33.333% - 14rpx);
    border-radius: 12rpx;
    background-color: rgba(242, 247, 246, 1);
    padding: 20rpx 0;
    border: none;
    color: inherit;
    font-size: inherit;
    text-align: center;
    line-height: 1;
    box-sizing: border-box;
}

.option-selected {
    background-color: rgba(219, 242, 226, 1);
    color: rgba(0, 33, 77, 1);
}

.action-buttons {
    margin-top: auto;
    display: flex;
    flex-shrink: 0;
    gap: 24rpx;
    padding: 40rpx 0 60rpx;
    position: sticky;
    bottom: 0;
    background: #ffffff;
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

@import "./dopamine-flow.scss";

.selection-container {
    position: relative;
    z-index: 4;
    min-height: 58vh;
    box-sizing: border-box;
    overflow: visible;
    margin: -24rpx 24rpx 40rpx;
    border: 4rpx solid #2f2854;
    border-radius: 40rpx;
    background: #fffdf8;
    box-shadow: 9rpx 11rpx 0 rgba(47, 40, 84, 0.22);
}

.section-group {
    margin: 0 28rpx 24rpx;
    padding: 26rpx;
    border: 3rpx solid #e4deef;
    border-radius: 28rpx;
    background: #ffffff;
}

.section-group:first-child {
    margin-top: 34rpx;
    background: #fff8dc;
}

.section-group:nth-child(2) {
    background: #f2edff;
}

.section-group:nth-child(3) {
    background: #eafaf3;
}

.section-group:nth-child(4) {
    background: #fff0ed;
}

.indicator-bar {
    width: 16rpx;
    height: 30rpx;
    border: 3rpx solid #2f2854;
    border-radius: 8rpx;
    background: #ffcf46;
}

.section-title {
    color: #2f2854;
    font-size: 27rpx;
    font-weight: 800;
}

.option-button {
    padding: 23rpx 8rpx;
    border: 3rpx solid #2f2854;
    border-radius: 22rpx;
    background: #fffdf8;
    color: #625b75;
    font-size: 24rpx;
    font-weight: 700;
    box-shadow: 4rpx 5rpx 0 rgba(47, 40, 84, 0.14);
    transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.option-selected {
    background: #7657f6;
    color: #ffffff;
    box-shadow: 5rpx 6rpx 0 #2f2854;
    transform: translateY(-2rpx);
}

.action-buttons {
    box-sizing: border-box;
    gap: 18rpx;
    padding: 28rpx;
    border-top: 3rpx dashed #d9d1e8;
    border-radius: 0 0 36rpx 36rpx;
    background: #fffdf8;
    box-shadow: none;
}

.cancel-button,
.confirm-button {
    height: 92rpx;
    margin: 0;
    padding: 0;
    border: 4rpx solid #2f2854;
    border-radius: 26rpx;
    font-size: 29rpx;
    font-weight: 800;
}

.cancel-button {
    background: #ffffff;
    color: #2f2854;
}

.confirm-button {
    background: #7657f6;
    color: #ffffff;
    box-shadow: 7rpx 8rpx 0 #2f2854;
}
</style>
