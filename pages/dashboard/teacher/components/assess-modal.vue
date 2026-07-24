<template>
    <view class="assess-modal" v-if="visible">
        <view class="modal-mask" @click="onClose"></view>
        <view class="modal-content">
            <!-- 标题 -->
            <view class="modal-header">
                <text class="modal-title">{{ modalTitle }}</text>
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
                            <text v-if="isInProgressAssessment(item)" class="progress-chip">进行中</text>
                        </view>
                        <view class="check-icon" v-if="selectedAssessment?.id === item.id">✓</view>
                    </view>
                </view>
            </view>

            <view v-if="selectedAssessment && !isContinuing" class="start-mode-section">
                <view class="start-mode-heading">
                    <text class="start-mode-title">选择开始方式</text>
                    <text class="start-mode-subtitle">每次都会创建一份新的评估记录</text>
                </view>
                <view
                    class="start-mode-option"
                    :class="{ selected: startMode === 'blank' }"
                    @click="selectStartMode('blank')"
                >
                    <view class="mode-radio">{{ startMode === 'blank' ? '✓' : '' }}</view>
                    <view class="mode-copy">
                        <text class="mode-title">从空白开始</text>
                        <text class="mode-hint">重新完成全部题目，适合完整复评</text>
                    </view>
                </view>
                <view
                    v-if="prefillSources.length"
                    class="start-mode-option"
                    :class="{ selected: startMode === 'prefill' }"
                    @click="selectStartMode('prefill')"
                >
                    <view class="mode-radio">{{ startMode === 'prefill' ? '✓' : '' }}</view>
                    <view class="mode-copy">
                        <text class="mode-title">参考历史评估预填</text>
                        <text class="mode-hint">带入历史答案，进入后需要逐项复核</text>
                    </view>
                </view>

                <view v-if="startMode === 'prefill'" class="prefill-source-list">
                    <view
                        v-for="source in prefillSources"
                        :key="source.recordId"
                        class="prefill-source"
                        :class="{ selected: selectedPrefillRecordId === source.recordId }"
                        @click="selectedPrefillRecordId = source.recordId"
                    >
                        <view class="source-main">
                            <text class="source-date">{{ formatDate(source.completionTime) }}</text>
                            <text class="source-assessor">评估老师：{{ source.assessorName }}</text>
                        </view>
                        <view class="source-match">
                            <text>可预填 {{ source.matchedCount }}/{{ source.totalQuestions }} 项</text>
                            <text v-if="source.unmatchedCount">另有{{ source.unmatchedCount }}项需重新填写</text>
                        </view>
                        <view class="source-check">{{ selectedPrefillRecordId === source.recordId ? '✓' : '' }}</view>
                    </view>
                    <text class="prefill-warning">历史报告和训练方案不会复制；所有预填答案复核后才能生成新报告。</text>
                </view>
                <text v-else-if="prefillSourceLoaded && !prefillSources.length" class="no-prefill">
                    暂无可安全匹配的历史答题记录，本次请从空白开始
                </text>
            </view>
            
            <!-- 提示信息 -->
            <view class="hint-text" :class="{ 'hint-text--stale': shouldSuggestRestart }">
                <text class="hint-icon">{{ shouldSuggestRestart ? '⚠️' : '💡' }}</text>
                <text>{{ actionHint }}</text>
            </view>
            
            <!-- 底部按钮 -->
            <view class="modal-footer">
                <button class="cancel-btn" @click="onClose">取消</button>
                <button
                    v-if="isContinuing"
                    class="restart-btn"
                    :class="{ 'restart-btn--recommended': shouldSuggestRestart }"
                    :disabled="restarting || navigationLoading"
                    @click="onRestartAssess"
                >
                    重新开始
                </button>
                <button
                    class="confirm-btn"
                    :disabled="!canStartAssessment || restarting || navigationLoading"
                    @click="onStartAssess"
                >
                    {{ isContinuing ? '继续评估' : startMode === 'prefill' ? '创建预填评估' : '开始新评估' }}
                </button>
            </view>
        </view>

        <DopamineLoading
            :show="loading || prefillSourceLoading || locationLoading || restarting || navigationLoading"
            :text="loading ? '正在准备成长量表' : prefillSourceLoading ? '正在查找历史评估' : locationLoading ? '正在确认校园位置' : restarting ? '正在重新开始评估' : '正在打开评估任务'"
            :subtext="loading ? '小芽在挑选合适的成长任务' : locationLoading ? '定位小雷达正在转圈圈' : restarting ? '正在作废旧进度并创建全新评估' : '量表已选好，马上开始闯关'"
        />
    </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { shouldBypassAssessmentLocationCheck } from '@/common/debug.js'
