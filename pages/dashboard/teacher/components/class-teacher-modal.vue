<template>
  <view v-if="visible" class="teacher-modal">
    <view class="modal-mask" @click="close"></view>
    <view class="modal-panel" @click.stop>
      <view class="modal-decoration">+</view>
      <view class="modal-header">
        <view>
          <text class="modal-kicker">TEACHER TEAM</text>
          <text class="modal-title">{{ classLabel }}的老师</text>
        </view>
        <view class="close-button" @click="close">×</view>
      </view>

      <view class="summary-row">
        <text class="summary-copy">一起陪伴孩子们成长的老师</text>
        <view class="count-chip">{{ teachers.length }} 位</view>
      </view>

      <scroll-view v-if="!loading && teachers.length" class="teacher-list" scroll-y>
        <view
          v-for="teacher in teachers"
          :key="teacher.memberId || teacher.userId"
          class="teacher-card"
        >
          <image
            v-if="teacher.avatarUrl"
            class="teacher-avatar"
            :src="teacher.avatarUrl"
            mode="aspectFill"
          />
          <view v-else class="teacher-avatar teacher-avatar--placeholder">
            {{ firstChar(teacher.teacherName) }}
          </view>
          <view class="teacher-copy">
            <view class="teacher-name-row">
              <text class="teacher-name">{{ teacher.teacherName }}</text>
              <view v-if="teacher.isCurrentUser" class="role-chip role-chip--self">我</view>
            </view>
            <text class="teacher-role">{{ teacher.isHeadTeacher ? '班主任' : '老师' }}</text>
          </view>
          <view
            class="role-badge"
            :class="{ 'role-badge--head': teacher.isHeadTeacher }"
          >
            {{ teacher.isHeadTeacher ? '班主任' : '老师' }}
          </view>
        </view>
      </scroll-view>

      <view v-else-if="!loading" class="empty-state">
        <view class="empty-icon">👩‍🏫</view>
        <text class="empty-title">{{ errorMessage ? '老师名单加载失败' : '暂无老师信息' }}</text>
        <text class="empty-copy">{{ errorMessage || '班级老师加入后会显示在这里' }}</text>
        <button v-if="errorMessage" class="retry-button" @click="loadTeachers">重新加载</button>
      </view>

      <view class="modal-footer">
        <button class="done-button" @click="close">我知道了</button>
      </view>

      <DopamineLoading
        :show="loading"
        text="正在召集本班老师"
        subtext="小芽正在整理班级名单"
      />
    </view>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import DopamineLoading from '@/components/dopamine-loading/index.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  classInfo: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['close'])
const loading = ref(false)
const teachers = ref([])
const responseClassName = ref('')
const errorMessage = ref('')
let requestVersion = 0

const classId = computed(() => props.classInfo?._id || props.classInfo?.id || '')
const classLabel = computed(() => {
  if (responseClassName.value) return responseClassName.value
  if (props.classInfo?.grade && props.classInfo?.class) {
    return `${props.classInfo.grade}${props.classInfo.class}班`
  }
  return props.classInfo?.nickname || '当前班级'
})

watch(() => props.visible, (visible) => {
  if (visible) loadTeachers()
})

