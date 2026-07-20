<template>
  <view class="profile-page">
    <view class="page-orb page-orb--coral"></view>
    <view class="page-orb page-orb--purple"></view>
    <u-sticky>
      <custom-nav
        :needBack="true"
        :needBar="false"
        :xcxName="'学生资料'"
        :backHandler="handleBack"
        navCustomStyle="background: linear-gradient(135deg, #FFF2B8 0%, #FFD778 48%, #FFB8AC 100%);height: calc(100vh / 8);"
      />
    </u-sticky>

    <dopamine-flow-header
      eyebrow="LITTLE STAR PROFILE"
      title="编辑成长档案"
      subtitle="把孩子的资料更新得更准确"
      badge="苗"
      tone="yellow"
      :step="1"
      :total-steps="1"
    />

    <view v-if="!loading && !loadError" class="page-content">
      <student-profile-form
        ref="profileForm"
        v-model="formData"
        :class-name="classDisplay"
        mode="edit"
        @uploading="avatarUploading = $event"
      />
      <button
        class="save-button"
        :disabled="saving || avatarUploading || !hasChanges"
        hover-class="save-button--pressed"
        @click="saveProfile"
      >
        <text>{{ avatarUploading ? '正在上传头像' : hasChanges ? '保存学生资料' : '资料已是最新' }}</text>
        <text class="save-arrow">{{ hasChanges ? '→' : '✓' }}</text>
      </button>
    </view>

    <view v-else-if="!loading" class="error-card">
      <view class="error-icon">🌱</view>
      <text class="error-title">资料暂时没有加载出来</text>
      <text class="error-copy">{{ loadError }}</text>
      <button class="retry-button" @click="loadProfile">重新加载</button>
    </view>

    <dopamine-loading
      :show="loading || saving"
      :text="loading ? '正在打开成长档案' : '正在保存学生资料'"
      :subtext="loading ? '小芽正在核对孩子的信息' : '新资料马上就准备好了'"
    />

    <dopamine-modal
      :show="leaveDialogVisible"
      eyebrow="再确认一下"
      title="放弃未保存的修改吗？"
      content="头像和基础资料的修改还没有保存。"
      confirm-text="放弃修改"
      cancel-text="继续编辑"
      :show-cancel="true"
      @confirm="confirmLeave"
      @cancel="leaveDialogVisible = false"
    />
  </view>
</template>

<script>
import StudentProfileForm from '@/components/student-profile-form/student-profile-form.vue'
import DopamineFlowHeader from '@/pages/enter-class/components/dopamineFlowHeader.vue'
import DopamineLoading from '@/components/dopamine-loading/index.vue'
import DopamineModal from '@/components/dopamine-modal/index.vue'
import { CURRENT_CLASS } from '@/lib/types/local_storage.js'

function comparableProfile(value = {}) {
  const gender = String(value.gender || '').trim().toLowerCase()
  const normalizedGender = ['男孩', '男', 'male', 'boy'].includes(gender)
    ? '男孩'
    : ['女孩', '女', 'female', 'girl'].includes(gender)
      ? '女孩'
      : gender
  return JSON.stringify({
    name: String(value.name || '').trim(),
    gender: normalizedGender,
    birthdate: Number(value.birthdate) || 0,
    avatar: String(value.avatar || '')
  })
}

