<template>
    <view class="student-card">
        <view class="student-summary">
            <!-- 头像区域 -->
            <view class="avatar-area">
                <view class="avatar-ring">
                    <image class="avatar" :src="student.avatar" mode="aspectFill" />
                </view>
                <view class="star-badge">
                    <text class="star">⭐</text>
                </view>
            </view>

            <!-- 信息区域 -->
            <view class="info-area">
                <view class="name-row">
                    <text class="student-name">{{ student.name }}</text>
                    <view v-if="student.isNew" class="new-tag">
                        <text class="new-tag-text">刚刚创建</text>
                    </view>
                </view>
                <view class="assessment-meta" :class="{ 'assessment-meta--empty': !hasAssessmentActivity }">
                    <view class="assessment-stat date-stat">
                        <text class="stat-label">最近评估</text>
                        <view class="stat-value-row">
                            <text class="date-icon">📅</text>
                            <text class="date-value">{{ lastAssessmentText }}</text>
                        </view>
                    </view>
                    <view class="stat-divider"></view>
                    <view class="assessment-stat count-stat">
                        <text class="stat-label">评估次数</text>
                        <view class="stat-value-row count-value-row">
                            <text class="count-value">{{ assessmentCount }}</text>
                            <text class="count-unit">次</text>
                        </view>
                    </view>
                </view>
                <view v-if="latestAssessorName" class="latest-assessor">
                    <text class="assessor-icon">👩‍🏫</text>
                    <text class="assessor-label">最近评估老师</text>
                    <text class="assessor-name">{{ latestAssessorName }}</text>
                </view>
            </view>
        </view>
        
        <!-- 操作按钮区域 -->
        <view class="action-area">
            <button
                class="action-btn report-btn"
                :class="{ 'report-btn--empty': !hasAssessments }"
                hover-class="action-btn--pressed"
                @click="handleReportClick"
            >
                <view class="action-icon action-icon--report">📊</view>
                <view class="action-copy">
                    <text class="action-title">查看报告</text>
                    <text class="action-hint">{{ hasAssessments ? '历史记录' : '暂无记录' }}</text>
                </view>
                <text class="action-arrow">›</text>
            </button>
            <button
                class="action-btn assess-btn"
                :class="{ 'assess-btn--continue': isAssessing }"
                hover-class="action-btn--pressed"
                @click="handleAssessClick"
            >
                <view class="action-icon action-icon--assess">{{ isAssessing ? '⏱️' : '✍️' }}</view>
                <view class="action-copy">
                    <text class="action-title">{{ isAssessing ? '继续评估' : '开始评估' }}</text>
                    <text class="action-hint">{{ isAssessing ? '恢复上次进度' : '选择成长量表' }}</text>
                </view>
                <text class="action-arrow">›</text>
            </button>
        </view>
    </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    student: {
        type: Object,
        required: true,
        default: () => ({
            avatar: 'https://mp-8372f87f-e5a8-4950-9f38-35142d9971d4.cdn.bspapp.com/avatar/girl.png',
            name: '李思思',
            lastAssessmentDate: '2026.03.22',
            assessmentCount: 6
        })
    }
});

const assessmentCount = computed(() => {
    const rawValue = props.student.assessmentCount ??
        props.student.reportCount ??
        props.student.assessmentNumber ?? 0
    if (typeof rawValue === 'number') return Math.max(0, rawValue)
    const matchedValue = String(rawValue).match(/\d+/)
    return matchedValue ? Number(matchedValue[0]) : 0
})

const hasAssessments = computed(() => {
    if (typeof props.student.hasAssessments === 'boolean') {
        return props.student.hasAssessments
    }
    return assessmentCount.value > 0
})

const isAssessing = computed(() =>
    Boolean(props.student.hasInProgressAssessment || props.student.inProgressAssessment)
)

const hasAssessmentActivity = computed(() => hasAssessments.value || isAssessing.value)

const latestAssessorName = computed(() =>
    String(props.student.latestAssessorName || props.student.lastAssessorName || '').trim()
)

const lastAssessmentText = computed(() => {
    if (isAssessing.value) return '评估进行中'
    if (!hasAssessments.value) return '尚未评估'
    const value = props.student.lastAssessmentDate
    return value && value !== '暂无评估记录' ? value : '尚未评估'
})

const emit = defineEmits(['reportClick', 'assessClick']);

const handleReportClick = () => {
    console.log('student-card: 点击查看报告');
    emit('reportClick');
};

