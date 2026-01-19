<template>
    <view class="assess-modal" v-if="visible">
        <view class="modal-mask" @click="onClose"></view>
        <view class="modal-content">
            <!-- 标题 -->
            <view class="modal-header">
                <text class="modal-title">选择评估量表</text>
                <view class="close-btn" @click="onClose">
                    <text class="close-icon">✕</text>
                </view>
            </view>
            
            <!-- 学生信息 -->
            <view class="student-info">
                <image class="student-avatar" :src="student.avatar" mode="aspectFill" />
                <view class="student-detail">
                    <text class="student-name">{{ student.name }}</text>
                    <text class="student-age">{{ studentAge }}</text>
                </view>
            </view>
            
            <!-- 评估列表 -->
            <view class="assess-list">
                <view class="loading-wrap" v-if="loading">
                    <u-loading-icon mode="circle"></u-loading-icon>
                    <text class="loading-text">加载中...</text>
                </view>
                <view v-else>
                    <view 
                        v-for="item in assessmentList" 
                        :key="item.id" 
                        class="assess-item"
                        :class="{ 'selected': selectedAssessment?.id === item.id }"
                        @click="onSelectAssessment(item)"
                    >
                        <view class="assess-icon">📋</view>
                        <view class="assess-info">
                            <text class="assess-title">{{ item.title }}</text>
                        </view>
                        <view class="check-icon" v-if="selectedAssessment?.id === item.id">✓</view>
                    </view>
                </view>
            </view>
            
            <!-- 提示信息 -->
            <view class="hint-text">
                <text class="hint-icon">💡</text>
                <text>点击「开始评估」将直接进入，请确认学生和量表信息无误</text>
            </view>
            
            <!-- 底部按钮 -->
            <view class="modal-footer">
                <button class="cancel-btn" @click="onClose">取消</button>
                <button class="confirm-btn" :disabled="!selectedAssessment" @click="onStartAssess">
                    开始评估
                </button>
            </view>
        </view>
    </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    student: {
        type: Object,
        required: true,
        default: () => ({})
    }
})

const emit = defineEmits(['close', 'confirm'])

const loading = ref(false)
const assessmentList = ref([])
const selectedAssessment = ref(null)

// 计算学生年龄
const studentAge = computed(() => {
    if (!props.student?.birthdate) return '未知年龄'
    
    const timestamp = parseInt(props.student.birthdate, 10)
    if (isNaN(timestamp)) return '未知年龄'
    
    const birthDate = new Date(timestamp)
    const today = new Date()
    let years = today.getFullYear() - birthDate.getFullYear()
    let months = today.getMonth() - birthDate.getMonth()
    
    if (today.getDate() < birthDate.getDate()) months--
    if (months < 0) {
        years--
        months += 12
    }
    
    return `${years}岁${months}个月`
})

// 计算年龄整数部分
const ageInt = computed(() => {
    if (!props.student?.birthdate) return 0
    
    const timestamp = parseInt(props.student.birthdate, 10)
    if (isNaN(timestamp)) return 0
    
    const birthDate = new Date(timestamp)
    const today = new Date()
    let years = today.getFullYear() - birthDate.getFullYear()
    let months = today.getMonth() - birthDate.getMonth()
    
    if (today.getDate() < birthDate.getDate()) months--
    if (months < 0) years--
    
    return years
})

// 监听弹窗显示，加载评估列表
watch(() => props.visible, (val) => {
    if (val) {
        selectedAssessment.value = null
        loadAssessments()
    }
})