const loadTeachers = async () => {
  const requestedClassId = classId.value
  const version = ++requestVersion
  teachers.value = []
  responseClassName.value = ''
  errorMessage.value = ''

  if (!requestedClassId) {
    errorMessage.value = '暂无当前班级信息'
    return
  }

  loading.value = true
  try {
    const { result } = await uniCloud.callFunction({
      name: 'wtdb-teacher-management',
      data: {
        action: 'class-list',
        classId: requestedClassId,
        uniIdToken: uni.getStorageSync('uni_id_token')
      }
    })
    if (version !== requestVersion) return
    if (result?.code !== 200) {
      throw new Error(result?.msg || '老师名单加载失败')
    }
    teachers.value = result.data?.list || []
    responseClassName.value = result.data?.className || ''
  } catch (error) {
    if (version !== requestVersion) return
    errorMessage.value = error.message || '请稍后重试'
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

const close = () => {
  requestVersion += 1
  loading.value = false
  emit('close')
}

const firstChar = (value) => String(value || '师').charAt(0)
</script>

<style lang="scss" scoped>
.teacher-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
}

.modal-mask {
  position: absolute;
  inset: 0;
  background: rgba(57, 47, 89, 0.62);
  backdrop-filter: blur(8rpx);
}

.modal-panel {
  position: absolute;
  top: 50%;
  left: 36rpx;
  right: 36rpx;
  overflow: hidden;
  border: 4rpx solid #392f59;
  border-radius: 38rpx;
  background: #fffaf0;
  box-shadow: 12rpx 14rpx 0 #79dfc2;
  transform: translateY(-50%);
}

.modal-decoration {
  position: absolute;
  z-index: 2;
  top: -8rpx;
  right: 118rpx;
  color: #ffd447;
  font-size: 60rpx;
  font-weight: 900;
  transform: rotate(18deg);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 28rpx 25rpx;
  color: #fff;
  border-bottom: 3rpx solid #392f59;
  background: linear-gradient(135deg, #ff765f 0%, #ff9c78 100%);
}

.modal-kicker,
.modal-title {
  display: block;
}

.modal-kicker {
  margin-bottom: 4rpx;
  color: #fff1ac;
  font-size: 18rpx;
  font-weight: 900;
  letter-spacing: 3rpx;
}

.modal-title {
  max-width: 460rpx;
  overflow: hidden;
  font-size: 34rpx;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.close-button {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54rpx;
  height: 54rpx;
  color: #392f59;
  border: 3rpx solid #392f59;
  border-radius: 18rpx;
  background: #fff;
  box-shadow: 3rpx 3rpx 0 #ffd447;
  font-size: 34rpx;
  font-weight: 900;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 22rpx 24rpx 8rpx;
}

.summary-copy {
  color: #6b6380;
  font-size: 23rpx;
  font-weight: 700;
}

.count-chip {
  flex-shrink: 0;
  padding: 7rpx 14rpx;
  color: #392f59;
  border: 2rpx solid #392f59;
  border-radius: 999rpx;
  background: #ffd447;
  font-size: 21rpx;
  font-weight: 900;
}

.teacher-list {
  height: 52vh;
  max-height: 620rpx;
  padding: 10rpx 24rpx 18rpx;
  box-sizing: border-box;
}

.teacher-card {
  display: flex;
  align-items: center;
  min-height: 106rpx;
  margin-bottom: 18rpx;
  padding: 18rpx 18rpx;
  border: 3rpx solid #392f59;
  border-radius: 26rpx;
  background: #fff;
  box-shadow: 5rpx 5rpx 0 #eee9ff;
  box-sizing: border-box;
}

.teacher-avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;
  overflow: hidden;
  color: #392f59;
  border: 3rpx solid #392f59;
  border-radius: 22rpx;
  background: #a58bff;
  font-size: 30rpx;
  font-weight: 900;
  box-sizing: border-box;
}

.teacher-avatar--placeholder:nth-child(4n + 1) {
  background: #79dfc2;
}

.teacher-copy {
  flex: 1;
  min-width: 0;
  margin: 0 16rpx;
}

.teacher-name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.teacher-name {
  max-width: 260rpx;
  overflow: hidden;
  color: #31284f;
  font-size: 28rpx;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.teacher-role {
  display: block;
  margin-top: 5rpx;
  color: #80778f;
  font-size: 21rpx;
  font-weight: 700;
}

.role-chip {
  flex-shrink: 0;
  padding: 3rpx 9rpx;
  border: 2rpx solid #392f59;
  border-radius: 999rpx;
  font-size: 18rpx;
  font-weight: 900;
}

.role-chip--self {
  background: #ffb6ad;
}

.role-badge {
  flex-shrink: 0;
  padding: 8rpx 14rpx;
  color: #4f4570;
  border: 2rpx solid #392f59;
  border-radius: 999rpx;
  background: #eee9ff;
  font-size: 20rpx;
  font-weight: 900;
}

.role-badge--head {
  color: #735519;
  background: #fff0a8;
}

.empty-state {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  min-height: 330rpx;
  padding: 30rpx;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 104rpx;
  height: 104rpx;
  margin-bottom: 18rpx;
  border: 3rpx solid #392f59;
  border-radius: 34rpx;
  background: #ffd447;
  font-size: 50rpx;
  transform: rotate(-4deg);
}

.empty-title {
  color: #31284f;
  font-size: 29rpx;
  font-weight: 900;
}

.empty-copy {
  margin-top: 8rpx;
  color: #7a728d;
  font-size: 23rpx;
  font-weight: 700;
  text-align: center;
}

.retry-button,
.done-button {
  border: 3rpx solid #392f59;
  border-radius: 22rpx;
  color: #392f59;
  font-weight: 900;

  &::after {
    border: 0;
  }
}

.retry-button {
  height: 68rpx;
  margin-top: 22rpx;
  padding: 0 24rpx;
  background: #ffd447;
  font-size: 24rpx;
  line-height: 62rpx;
}

.modal-footer {
  padding: 18rpx 24rpx 26rpx;
}

.done-button {
  width: 100%;
  height: 80rpx;
  margin: 0;
  color: #fff;
  background: #7c63e8;
  box-shadow: 5rpx 5rpx 0 #ffd447;
  font-size: 27rpx;
  line-height: 74rpx;
}
</style>
