<template>
    <view class="student-card">
        <view class="student-summary">
            <!-- 头像区域 -->
            <view
                class="avatar-area"
                hover-class="avatar-area--pressed"
                :hover-stay-time="80"
                @click.stop="handleAvatarClick"
            >
                <view class="avatar-ring">
                    <image class="avatar" :src="avatarUrl" mode="aspectFill" />
                </view>
                <view class="star-badge">
                    <text class="star">✎</text>
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
                        <text class="stat-label">报告日期</text>
                        <view class="stat-value-row">
                            <view class="date-icon" aria-hidden="true">
                                <view class="date-icon-binding date-icon-binding--left"></view>
                                <view class="date-icon-binding date-icon-binding--right"></view>
                            </view>
                            <text class="date-value">{{ latestReportDateText }}</text>
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
                <view
                    class="guardian-state"
                    :class="{ 'guardian-state--missing': !student.guardianConfigured }"
                    @click.stop="handleAvatarClick"
                >
                    <text>{{ student.guardianConfigured ? '👪' : '⚠️' }}</text>
                    <text>
                        {{ student.guardianConfigured
                            ? `已登记 ${student.guardianCount} 位监护人`
                            : '未登记监护人手机号，点击补充' }}
                    </text>
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
        <button
            class="plan-entry"
            :class="`plan-entry--${trainingPlanEntry.tone}`"
            hover-class="plan-entry--pressed"
            @click="handlePlanClick"
        >
            <view class="plan-entry-icon">
                <view class="plan-target-ring"><view class="plan-target-core"></view></view>
                <text class="plan-target-spark">✦</text>
            </view>
            <view class="plan-entry-copy">
                <view class="plan-entry-title-row">
                    <text class="plan-entry-title">{{ trainingPlanEntry.title }}</text>
                    <text class="plan-entry-badge">{{ trainingPlanEntry.badge }}</text>
                </view>
                <text class="plan-entry-source">{{ trainingPlanEntry.source }}</text>
            </view>
            <text class="action-arrow">›</text>
        </button>
    </view>
</template>

<script setup>
import { computed } from 'vue'
import { DEFAULT_AVATAR_BOY, DEFAULT_AVATAR_GIRL } from '@/lib/types/local_storage.js'

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