export default {
  components: {
    StudentProfileForm,
    DopamineFlowHeader,
    DopamineLoading,
    DopamineModal
  },
  data() {
    return {
      childId: '',
      formData: {
        name: '',
        gender: '',
        birthdate: 0,
        avatar: ''
      },
      initialProfile: '',
      currentClass: uni.getStorageSync(CURRENT_CLASS) || {},
      loading: true,
      saving: false,
      avatarUploading: false,
      loadError: '',
      leaveDialogVisible: false
    }
  },
  computed: {
    classDisplay() {
      if (this.currentClass.nickname) return this.currentClass.nickname
      if (this.currentClass.grade && this.currentClass.class) {
        return `${this.currentClass.grade}${this.currentClass.class}班`
      }
      return '当前班级'
    },
    hasChanges() {
      return Boolean(this.initialProfile) && comparableProfile(this.formData) !== this.initialProfile
    }
  },
  onLoad(options) {
    this.childId = String(options.childId || options.child_id || '')
    this.loadProfile()
  },
  methods: {
    async callChildFunction(data) {
      const { result } = await uniCloud.callFunction({
        name: 'wtdb-business-children-edit',
        data: {
          ...data,
          uniIdToken: uni.getStorageSync('uni_id_token')
        }
      })
      return result
    },
    async loadProfile() {
      if (!this.childId) {
        this.loading = false
        this.loadError = '缺少学生信息，请返回后重试'
        return
      }
      this.loading = true
      this.loadError = ''
      try {
        const result = await this.callChildFunction({
          action: 'detail',
          childId: this.childId
        })
        if (result?.code !== 200) {
          throw new Error(result?.message || result?.msg || '学生资料加载失败')
        }
        this.formData = {
          name: result.data?.name || '',
          gender: result.data?.gender || '',
          birthdate: Number(result.data?.birthdate) || 0,
          avatar: result.data?.avatar || ''
        }
        this.initialProfile = comparableProfile(this.formData)
      } catch (error) {
        console.error('加载学生资料失败:', error)
        this.loadError = error.message || '请稍后重试'
      } finally {
        this.loading = false
      }
    },
    async saveProfile() {
      if (this.saving || this.avatarUploading || !this.hasChanges) return
      const value = await this.$refs.profileForm.validate()
      if (!value) return
      this.saving = true
      try {
        const result = await this.callChildFunction({
          action: 'update',
          childId: this.childId,
          submitChildrenData: value
        })
        if (result?.code !== 200) {
          throw new Error(result?.message || result?.msg || '保存失败')
        }
        this.formData = {
          ...this.formData,
          ...result.data
        }
        this.initialProfile = comparableProfile(this.formData)
        uni.showToast({ title: '学生资料已更新', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 500)
      } catch (error) {
        console.error('保存学生资料失败:', error)
        uni.showToast({ title: error.message || '保存失败', icon: 'none' })
      } finally {
        this.saving = false
      }
    },
    handleBack() {
      if (this.avatarUploading) {
        uni.showToast({ title: '请等头像上传完成', icon: 'none' })
        return
      }
      if (this.hasChanges) {
        this.leaveDialogVisible = true
        return
      }
      uni.navigateBack()
    },
    confirmLeave() {
      this.leaveDialogVisible = false
      uni.navigateBack()
    }
  }
}
</script>

<style lang="scss" scoped>
.profile-page {
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
  background:
    radial-gradient(circle at 7% 40%, rgba(255, 212, 71, 0.28) 0 88rpx, transparent 90rpx),
    linear-gradient(180deg, #fff8df 0%, #fff4ed 48%, #f4efff 100%);
}

.page-orb {
  position: fixed;
  z-index: 0;
  pointer-events: none;
  border: 4rpx solid #392f59;
}

.page-orb--coral {
  top: 36%;
  left: -50rpx;
  width: 106rpx;
  height: 106rpx;
  border-radius: 50%;
  background: #ff8f82;
  box-shadow: 10rpx 10rpx 0 #ffd447;
}

.page-orb--purple {
  right: -42rpx;
  bottom: 18%;
  width: 90rpx;
  height: 132rpx;
  border-radius: 46rpx;
  background: #a58bff;
  transform: rotate(-12deg);
}

.page-content {
  position: relative;
  z-index: 1;
  padding: 34rpx 32rpx 100rpx;
}

.save-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  width: 100%;
  height: 96rpx;
  margin: 42rpx 0 0;
  padding: 0;
  color: #fff;
  border: 4rpx solid #392f59;
  border-radius: 28rpx;
  background: #7c63e8;
  box-shadow: 8rpx 8rpx 0 #ffd447;
  font-size: 31rpx;
  font-weight: 900;

  &::after {
    border: 0;
  }

  &[disabled] {
    color: #716987;
    border-color: #827b94;
    background: #ded9e9;
    box-shadow: 6rpx 6rpx 0 #c7c0d5;
  }
}

.save-button--pressed {
  transform: translate(4rpx, 4rpx);
  box-shadow: 3rpx 3rpx 0 #ffd447;
}

.save-arrow {
  font-size: 38rpx;
  font-weight: 900;
}

.error-card {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  flex-direction: column;
  margin: 54rpx 32rpx;
  padding: 58rpx 32rpx;
  border: 4rpx solid #392f59;
  border-radius: 36rpx;
  background: #fff;
  box-shadow: 9rpx 9rpx 0 #79dfc2;
}

.error-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 112rpx;
  height: 112rpx;
  margin-bottom: 20rpx;
  border: 3rpx solid #392f59;
  border-radius: 38rpx;
  background: #ffd447;
  font-size: 56rpx;
  transform: rotate(-4deg);
}

.error-title {
  color: #31284f;
  font-size: 30rpx;
  font-weight: 900;
}

.error-copy {
  margin-top: 10rpx;
  color: #7a728d;
  font-size: 23rpx;
  font-weight: 700;
  text-align: center;
}

.retry-button {
  height: 74rpx;
  margin-top: 26rpx;
  padding: 0 28rpx;
  color: #392f59;
  border: 3rpx solid #392f59;
  border-radius: 22rpx;
  background: #ffb6ad;
  box-shadow: 4rpx 4rpx 0 #a58bff;
  font-size: 25rpx;
  font-weight: 900;
  line-height: 68rpx;

  &::after {
    border: 0;
  }
}
</style>
