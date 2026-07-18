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
                <view v-if="!loading">
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

        <DopamineLoading
            :show="loading || locationLoading || navigationLoading"
            :text="loading ? '正在准备成长量表' : locationLoading ? '正在确认校园位置' : '正在打开评估任务'"
            :subtext="loading ? '小芽在挑选合适的成长任务' : locationLoading ? '定位小雷达正在转圈圈' : '量表已选好，马上开始闯关'"
        />
    </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { shouldBypassAssessmentLocationCheck } from '@/common/debug.js'
import DopamineLoading from '@/components/dopamine-loading/index.vue'

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
const locationLoading = ref(false)
const navigationLoading = ref(false)
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
    const loadingStartedAt = Date.now()
    try {
        // 先尝试读取缓存
        const CACHE_KEY = 'teacher_assessment_list'
        const cachedData = uni.getStorageSync(CACHE_KEY)
        if (cachedData && Date.now() - cachedData.timestamp < 3600000) {
            assessmentList.value = cachedData.list
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
        const remaining = 420 - (Date.now() - loadingStartedAt)
        if (remaining > 0) {
            await new Promise((resolve) => setTimeout(resolve, remaining))
        }
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

// 检查位置权限并验证是否在学校范围内
const checkLocationPermission = () => {
    // ========== 开发配置 ==========
    // 开启后使用模拟位置数据，用于提交小程序审核
    // 审核通过后设置为 false 使用真实位置
    const USE_MOCK_LOCATION = false;
    // 模拟位置（广东中山市兴文路）
    const MOCK_LOCATION = {
        latitude: 22.504876,
        longitude: 113.408551
    };
    // ========== 开发配置 END ==========
    
    return new Promise((resolve) => {
        const currentClass = uni.getStorageSync('currentClass') || {}
        const schoolId = currentClass?.school_id

        if (shouldBypassAssessmentLocationCheck()) {
            console.log('调试模式，跳过学校位置检查')
            resolve({ canProceed: true, debugBypass: true })
            return
        }
        
        // 如果班级没有关联学校，直接允许
        if (!schoolId) {
            uni.showToast({ title: '班级未关联学校，请联系管理员', icon: 'none' })
            resolve({ canProceed: false })
            return
        }
        
        // 使用模拟位置（用于提交审核）
        if (USE_MOCK_LOCATION) {
            console.log('使用模拟位置数据:', MOCK_LOCATION)
            performLocationCheck(MOCK_LOCATION.latitude, MOCK_LOCATION.longitude, schoolId, resolve)
            return
        }
        
        locationLoading.value = true
        
        // 使用 getFuzzyLocation 获取模糊位置（隐私合规）
        uni.getFuzzyLocation({
            type: 'wgs84',
            success: (res) => {
                console.log('位置获取成功:', res)
                performLocationCheck(res.latitude, res.longitude, schoolId, resolve)
            },
            fail: (err) => {
                locationLoading.value = false
                console.error('位置获取失败:', err)
                
                // 判断是否是权限问题
                if (err.errMsg && (err.errMsg.includes('auth deny') || err.errMsg.includes('authorize'))) {
                    uni.showModal({
                        title: '需要位置权限',
                        content: '进行评估需要获取您的位置信息，以确认您在学校范围内。请授权后重试。',
                        showCancel: true,
                        cancelText: '暂不授权',
                        confirmText: '去授权',
                        confirmColor: '#66BB6A',
                        success: (res) => {
                            if (res.confirm) {
                                uni.openSetting({
                                    success: (settingRes) => {
                                        // 用户从设置页返回后，检查是否已授权
                                        if (settingRes.authSetting['scope.userFuzzyLocation']) {
                                            // 重新尝试获取位置
                                            checkLocationPermission().then(resolve)
                                        } else {
                                            resolve({ canProceed: false })
                                        }
                                    },
                                    fail: () => {
                                        resolve({ canProceed: false })
                                    }
                                })
                            } else {
                                resolve({ canProceed: false })
                            }
                        }
                    })
                } else {
                    // 其他错误，提示用户
                    uni.showToast({
                        title: '位置获取失败，请重试',
                        icon: 'none'
                    })
                    resolve({ canProceed: false })
                }
            }
        })
    })
}

// 执行位置检查的云函数调用
const performLocationCheck = async (latitude, longitude, schoolId, resolve) => {
    locationLoading.value = true
    
    // getFuzzyLocation 返回模糊位置，误差约 500-1000 米
    // 因此需要增加额外的浮动容差
    const FUZZY_LOCATION_TOLERANCE = 5000 // 模糊定位容差（米）
    const BASE_RADIUS = 1500 // 基础允许范围（米）
    const TOTAL_RADIUS = BASE_RADIUS + FUZZY_LOCATION_TOLERANCE // 总允许范围
    
    try {
        const checkRes = await uniCloud.callFunction({
            name: 'wtdb-check-school-location',
            data: {
                latitude,
                longitude,
                schoolId,
                radius: TOTAL_RADIUS, // 考虑模糊定位误差后的总范围
                uniIdToken: uni.getStorageSync('uni_id_token')
            }
        })
        
        if (checkRes.result.code === 200) {
            const { inRange, distance, schoolName } = checkRes.result.data
            
            if (inRange) {
                resolve({ canProceed: true })
            } else {
                uni.showModal({
                    title: '位置提醒',
                    content: `您当前不在「${schoolName}」范围内（距离约${distance}米），请到学校后再进行评估。`,
                    showCancel: false,
                    confirmText: '我知道了',
                    confirmColor: '#66BB6A'
                })
                resolve({ canProceed: false })
            }
        } else {
            console.error('位置检查失败:', checkRes.result.message)
            resolve({ canProceed: false })
        }
    } catch (e) {
        console.error('云函数调用失败:', e)
        resolve({ canProceed: false })
    } finally {
        locationLoading.value = false
    }
}

// 开始评估
const onStartAssess = async () => {
    // 先检查位置权限和是否在学校范围内
    const { canProceed } = await checkLocationPermission()
    
    if (!canProceed) {
        // 无法继续评估
        return
    }
    
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
    navigationLoading.value = true
    uni.navigateTo({
        url: `/pages/assessment/listMoudules?classId=${classId}` +
            `&className=${className}` +
            `&childId=${props.student._id}` +
            `&avatar=${props.student.avatar || ''}` +
            `&childName=${props.student.name}` +
            `&childAge=${studentAge.value}` +
            `&ageInt=${ageInt.value}` +
            `&assessmentId=${selectedAssessment.value.id}` +
            `&assessmentTitle=${selectedAssessment.value.title}`,
        success: () => emit('close'),
        fail: () => {
            uni.showToast({ title: '打开评估失败，请重试', icon: 'none' })
        },
        complete: () => {
            navigationLoading.value = false
        }
    })
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

<style lang="scss" scoped>
.assess-modal {
    z-index: 999;
}

.modal-mask {
    background: rgba(57, 47, 89, 0.62);
    backdrop-filter: blur(8rpx);
}

.modal-content {
    width: calc(100% - 72rpx);
    max-height: 84vh;
    overflow: hidden;
    border: 4rpx solid #392f59;
    border-radius: 38rpx;
    background: #fffaf0;
    box-shadow: 12rpx 14rpx 0 #ffd447;
}

.modal-header {
    position: relative;
    overflow: hidden;
    padding: 30rpx 30rpx 28rpx;
    border-bottom: 3rpx solid #392f59;
    background: linear-gradient(135deg, #7c63e8 0%, #a58bff 100%);

    &::after {
        content: '+';
        position: absolute;
        right: 112rpx;
        top: -8rpx;
        color: #ffd447;
        font-size: 58rpx;
        font-weight: 900;
        transform: rotate(18deg);
    }
}

.modal-title {
    position: relative;
    z-index: 1;
    color: #fff;
    font-size: 35rpx;
    font-weight: 900;
}

.close-btn {
    position: relative;
    z-index: 1;
    width: 54rpx;
    height: 54rpx;
    border: 3rpx solid #392f59;
    border-radius: 18rpx;
    background: #fff;
    box-shadow: 3rpx 3rpx 0 #ffd447;
}

.close-icon {
    color: #392f59;
    font-size: 28rpx;
    font-weight: 900;
}

.student-info {
    margin: 22rpx 24rpx 14rpx;
    padding: 20rpx 22rpx;
    border: 3rpx solid #392f59;
    border-radius: 26rpx;
    background: linear-gradient(135deg, #fff1ac 0%, #c9f4e6 100%);
    box-shadow: 5rpx 5rpx 0 #ff8f82;
}

.student-avatar {
    width: 84rpx;
    height: 84rpx;
    border: 4rpx solid #392f59;
    box-shadow: 4rpx 4rpx 0 #a58bff;
}

.student-name {
    color: #31284f;
    font-size: 30rpx;
    font-weight: 900;
}

.student-age {
    color: #625a79;
    font-weight: 700;
}

.assess-list {
    max-height: 410rpx;
    padding: 6rpx 24rpx;
}

.assess-item {
    min-height: 94rpx;
    margin: 14rpx 0;
    padding: 20rpx 22rpx;
    border: 3rpx solid #392f59;
    border-radius: 24rpx;
    background: #fff;
    box-shadow: 4rpx 4rpx 0 rgba(57, 47, 89, 0.15);
}

.assess-item.selected {
    border-color: #392f59;
    background: #eee9ff;
    box-shadow: 6rpx 6rpx 0 #79dfc2;
}

.assess-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 58rpx;
    height: 58rpx;
    margin-right: 16rpx;
    border: 2rpx solid #392f59;
    border-radius: 18rpx;
    background: #ffd447;
    font-size: 31rpx;
}

.assess-title {
    color: #31284f;
    font-size: 28rpx;
    font-weight: 800;
}

.check-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42rpx;
    height: 42rpx;
    color: #fff;
    border: 3rpx solid #392f59;
    border-radius: 50%;
    background: #7c63e8;
    font-size: 25rpx;
    font-weight: 900;
}

.hint-text {
    align-items: flex-start;
    justify-content: flex-start;
    margin: 14rpx 24rpx 0;
    padding: 15rpx 18rpx;
    border: 2rpx dashed #392f59;
    border-radius: 18rpx;
    background: #fff1ac;
}

.hint-text text {
    color: #615878;
    font-size: 23rpx;
    font-weight: 650;
}

.modal-footer {
    gap: 18rpx;
    padding: 22rpx 24rpx 26rpx;
    border-top: none;
}

.cancel-btn,
.confirm-btn {
    height: 82rpx;
    border: 3rpx solid #392f59;
    border-radius: 24rpx;
    font-size: 28rpx;
    font-weight: 900;

    &::after {
        border: none;
    }
}

.cancel-btn {
    color: #392f59;
    background: #fff;
    box-shadow: 5rpx 5rpx 0 #ffb6ad;
}

.confirm-btn {
    color: #fff;
    background: #7c63e8;
    box-shadow: 5rpx 5rpx 0 #ffd447;
}

.confirm-btn[disabled] {
    color: #827b94;
    border-color: #827b94;
    background: #ded9e9;
    box-shadow: 5rpx 5rpx 0 #c7c0d5;
}
</style>