// 加载评估列表
const loadAssessments = async () => {
    loading.value = true
    try {
        // 先尝试读取缓存
        const CACHE_KEY = 'teacher_assessment_list'
        const cachedData = uni.getStorageSync(CACHE_KEY)
        if (cachedData && Date.now() - cachedData.timestamp < 3600000) {
            assessmentList.value = cachedData.list
            loading.value = false
            return
        }
        
        const res = await uniCloud.callFunction({
            name: 'wt-fetch-assessment-list',
            data: { page: 1, pageSize: 20 }
        })
        
        if (res.result.code === 0) {
            assessmentList.value = res.result.data.list
            // 更新缓存
            uni.setStorageSync(CACHE_KEY, {
                list: res.result.data.list,
                total: res.result.data.total,
                timestamp: Date.now()
            })
        }
    } catch (e) {
        console.error('加载评估列表失败:', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
    } finally {
        loading.value = false
    }
}

// 选择评估
const onSelectAssessment = (item) => {
    selectedAssessment.value = item
}

// 关闭弹窗
const onClose = () => {
    emit('close')
}

// 开始评估
const onStartAssess = () => {
    const currentClass = uni.getStorageSync('currentClass') || {}
    const classId = currentClass._id || currentClass.id || ''
    const className = currentClass.grade && currentClass.class 
        ? `${currentClass.grade}${currentClass.class}班` 
        : '未知班级'
    
    emit('confirm', {
        student: props.student,
        assessment: selectedAssessment.value,
        ageInt: ageInt.value,
        studentAge: studentAge.value
    })
    
    // 跳转到评估模块页面
    uni.navigateTo({
        url: `/pages/assessment/listMoudules?classId=${classId}` +
            `&className=${className}` +
            `&childId=${props.student._id}` +
            `&avatar=${props.student.avatar || ''}` +
            `&childName=${props.student.name}` +
            `&childAge=${studentAge.value}` +
            `&ageInt=${ageInt.value}` +
            `&assessmentId=${selectedAssessment.value.id}` +
            `&assessmentTitle=${selectedAssessment.value.title}`
    })
    
    emit('close')
}
</script>

<style lang="scss" scoped>
.assess-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999;
}

.modal-mask {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
}

.modal-content {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 85%;
    max-height: 80vh;
    background: #fff;
    border-radius: 24rpx;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 32rpx;
    border-bottom: 1rpx solid #f0f0f0;
}

.modal-title {
    font-size: 34rpx;
    font-weight: 600;
    color: #333;
}

.close-btn {
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.close-icon {
    font-size: 32rpx;
    color: #999;
}

.student-info {
    display: flex;
    align-items: center;
    padding: 24rpx 32rpx;
    background: linear-gradient(135deg, #FFF9F0 0%, #FFF5E6 100%);
    margin: 16rpx;
    border-radius: 16rpx;
}

.student-avatar {
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
    border: 4rpx solid #fff;
    box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.1);
}

.student-detail {
    margin-left: 20rpx;
}

.student-name {
    font-size: 30rpx;
    font-weight: 600;
    color: #333;
    display: block;
}

.student-age {
    font-size: 24rpx;
    color: #888;
    margin-top: 4rpx;
}

.assess-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 16rpx;
    max-height: 400rpx;
}

.loading-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60rpx 0;
}

.loading-text {
    font-size: 24rpx;
    color: #999;
    margin-top: 16rpx;
}

.assess-item {
    display: flex;
    align-items: center;
    padding: 24rpx;
    margin: 12rpx 0;
    background: #f8f8f8;
    border-radius: 16rpx;
    border: 2rpx solid transparent;
    transition: all 0.2s;
}

.assess-item.selected {
    background: #E8F5E9;
    border-color: #81C784;
}

.assess-icon {
    font-size: 36rpx;
    margin-right: 16rpx;
}

.assess-info {
    flex: 1;
}

.assess-title {
    font-size: 28rpx;
    color: #333;
    font-weight: 500;
}

.check-icon {
    font-size: 32rpx;
    color: #66BB6A;
    font-weight: bold;
}

.modal-footer {
    display: flex;
    padding: 24rpx 32rpx;
    gap: 24rpx;
    border-top: 1rpx solid #f0f0f0;
}

.cancel-btn, .confirm-btn {
    flex: 1;
    height: 80rpx;
    border-radius: 40rpx;
    font-size: 28rpx;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    margin: 0;
    padding: 0;
}

.cancel-btn {
    background: #f5f5f5;
    color: #666;
}

.confirm-btn {
    background: linear-gradient(135deg, #81C784 0%, #66BB6A 100%);
    color: #fff;
}

.confirm-btn[disabled] {
    background: #ccc;
    color: #fff;
}

// 提示文字
.hint-text {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
    padding: 16rpx 32rpx;
    margin: 0 16rpx;
    background: #FFF8E1;
    border-radius: 12rpx;
    
    .hint-icon {
        font-size: 24rpx;
    }
    
    text {
        font-size: 24rpx;
        color: #F57C00;
        line-height: 1.4;
    }
}
</style>