import DopamineLoading from '@/components/dopamine-loading/index.vue'
import { trackUserAction } from '@/common/user-activity-tracker.js'

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
const restarting = ref(false)
const prefillSourceLoading = ref(false)
const prefillSourceLoaded = ref(false)
const assessmentList = ref([])
const selectedAssessment = ref(null)
const prefillSources = ref([])
const startMode = ref('blank')
const selectedPrefillRecordId = ref('')
let prefillRequestId = 0

const inProgressAssessmentId = computed(() =>
    String(props.student?.inProgressAssessment?.assessmentId || '')
)

const isInProgressAssessment = (assessment) =>
    Boolean(inProgressAssessmentId.value) &&
    String(assessment?.id || '') === inProgressAssessmentId.value

const isContinuing = computed(() => isInProgressAssessment(selectedAssessment.value))
const canStartAssessment = computed(() =>
    Boolean(selectedAssessment.value) &&
    (isContinuing.value ||
        startMode.value === 'blank' ||
        (startMode.value === 'prefill' && Boolean(selectedPrefillRecordId.value)))
)

const modalTitle = computed(() =>
    inProgressAssessmentId.value ? '继续评估' : '选择评估量表'
)

const toTimestamp = (value) => {
    if (!value) return 0
    if (value instanceof Date) return value.getTime()
    if (typeof value === 'number') return value < 1e12 ? value * 1000 : value
    if (value.$date) return toTimestamp(value.$date)
    if (value.$numberLong) return toTimestamp(value.$numberLong)
    const timestamp = Date.parse(value)
    return Number.isNaN(timestamp) ? 0 : timestamp
}

const formatDate = (value) => {
    const timestamp = toTimestamp(value)
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

const threeMonthsAgo = (now = Date.now()) => {
    const date = new Date(now)
    const day = date.getDate()
    date.setDate(1)
    date.setMonth(date.getMonth() - 3)
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    date.setDate(Math.min(day, lastDay))
    date.setHours(0, 0, 0, 0)
    return date.getTime()
}

const inProgressAssessment = computed(() => props.student?.inProgressAssessment || {})

const lastSaveTimestamp = computed(() => toTimestamp(
    inProgressAssessment.value.lastSaveTime ||
    inProgressAssessment.value.updatedAt ||
    inProgressAssessment.value.updateTime
))

const lastSaveDateText = computed(() =>
    inProgressAssessment.value.lastSaveDate ||
    formatDate(lastSaveTimestamp.value) ||
    '日期未知'
)

const shouldSuggestRestart = computed(() =>
    isContinuing.value &&
    lastSaveTimestamp.value > 0 &&
    new Date(lastSaveTimestamp.value).setHours(0, 0, 0, 0) <= threeMonthsAgo()
)

const actionHint = computed(() => {
    if (!isContinuing.value) {
        return '点击「开始评估」将直接进入，请确认学生和量表信息无误'
    }
    if (shouldSuggestRestart.value) {
        return `上次进度保存于 ${lastSaveDateText.value}，距今已满3个月，建议重新开始评估`
    }
    return `上次进度保存于 ${lastSaveDateText.value}，可继续恢复，也可重新开始`
})

const applyAssessmentList = (list) => {
    assessmentList.value = Array.isArray(list) ? list : []
    selectedAssessment.value = assessmentList.value.find(isInProgressAssessment) || null
}

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
        prefillRequestId += 1
        selectedAssessment.value = null
        prefillSources.value = []
        startMode.value = 'blank'
        selectedPrefillRecordId.value = ''
        prefillSourceLoaded.value = false
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
            applyAssessmentList(cachedData.list)
            if (!inProgressAssessmentId.value || selectedAssessment.value) return
        }
        
        const res = await uniCloud.callFunction({
            name: 'wt-fetch-assessment-list',
            data: { page: 1, pageSize: 20 }
        })
        
        if (res.result.code === 0) {
            applyAssessmentList(res.result.data.list)
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
    startMode.value = 'blank'
    selectedPrefillRecordId.value = ''
    prefillSources.value = []
    prefillSourceLoaded.value = false
    if (!isInProgressAssessment(item)) loadPrefillSources(item)
}