const handleAssessClick = () => {
    console.log(`student-card: 点击${isAssessing.value ? '继续' : '开始'}评估`);
    emit('assessClick');
};
</script>

<style lang="scss" scoped>
.student-card {
    position: relative;
    display: flex;
    align-items: center;
    padding: 24rpx;
    background: linear-gradient(135deg, #FFFFFF 0%, #FFF9F0 50%, #FFF5E6 100%);
    border-radius: 24rpx;
    box-shadow: 0 6rpx 20rpx rgba(255, 183, 77, 0.15),
                0 2rpx 6rpx rgba(0, 0, 0, 0.04);
    overflow: visible;
}

// 头像区域
.avatar-area {
    position: relative;
    flex-shrink: 0;
}

.avatar-ring {
    width: 88rpx;
    height: 88rpx;
    border-radius: 50%;
    padding: 5rpx;
    background: linear-gradient(135deg, #FFD54F 0%, #FF8A65 50%, #FF7043 100%);
    box-shadow: 0 4rpx 12rpx rgba(255, 138, 101, 0.35);
}

.avatar {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 3rpx solid #FFFFFF;
}

.star-badge {
    position: absolute;
    bottom: -2rpx;
    right: -6rpx;
    width: 32rpx;
    height: 32rpx;
    background: #FFFFFF;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.12);
}

.star {
    font-size: 18rpx;
}

// 信息区域
.info-area {
    flex: 1;
    margin-left: 20rpx;
    min-width: 0;
}

.name-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 10rpx;
}

.student-name {
    font-size: 30rpx;
    font-weight: 700;
    color: #3D3D3D;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 200rpx;
}

.new-tag {
    background: rgba(255, 112, 67, 0.1);
    border: 1rpx solid rgba(255, 112, 67, 0.3);
    padding: 2rpx 12rpx;
    border-radius: 8rpx;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32rpx;
}

.new-tag-text {
    font-size: 18rpx;
    color: #FF7043;
    font-weight: 600;
    line-height: 1;
}

// 操作按钮区域
.action-area {
    display: flex;
    flex-direction: column;
    gap: 12rpx;
    flex-shrink: 0;
    margin-left: 16rpx;
}

.action-btn {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    padding: 0;
    margin: 0;
    line-height: 1;
    
    &::after {
        border: none;
    }
}

.btn-icon {
    font-size: 28rpx;
    line-height: 1;
}

.report-btn {
    background: linear-gradient(135deg, #64B5F6 0%, #42A5F5 100%);
    box-shadow: 0 2rpx 8rpx rgba(66, 165, 245, 0.35);
}

.assess-btn {
    background: linear-gradient(135deg, #FFB74D 0%, #FF9800 100%);
    box-shadow: 0 2rpx 8rpx rgba(255, 152, 0, 0.35);
}
</style>

<style lang="scss" scoped>
.student-card {
    min-height: 286rpx;
    flex-direction: column;
    align-items: stretch;
    padding: 24rpx 22rpx;
    border: 4rpx solid #392f59;
    border-radius: 32rpx;
    background: linear-gradient(135deg, #fff 0%, #fffaf0 100%);
    box-shadow: 8rpx 8rpx 0 #ffd447;

    &::before {
        content: '';
        position: absolute;
        top: -18rpx;
        right: 36rpx;
        width: 48rpx;
        height: 30rpx;
        border: 3rpx solid #392f59;
        border-radius: 50%;
        background: #ff8f82;
        transform: rotate(-12deg);
    }
}

.student-summary {
    display: flex;
    align-items: center;
    min-width: 0;
}

.avatar-ring {
    width: 92rpx;
    height: 92rpx;
    padding: 5rpx;
    border: 4rpx solid #392f59;
    background: #a58bff;
    box-shadow: 5rpx 5rpx 0 #ff8f82;
    box-sizing: border-box;
}

.avatar {
    border: 3rpx solid #fff;
    box-sizing: border-box;
}

.star-badge {
    right: -8rpx;
    bottom: -5rpx;
    width: 36rpx;
    height: 36rpx;
    border: 3rpx solid #392f59;
    background: #79dfc2;
    box-shadow: none;
}

.info-area {
    margin-left: 22rpx;
}

.student-name {
    max-width: 190rpx;
    color: #31284f;
    font-size: 31rpx;
    font-weight: 900;
}

.new-tag {
    height: 34rpx;
    padding: 2rpx 12rpx;
    border: 2rpx solid #392f59;
    border-radius: 999rpx;
    background: #ffb6ad;
}

.new-tag-text {
    color: #392f59;
    font-weight: 900;
}

.assessment-meta {
    display: flex;
    align-items: stretch;
    width: 100%;
    max-width: 470rpx;
    min-height: 74rpx;
    overflow: hidden;
    border: 2rpx solid #392f59;
    border-radius: 20rpx;
    background: #f0ecff;
}

.assessment-stat {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
    padding: 9rpx 12rpx 10rpx;
    box-sizing: border-box;
}

.date-stat {
    flex: 1;
}

.count-stat {
    width: 104rpx;
    background: #c9f4e6;
}

.stat-label {
    margin-bottom: 5rpx;
    color: #7a728d;
    font-size: 18rpx;
    font-weight: 700;
    line-height: 1;
}

.stat-value-row {
    display: flex;
    align-items: baseline;
    min-width: 0;
}

.date-icon {
    margin-right: 5rpx;
    font-size: 18rpx;
    line-height: 1;
}

.date-value {
    overflow: hidden;
    color: #392f59;
    font-size: 21rpx;
    font-weight: 900;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.stat-divider {
    width: 2rpx;
    background: #392f59;
}

.count-value-row {
    justify-content: flex-start;
}

.count-value {
    color: #392f59;
    font-size: 29rpx;
    font-weight: 900;
    line-height: 1;
}

.count-unit {
    margin-left: 3rpx;
    color: #615878;
    font-size: 18rpx;
    font-weight: 800;
}

.assessment-meta--empty {
    background: #f5f2f8;

    .count-stat {
        background: #e8e3ee;
    }

    .date-icon {
        filter: grayscale(1);
        opacity: 0.65;
    }
}

.latest-assessor {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    max-width: 100%;
    margin-top: 9rpx;
    padding: 6rpx 11rpx;
    overflow: hidden;
    color: #615878;
    border: 2rpx solid #392f59;
    border-radius: 999rpx;
    background: #fff1ac;
    box-sizing: border-box;
    font-size: 19rpx;
    font-weight: 800;
    line-height: 1.2;
}

.assessor-icon {
    flex-shrink: 0;
    margin-right: 5rpx;
    font-size: 18rpx;
}

.assessor-label {
    flex-shrink: 0;
}

.assessor-name {
    min-width: 0;
    margin-left: 7rpx;
    overflow: hidden;
    color: #392f59;
    font-weight: 900;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.action-area {
    flex-direction: row;
    gap: 18rpx;
    margin-top: 20rpx;
    margin-left: 0;
    padding-top: 20rpx;
    border-top: 2rpx dashed rgba(57, 47, 89, 0.28);
}

.action-btn {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: flex-start;
    width: auto;
    height: 94rpx;
    min-width: 0;
    margin: 0;
    padding: 0 16rpx;
    border: 3rpx solid #392f59;
    border-radius: 24rpx;
    box-shadow: 5rpx 5rpx 0 #392f59;
    line-height: 1;

    &::after {
        border: none;
    }
}

.action-btn--pressed {
    transform: translate(3rpx, 3rpx);
    box-shadow: 2rpx 2rpx 0 #392f59;
}

.report-btn {
    color: #392f59;
    background: #eee9ff;
}

.assess-btn {
    color: #392f59;
    background: #ffd447;
}

.assess-btn--continue {
    background: #79dfc2;
}

.report-btn--empty {
    background: #f3f0f6;
}

.action-icon {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 50rpx;
    height: 50rpx;
    margin-right: 12rpx;
    border: 2rpx solid #392f59;
    border-radius: 16rpx;
    font-size: 25rpx;
}

.action-icon--report {
    background: #a58bff;
}

.action-icon--assess {
    background: #fff;
}

.action-copy {
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
}

.action-title {
    color: #31284f;
    font-size: 25rpx;
    font-weight: 900;
    line-height: 1.1;
    white-space: nowrap;
}

.action-hint {
    overflow: hidden;
    max-width: 126rpx;
    margin-top: 7rpx;
    color: #716986;
    font-size: 18rpx;
    font-weight: 700;
    line-height: 1;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.action-arrow {
    flex-shrink: 0;
    margin-left: 5rpx;
    color: #392f59;
    font-size: 38rpx;
    font-weight: 900;
    line-height: 1;
}
</style>