const avatarUrl = computed(() => {
    if (props.student.avatar) return props.student.avatar
    const gender = String(props.student.gender || '').toLowerCase()
    return ['女孩', '女', 'female', 'girl'].includes(gender)
        ? DEFAULT_AVATAR_GIRL
        : DEFAULT_AVATAR_BOY
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

const latestReportDateText = computed(() => {
    const value = props.student.latestReportDate || props.student.lastAssessmentDate
    if (value && !['暂无评估记录', '尚未评估'].includes(value)) return value
    if (hasAssessments.value) return '报告生成中'
    return '暂无报告'
})

const trainingPlanEntry = computed(() => {
    const report = props.student.latestReport || null
    if (!report) {
        return {
            tone: 'empty',
            title: '训练计划',
            badge: '暂无报告',
            source: hasAssessments.value
                ? '最近评估尚未生成报告'
                : '完成评估并生成报告后可制定'
        }
    }

    const assessmentTitle = String(report.assessmentTitle || '成长评估').trim()
    const reportDate = report.reportDate || props.student.latestReportDate || '日期未知'
    const source = `基于 ${assessmentTitle} · 报告日期 ${reportDate}`
    const task = report.interventionPlanGeneration || {}
    const taskStatus = String(task.status || '')
    if (['pending', 'generating_overview', 'generating_weeks', 'assembling'].includes(taskStatus) ||
        report.interventionPlanStatus === 'generating') {
        return {
            tone: 'progress',
            title: '训练计划生成中',
            badge: `${Number(task.progress) || 0}%`,
            source
        }
    }
    if (['failed', 'timed_out'].includes(taskStatus) || report.interventionPlanStatus === 'failed') {
        return {
            tone: 'danger',
            title: '继续生成训练计划',
            badge: taskStatus === 'timed_out' ? '已超时' : '生成失败',
            source
        }
    }
    if (report.interventionPlanStatus === 'stale') {
        return {
            tone: 'warning',
            title: '更新训练计划',
            badge: '需更新',
            source
        }
    }
    if (report.interventionPlanStatus === 'completed') {
        return {
            tone: 'ready',
            title: '查看训练计划',
            badge: '已生成',
            source
        }
    }
    return {
        tone: 'create',
        title: '制定训练计划',
        badge: '未生成',
        source
    }
})

const emit = defineEmits(['reportClick', 'planClick', 'assessClick', 'avatarClick']);

const handleAvatarClick = () => {
    console.log('student-card: 点击编辑学生资料');
    emit('avatarClick');
};

const handleReportClick = () => {
    console.log('student-card: 点击查看报告');
    emit('reportClick');
};

const handlePlanClick = () => {
    console.log('student-card: 点击训练计划');
    emit('planClick');
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
    transition: transform 0.15s ease;
}

.avatar-area--pressed {
    transform: scale(0.94) rotate(-2deg);
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
    color: #392f59;
    font-weight: 900;
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

.guardian-state {
    display: inline-flex;
    align-items: center;
    max-width: 100%;
    margin-top: 9rpx;
    padding: 6rpx 11rpx;
    color: #286c5d;
    border: 2rpx solid #67af9c;
    border-radius: 999rpx;
    background: #e2f8f1;
    font-size: 18rpx;
    font-weight: 800;
    gap: 6rpx;
    box-sizing: border-box;
}

.guardian-state--missing {
    color: #a95b34;
    border-color: #e19369;
    background: #fff0df;
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
    position: relative;
    width: 22rpx;
    height: 20rpx;
    flex-shrink: 0;
    margin-right: 7rpx;
    border: 2rpx solid #6752b2;
    border-radius: 4rpx;
    background: linear-gradient(180deg, #ffb6ad 0 6rpx, #fff 6rpx 100%);
    box-sizing: border-box;
}

.date-stat .stat-value-row {
    align-items: center;
}

.date-icon-binding {
    position: absolute;
    top: -4rpx;
    width: 3rpx;
    height: 7rpx;
    border-radius: 2rpx;
    background: #392f59;
}

.date-icon-binding--left {
    left: 4rpx;
}

.date-icon-binding--right {
    right: 4rpx;
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

.plan-entry {
    display: flex;
    width: 100%;
    min-width: 0;
    height: 100rpx;
    margin: 16rpx 0 0;
    padding: 0 18rpx;
    align-items: center;
    border: 3rpx solid #392f59;
    border-radius: 24rpx;
    background: #eee9ff;
    box-shadow: 5rpx 5rpx 0 #392f59;
    box-sizing: border-box;
    line-height: 1;

    &::after {
        border: none;
    }
}

.plan-entry--pressed {
    transform: translate(3rpx, 3rpx);
    box-shadow: 2rpx 2rpx 0 #392f59;
}

.plan-entry--ready {
    background: #dff8ef;
}

.plan-entry--progress {
    background: #e7e0ff;
}

.plan-entry--warning,
.plan-entry--danger {
    background: #ffe4d7;
}

.plan-entry--empty {
    background: #f3f0f6;
}

.plan-entry-icon {
    position: relative;
    display: flex;
    width: 54rpx;
    height: 54rpx;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    margin-right: 14rpx;
    border: 2rpx solid #392f59;
    border-radius: 17rpx;
    background: #7c63e8;
}

.plan-target-ring {
    display: flex;
    width: 29rpx;
    height: 29rpx;
    align-items: center;
    justify-content: center;
    border: 4rpx solid #fff;
    border-radius: 50%;
    box-sizing: border-box;
}

.plan-target-core {
    width: 8rpx;
    height: 8rpx;
    border-radius: 50%;
    background: #ffd447;
}

.plan-target-spark {
    position: absolute;
    top: 3rpx;
    right: 5rpx;
    color: #ffd447;
    font-size: 14rpx;
    font-weight: 950;
}

.plan-entry-copy {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    align-items: flex-start;
}

.plan-entry-title-row {
    display: flex;
    width: 100%;
    min-width: 0;
    align-items: center;
    gap: 10rpx;
}

.plan-entry-title {
    overflow: hidden;
    color: #31284f;
    font-size: 25rpx;
    font-weight: 900;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.plan-entry-badge {
    flex-shrink: 0;
    padding: 5rpx 10rpx;
    border-radius: 999rpx;
    background: rgba(103, 82, 178, 0.12);
    color: #6752b2;
    font-size: 17rpx;
    font-weight: 900;
}

.plan-entry--ready .plan-entry-badge {
    background: #c6eddf;
    color: #25765e;
}

.plan-entry--warning .plan-entry-badge,
.plan-entry--danger .plan-entry-badge {
    background: #ffd0bd;
    color: #a84b2e;
}

.plan-entry-source {
    display: block;
    overflow: hidden;
    width: 100%;
    margin-top: 9rpx;
    color: #716986;
    font-size: 18rpx;
    font-weight: 700;
    line-height: 1.15;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