const loadPrefillSources = async (assessment) => {
    if (!assessment?.id || !props.student?._id) return
    const requestId = ++prefillRequestId
    prefillSourceLoading.value = true
    try {
        const { result } = await uniCloud.callFunction({
            name: 'wt-upload-assess-record',
            data: {
                action: 'prefillSources',
                childId: props.student._id,
                data: {
                    assessmentId: assessment.id,
                    assessmentTitle: assessment.title,
                    ageInt: ageInt.value
                },
                uniIdToken: uni.getStorageSync('uni_id_token')
            }
        })
        if (requestId !== prefillRequestId ||
            selectedAssessment.value?.id !== assessment.id) return
        prefillSources.value = result?.code === 200 && Array.isArray(result.data)
            ? result.data
            : []
        if (prefillSources.value.length) {
            selectedPrefillRecordId.value = prefillSources.value[0].recordId
        }
    } catch (error) {
        if (requestId !== prefillRequestId) return
        console.warn('加载历史评估预填来源失败:', error)
        prefillSources.value = []
    } finally {
        if (requestId === prefillRequestId) {
            prefillSourceLoaded.value = true
            prefillSourceLoading.value = false
        }
    }
}

const selectStartMode = (mode) => {
    if (mode === 'prefill' && !prefillSources.value.length) return
    startMode.value = mode
    if (mode === 'prefill' && !selectedPrefillRecordId.value) {
        selectedPrefillRecordId.value = prefillSources.value[0]?.recordId || ''
    }
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

const getRestartModulesStatus = async () => {
    const { result } = await uniCloud.callFunction({
        name: 'wt-fetch-assessment-section',
        data: {
            assessmentId: selectedAssessment.value.id,
            age: ageInt.value
        }
    })
    if (result?.code !== 200 || !Array.isArray(result.data?.section)) {
        throw new Error(result?.message || '评估模块加载失败')
    }
    return result.data.section.map(section => ({
        sectionId: section.section_id,
        sectionName: section.section || '',
        totalSubSections: Array.isArray(section.abllsSections)
            ? section.abllsSections.length
            : 0
    }))
}

const restartCurrentAssessment = async () => {
    const restartRecordId = String(inProgressAssessment.value.recordId || '')
    if (!restartRecordId) {
        throw new Error('未找到需要作废的评估记录，请刷新后重试')
    }
    const modulesStatus = await getRestartModulesStatus()
    if (modulesStatus.length === 0) {
        throw new Error('当前量表没有可用的评估模块')
    }

    const { result } = await uniCloud.callFunction({
        name: 'wt-upload-assess-record',
        data: {
            childId: props.student._id,
            restartAssessment: true,
            restartRecordId,
            data: {
                assessmentId: selectedAssessment.value.id,
                assessmentTitle: selectedAssessment.value.title,
                modulesStatus
            },
            uniIdToken: uni.getStorageSync('uni_id_token')
        }
    })
    if (result?.code !== 200 || !result.result?.recordId) {
        throw new Error(result?.message || '重新开始评估失败')
    }
    return result.result
}

const navigateToAssessment = async ({ restartAssessment = false } = {}) => {
    if (restarting.value || navigationLoading.value || locationLoading.value) return

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

    let restartedRecord = null
    if (restartAssessment) {
        restarting.value = true
        try {
            restartedRecord = await restartCurrentAssessment()
        } catch (error) {
            console.error('重新开始评估失败:', error)
            uni.showToast({ title: error.message || '重新开始评估失败', icon: 'none' })
            return
        } finally {
            restarting.value = false
        }
    }
    
    emit('confirm', {
        student: props.student,
        assessment: selectedAssessment.value,
        ageInt: ageInt.value,
        studentAge: studentAge.value,
        restartAssessment,
        restartedRecord
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
            `&assessmentTitle=${selectedAssessment.value.title}` +
            `&startMode=${restartAssessment ? 'blank' : startMode.value}` +
            (startMode.value === 'prefill' && !restartAssessment
                ? `&prefillFromRecordId=${encodeURIComponent(selectedPrefillRecordId.value)}`
                : ''),
        success: () => {
            trackUserAction(
                restartAssessment
                    ? 'assessment:restart'
                    : isContinuing.value ? 'assessment:continue' : 'assessment:start',
                {
                    actionDetail: restartAssessment
                        ? '重新开始学生评估'
                        : isContinuing.value ? '继续学生评估' : '开始学生评估',
                    resultStatus: 'success',
                    targetType: 'student',
                    targetId: props.student._id
                }
            )
            emit('close')
        },
        fail: () => {
            uni.showToast({ title: '打开评估失败，请重试', icon: 'none' })
        },
        complete: () => {
            navigationLoading.value = false
        }
    })
}

// 开始或继续评估
const onStartAssess = () => navigateToAssessment()

// 放弃当前进度并创建新的评估记录
const onRestartAssess = () => {
    uni.showModal({
        title: shouldSuggestRestart.value ? '建议重新开始' : '确认重新开始？',
        content: `当前进度最后保存于 ${lastSaveDateText.value}。重新开始后将从第一项评估，原进度会保留用于记录追溯。`,
        cancelText: '继续评估',
        confirmText: '重新开始',
        confirmColor: '#E66A4E',
        success: ({ confirm }) => {
            if (confirm) navigateToAssessment({ restartAssessment: true })
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

.cancel-btn, .restart-btn, .confirm-btn {
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

.restart-btn {
    color: #D7583E;
    background: #FFF0EA;
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

.assess-info {
    display: flex;
    align-items: center;
    gap: 12rpx;
    min-width: 0;
}

.assess-title {
    overflow: hidden;
    color: #31284f;
    font-size: 28rpx;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.progress-chip {
    flex-shrink: 0;
    padding: 5rpx 11rpx;
    color: #25684f;
    border: 2rpx solid #392f59;
    border-radius: 999rpx;
    background: #79dfc2;
    font-size: 19rpx;
    font-weight: 900;
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

.hint-text--stale {
    border-style: solid;
    border-color: #d7583e;
    background: #ffe1d8;
}

.hint-text--stale text {
    color: #9f3f2e;
}

.start-mode-section {
    margin: 18rpx 24rpx 0;
    padding: 20rpx;
    border: 3rpx solid #392f59;
    border-radius: 24rpx;
    background: #fffdf7;
    box-shadow: 5rpx 5rpx 0 #eadfff;
}

.start-mode-heading,
.mode-copy,
.source-main,
.source-match {
    display: flex;
    flex-direction: column;
}

.start-mode-title {
    color: #392f59;
    font-size: 27rpx;
    font-weight: 950;
}

.start-mode-subtitle {
    margin-top: 4rpx;
    color: #847b91;
    font-size: 21rpx;
}

.start-mode-option {
    display: flex;
    align-items: center;
    gap: 14rpx;
    margin-top: 14rpx;
    padding: 16rpx;
    border: 2rpx solid #d8d0e1;
    border-radius: 19rpx;
    background: #faf8fc;
}

.start-mode-option.selected {
    border: 3rpx solid #5f49aa;
    background: #f2edff;
}

.mode-radio,
.source-check {
    display: flex;
    width: 36rpx;
    height: 36rpx;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border: 2rpx solid #756987;
    border-radius: 50%;
    color: #fff;
    background: #fff;
    font-size: 20rpx;
    font-weight: 900;
}

.selected > .mode-radio,
.prefill-source.selected .source-check {
    border-color: #5f49aa;
    background: #6d55be;
}

.mode-copy {
    min-width: 0;
    flex: 1;
}

.mode-title,
.source-date {
    color: #41364f;
    font-size: 24rpx;
    font-weight: 900;
}

.mode-hint,
.source-assessor,
.source-match,
.no-prefill,
.prefill-warning {
    margin-top: 4rpx;
    color: #7c7486;
    font-size: 20rpx;
    line-height: 1.45;
}

.prefill-source-list {
    margin-top: 14rpx;
}

.prefill-source {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-top: 10rpx;
    padding: 14rpx;
    border: 2rpx solid #ddd6e5;
    border-radius: 17rpx;
    background: #fff;
}

.prefill-source.selected {
    border-color: #6d55be;
    background: #fff9dc;
}

.source-main {
    min-width: 0;
    flex: 1;
}

.source-match {
    align-items: flex-end;
    color: #68549f;
    text-align: right;
}

.source-check {
    border-radius: 10rpx;
}

.prefill-warning,
.no-prefill {
    display: block;
    margin-top: 14rpx;
    padding: 12rpx 14rpx;
    border-radius: 14rpx;
    background: #fff2c9;
    color: #78612c;
}

.modal-footer {
    gap: 18rpx;
    padding: 22rpx 24rpx 26rpx;
    border-top: none;
}

.cancel-btn,
.restart-btn,
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

.restart-btn {
    color: #9f3f2e;
    background: #ffe1d8;
    box-shadow: 5rpx 5rpx 0 #ffb6ad;
}

.restart-btn--recommended {
    color: #fff;
    background: #e66a4e;
    box-shadow: 5rpx 5rpx 0 #ffd447;
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
