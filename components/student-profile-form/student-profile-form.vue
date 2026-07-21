<template>
  <view class="student-profile-form">
    <view class="avatar-card">
      <view class="avatar-confetti avatar-confetti--one">+</view>
      <view class="avatar-confetti avatar-confetti--two">●</view>
      <button
        class="avatar-button"
        open-type="chooseAvatar"
        hover-class="avatar-button--pressed"
        @chooseavatar="handleChooseAvatar"
        @click="handleAvatarTap"
      >
        <image class="avatar-image" :src="avatarDisplayUrl" mode="aspectFill" />
        <view class="camera-badge">{{ uploading ? '…' : '📷' }}</view>
      </button>
      <view class="avatar-copy">
        <text class="avatar-title">{{ mode === 'edit' ? '更新孩子头像' : '录入孩子头像' }}</text>
        <text class="avatar-hint">{{ uploading ? '头像上传中，请稍等' : '点击头像，选择一张清晰照片' }}</text>
        <view v-if="hasCustomAvatar && !uploading" class="reset-avatar" @click="resetAvatar">
          恢复默认头像
        </view>
      </view>
    </view>

    <view class="class-chip">
      <text class="class-chip-icon">🏫</text>
      <text class="class-chip-label">所属班级</text>
      <text class="class-chip-value">{{ className || '当前班级' }}</text>
    </view>

    <view class="field-card field-card--name">
      <view class="field-heading">
        <view class="field-number">1</view>
        <view>
          <text class="field-label">孩子称呼</text>
          <text class="field-hint">请填写孩子的真实名字</text>
        </view>
      </view>
      <view class="text-input-wrap">
        <input
          v-model="localData.name"
          class="text-input"
          type="text"
          maxlength="10"
          placeholder="例如：小苗"
          placeholder-class="input-placeholder"
          @input="emitChange"
        />
        <text class="input-count">{{ localData.name.length }}/10</text>
      </view>
    </view>

    <view class="field-card field-card--gender">
      <view class="field-heading">
        <view class="field-number">2</view>
        <view>
          <text class="field-label">孩子性别</text>
          <text class="field-hint">选择后会配上对应的默认头像</text>
        </view>
      </view>
      <view class="gender-options">
        <view
          class="gender-option gender-option--boy"
          :class="{ 'gender-option--active': localData.gender === '男孩' }"
          @click="setGender('男孩')"
        >
          <text class="gender-emoji">👦</text>
          <text class="gender-label">男孩</text>
          <view v-if="localData.gender === '男孩'" class="gender-check">✓</view>
        </view>
        <view
          class="gender-option gender-option--girl"
          :class="{ 'gender-option--active': localData.gender === '女孩' }"
          @click="setGender('女孩')"
        >
          <text class="gender-emoji">👧</text>
          <text class="gender-label">女孩</text>
          <view v-if="localData.gender === '女孩'" class="gender-check">✓</view>
        </view>
      </view>
    </view>

    <view class="field-card field-card--birthday">
      <view class="field-heading">
        <view class="field-number">3</view>
        <view>
          <text class="field-label">出生日期</text>
          <text class="field-hint">用于匹配合适的成长评估</text>
        </view>
      </view>
      <picker
        mode="date"
        :value="birthdayText"
        :start="minimumBirthday"
        :end="maximumBirthday"
        @change="handleBirthdayChange"
      >
        <view class="birthday-picker" :class="{ 'birthday-picker--empty': !localData.birthdate }">
          <view class="birthday-icon">🎂</view>
          <text>{{ birthdayText || '请选择出生日期' }}</text>
          <text class="birthday-arrow">›</text>
        </view>
      </picker>
    </view>

    <view class="field-card field-card--guardian">
      <view class="field-heading guardian-heading">
        <view class="field-number">4</view>
        <view class="guardian-heading-copy">
          <text class="field-label">孩子的监护人</text>
          <text class="field-hint">家长将通过手机号自动识别并加入班级</text>
        </view>
        <view class="guardian-count">{{ localData.guardians.length }}/4</view>
      </view>

      <view
        v-for="(guardian, index) in localData.guardians"
        :key="`guardian-${index}`"
        class="guardian-card"
      >
        <view class="guardian-card-top">
          <text class="guardian-index">监护人 {{ index + 1 }}</text>
          <view
            v-if="localData.guardians.length > 1"
            class="guardian-remove"
            @click="removeGuardian(index)"
          >移除</view>
        </view>
        <view class="relationship-options">
          <view
            v-for="option in relationshipOptions"
            :key="option.value"
            class="relationship-option"
            :class="{ 'relationship-option--active': guardian.relationship === option.value }"
            @click="setGuardianRelationship(index, option.value)"
          >
            <text>{{ option.emoji }}</text>
            <text>{{ option.label }}</text>
          </view>
        </view>
        <view class="guardian-mobile-wrap">
          <text class="guardian-mobile-prefix">+86</text>
          <input
            v-model="guardian.mobile"
            class="guardian-mobile-input"
            type="number"
            maxlength="11"
            placeholder="请填写监护人手机号"
            placeholder-class="input-placeholder"
            @input="emitChange"
          />
        </view>
      </view>

      <button
        v-if="localData.guardians.length < 4"
        class="guardian-add"
        hover-class="guardian-add--pressed"
        @click="addGuardian"
      >
        <text class="guardian-add-icon">+</text>
        <text>再添加一位监护人</text>
      </button>
    </view>

    <view class="privacy-note">
      <text class="privacy-icon">🛡️</text>
      <text>孩子资料和监护人手机号仅用于班级身份匹配，不会向其他家长展示</text>
    </view>
  </view>
</template>

<script>
import {
  DEFAULT_AVATAR_BOY,
  DEFAULT_AVATAR_GIRL
} from '@/lib/types/local_storage.js'

const defaultBirthdate = () => {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 4)
  return date.getTime()
}

const normalizeGender = value => {
  const gender = String(value || '').trim().toLowerCase()
  if (['男孩', '男', 'male', 'boy'].includes(gender)) return '男孩'
  if (['女孩', '女', 'female', 'girl'].includes(gender)) return '女孩'
  return String(value || '')
}

export default {
  name: 'StudentProfileForm',
  props: {
    modelValue: {
      type: Object,
      default: () => ({})
    },
    className: {
      type: String,
      default: ''
    },
    mode: {
      type: String,
      default: 'create'
    }
  },
  emits: ['update:modelValue', 'uploading'],
  data() {
    return {
      localData: this.normalizeValue(this.modelValue),
      avatarPreview: '',
      uploading: false,
      relationshipOptions: [
        { value: 'father', label: '爸爸', emoji: '👨' },
        { value: 'mother', label: '妈妈', emoji: '👩' },
        { value: 'other_guardian', label: '其他监护人', emoji: '🧑' }
      ]
    }
  },
  computed: {
    defaultAvatar() {
      return this.localData.gender === '女孩' ? DEFAULT_AVATAR_GIRL : DEFAULT_AVATAR_BOY
    },
    avatarDisplayUrl() {
      return this.avatarPreview || this.localData.avatar || this.defaultAvatar
    },
    hasCustomAvatar() {
      const avatar = String(this.localData.avatar || '')
      return Boolean(avatar && avatar !== DEFAULT_AVATAR_BOY && avatar !== DEFAULT_AVATAR_GIRL)
    },
    birthdayText() {
      return this.formatBirthday(this.localData.birthdate)
    },
    minimumBirthday() {
      const date = new Date()
      date.setFullYear(date.getFullYear() - 18)
      return this.formatDate(date)
    },
    maximumBirthday() {
      return this.formatDate(new Date())
    }
  },
  watch: {
    modelValue: {
      deep: true,
      handler(value) {
        const normalized = this.normalizeValue(value)
        if (JSON.stringify(normalized) !== JSON.stringify(this.localData)) {
          this.localData = normalized
        }
      }
    }
  },
  methods: {
    normalizeValue(value = {}) {
      const guardians = Array.isArray(value.guardians) && value.guardians.length
        ? value.guardians.slice(0, 4).map(item => ({
          relationship: ['father', 'mother', 'other_guardian'].includes(item?.relationship)
            ? item.relationship
            : 'other_guardian',
          mobile: String(item?.mobile || '').replace(/\D/g, '').slice(-11)
        }))
        : [{ relationship: 'father', mobile: '' }]
      return {
        ...value,
        name: String(value.name || ''),
        gender: normalizeGender(value.gender),
        birthdate: Number(value.birthdate) || defaultBirthdate(),
        avatar: String(value.avatar || ''),
        guardians
      }
    },
    emitChange() {
      this.$emit('update:modelValue', {
        ...this.localData,
        guardians: this.localData.guardians.map(item => ({ ...item }))
      })
    },
    addGuardian() {
      if (this.localData.guardians.length >= 4) return
      this.localData.guardians.push({ relationship: 'other_guardian', mobile: '' })
      this.emitChange()
    },
    removeGuardian(index) {
      if (this.localData.guardians.length <= 1) return
      this.localData.guardians.splice(index, 1)
      this.emitChange()
    },
    setGuardianRelationship(index, relationship) {
      if (!this.localData.guardians[index]) return
      this.localData.guardians[index].relationship = relationship
      this.emitChange()
    },
    setGender(gender) {
      const wasDefaultAvatar = !this.localData.avatar ||
        this.localData.avatar === DEFAULT_AVATAR_BOY ||
        this.localData.avatar === DEFAULT_AVATAR_GIRL
      this.localData.gender = gender
      if (wasDefaultAvatar) {
        this.localData.avatar = gender === '女孩' ? DEFAULT_AVATAR_GIRL : DEFAULT_AVATAR_BOY
      }
      this.emitChange()
    },
    handleBirthdayChange(event) {
      const value = event.detail.value
      const birthdate = new Date(`${value}T00:00:00`).getTime()
      if (!Number.isNaN(birthdate)) {
        this.localData.birthdate = birthdate
        this.emitChange()
      }
    },
    handleChooseAvatar(event) {
      const filePath = event.detail && event.detail.avatarUrl
      if (filePath) this.uploadAvatar(filePath)
    },
    handleAvatarTap() {
      // #ifdef MP-WEIXIN
      return
      // #endif

      // #ifndef MP-WEIXIN
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: result => {
          const file = result.tempFiles && result.tempFiles[0]
          if (file && Number(file.size) > 5 * 1024 * 1024) {
            uni.showToast({ title: '头像不能超过5MB', icon: 'none' })
            return
          }
          const filePath = result.tempFilePaths && result.tempFilePaths[0]
          if (filePath) this.uploadAvatar(filePath)
        }
      })
      // #endif
    },
    async uploadAvatar(filePath) {
      if (this.uploading) return
      this.uploading = true
      this.avatarPreview = filePath
      this.$emit('uploading', true)
      try {
        const extensionMatch = String(filePath).match(/\.([a-zA-Z0-9]{2,5})(?:\?|$)/)
        const extension = extensionMatch ? extensionMatch[1].toLowerCase() : 'jpg'
        const userInfo = uni.getStorageSync('uni-id-pages-userInfo') || {}
        const ownerId = String(userInfo._id || '').replace(/[^a-zA-Z0-9_-]/g, '') || 'teacher'
        const cloudPath = `children/avatars/${ownerId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`
        const result = await uniCloud.uploadFile({
          filePath,
          cloudPath,
          fileType: 'image'
        })
        if (!result.fileID) throw new Error('头像上传失败')
        this.localData.avatar = result.fileID
        this.avatarPreview = ''
        this.emitChange()
        uni.showToast({ title: '头像已录入', icon: 'success' })
      } catch (error) {
        console.error('学生头像上传失败:', error)
        this.avatarPreview = ''
        uni.showToast({ title: error.message || '头像上传失败', icon: 'none' })
      } finally {
        this.uploading = false
        this.$emit('uploading', false)
      }
    },
    resetAvatar() {
      this.avatarPreview = ''
      this.localData.avatar = this.defaultAvatar
      this.emitChange()
    },
    async validate() {
      if (this.uploading) {
        uni.showToast({ title: '请等头像上传完成', icon: 'none' })
        return null
      }
      const name = String(this.localData.name || '').trim()
      if (!name) {
        uni.showToast({ title: '请填写孩子名字', icon: 'none' })
        return null
      }
      if (name.length > 10) {
        uni.showToast({ title: '孩子名字不能超过10个字', icon: 'none' })
        return null
      }
      if (/(\u8001\u5e08|\u5c0f\u670b\u53cb|\u513f\u7ae5|\u5b66\u751f)/.test(name)) {
        uni.showToast({ title: '请填写孩子的真实名字', icon: 'none' })
        return null
      }
      if (!['男孩', '女孩'].includes(this.localData.gender)) {
        uni.showToast({ title: '请选择孩子性别', icon: 'none' })
        return null
      }
      const birthdate = Number(this.localData.birthdate)
      if (!Number.isFinite(birthdate) || birthdate <= 0 || birthdate > Date.now()) {
        uni.showToast({ title: '请选择正确的出生日期', icon: 'none' })
        return null
      }
      if (!this.localData.guardians.length || this.localData.guardians.length > 4) {
        uni.showToast({ title: '请填写1至4位监护人', icon: 'none' })
        return null
      }
      const guardians = this.localData.guardians.map(item => ({
        relationship: item.relationship,
        mobile: String(item.mobile || '').replace(/\D/g, '')
      }))
      const invalidIndex = guardians.findIndex(item => !/^1[3-9]\d{9}$/.test(item.mobile))
      if (invalidIndex >= 0) {
        uni.showToast({ title: `第${invalidIndex + 1}位监护人手机号不正确`, icon: 'none' })
        return null
      }
      if (new Set(guardians.map(item => item.mobile)).size !== guardians.length) {
        uni.showToast({ title: '同一手机号不能重复填写', icon: 'none' })
        return null
      }
      const value = {
        ...this.localData,
        name,
        birthdate,
        avatar: this.localData.avatar || this.defaultAvatar,
        guardians
      }
      this.localData = value
      this.emitChange()
      return { ...value }
    },
    formatBirthday(value) {
      const date = new Date(Number(value))
      if (Number.isNaN(date.getTime())) return ''
      return this.formatDate(date)
    },
    formatDate(date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }
}
</script>

<style lang="scss" scoped>
.student-profile-form {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.avatar-card {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 190rpx;
  overflow: hidden;
  padding: 26rpx;
  border: 4rpx solid #392f59;
  border-radius: 34rpx;
  background: linear-gradient(135deg, #fff1ac 0%, #ffb6ad 100%);
  box-shadow: 8rpx 8rpx 0 #a58bff;
  box-sizing: border-box;
}

.avatar-confetti {
  position: absolute;
  color: #7c63e8;
  font-weight: 900;
  pointer-events: none;
}

.avatar-confetti--one {
  top: 4rpx;
  right: 34rpx;
  font-size: 48rpx;
  transform: rotate(16deg);
}

.avatar-confetti--two {
  right: 88rpx;
  bottom: 14rpx;
  color: #ff765f;
  font-size: 18rpx;
}

.avatar-button {
  position: relative;
  flex-shrink: 0;
  width: 134rpx;
  height: 134rpx;
  margin: 0 26rpx 0 0;
  padding: 0;
  overflow: visible;
  border: 4rpx solid #392f59;
  border-radius: 42rpx;
  background: #fff;
  box-shadow: 6rpx 6rpx 0 #79dfc2;
  line-height: 1;

  &::after {
    border: 0;
  }
}

.avatar-button--pressed {
  transform: translate(3rpx, 3rpx);
  box-shadow: 2rpx 2rpx 0 #79dfc2;
}

.avatar-image {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: 5rpx solid #fff;
  border-radius: 38rpx;
  box-sizing: border-box;
}

.camera-badge {
  position: absolute;
  right: -13rpx;
  bottom: -13rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  border: 3rpx solid #392f59;
  border-radius: 50%;
  background: #ffd447;
  box-shadow: 3rpx 3rpx 0 #392f59;
  font-size: 23rpx;
}

.avatar-copy {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
}

.avatar-title,
.avatar-hint {
  display: block;
}

.avatar-title {
  color: #31284f;
  font-size: 30rpx;
  font-weight: 900;
}

.avatar-hint {
  margin-top: 8rpx;
  color: #6d647c;
  font-size: 22rpx;
  font-weight: 700;
  line-height: 1.45;
}

.reset-avatar {
  display: inline-flex;
  margin-top: 12rpx;
  padding: 6rpx 13rpx;
  color: #392f59;
  border: 2rpx solid #392f59;
  border-radius: 999rpx;
  background: #fff;
  font-size: 20rpx;
  font-weight: 900;
}

.class-chip {
  display: flex;
  align-items: center;
  min-height: 62rpx;
  padding: 8rpx 16rpx;
  border: 3rpx solid #392f59;
  border-radius: 22rpx;
  background: #c9f4e6;
  box-sizing: border-box;
}

.class-chip-icon {
  margin-right: 8rpx;
  font-size: 24rpx;
}

.class-chip-label {
  color: #716987;
  font-size: 21rpx;
  font-weight: 800;
}

.class-chip-value {
  flex: 1;
  margin-left: 12rpx;
  overflow: hidden;
  color: #31284f;
  font-size: 24rpx;
  font-weight: 900;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-card {
  padding: 24rpx;
  border: 4rpx solid #392f59;
  border-radius: 30rpx;
  background: #fff;
  box-shadow: 7rpx 7rpx 0 #ffd447;
}

.field-card--gender {
  box-shadow: 7rpx 7rpx 0 #79dfc2;
}

.field-card--birthday {
  box-shadow: 7rpx 7rpx 0 #ffb6ad;
}

.field-heading {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.field-number {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 46rpx;
  height: 46rpx;
  margin-right: 14rpx;
  color: #fff;
  border: 3rpx solid #392f59;
  border-radius: 15rpx;
  background: #7c63e8;
  font-size: 23rpx;
  font-weight: 900;
  box-shadow: 3rpx 3rpx 0 #ffd447;
}

.field-label,
.field-hint {
  display: block;
}

.field-label {
  color: #31284f;
  font-size: 28rpx;
  font-weight: 900;
}

.field-hint {
  margin-top: 3rpx;
  color: #837a93;
  font-size: 20rpx;
  font-weight: 650;
}

.text-input-wrap {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 20rpx;
  border: 3rpx solid #392f59;
  border-radius: 23rpx;
  background: #fffaf0;
  box-sizing: border-box;
}

.text-input {
  flex: 1;
  min-width: 0;
  height: 82rpx;
  color: #31284f;
  font-size: 28rpx;
  font-weight: 800;
}

.input-placeholder {
  color: #a49dad;
  font-weight: 600;
}

.input-count {
  margin-left: 12rpx;
  color: #8d859b;
  font-size: 20rpx;
  font-weight: 700;
}

.gender-options {
  display: flex;
  gap: 18rpx;
}

.gender-option {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 98rpx;
  border: 3rpx solid #392f59;
  border-radius: 25rpx;
  background: #eef5ff;
  box-shadow: 4rpx 4rpx 0 rgba(57, 47, 89, 0.18);
  box-sizing: border-box;
}

.gender-option--girl {
  background: #fff0f1;
}

.gender-option--active {
  background: #a9d5ff;
  box-shadow: 5rpx 5rpx 0 #7c63e8;
  transform: translate(-2rpx, -2rpx);
}

.gender-option--girl.gender-option--active {
  background: #ffb6cf;
}

.gender-emoji {
  margin-right: 9rpx;
  font-size: 35rpx;
}

.gender-label {
  color: #392f59;
  font-size: 27rpx;
  font-weight: 900;
}

.gender-check {
  position: absolute;
  top: -11rpx;
  right: -9rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36rpx;
  height: 36rpx;
  color: #fff;
  border: 3rpx solid #392f59;
  border-radius: 50%;
  background: #7c63e8;
  font-size: 20rpx;
  font-weight: 900;
}

.birthday-picker {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 18rpx;
  color: #31284f;
  border: 3rpx solid #392f59;
  border-radius: 23rpx;
  background: #fffaf0;
  font-size: 27rpx;
  font-weight: 900;
  box-sizing: border-box;
}

.birthday-picker--empty {
  color: #a49dad;
}

.birthday-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  margin-right: 13rpx;
  border: 2rpx solid #392f59;
  border-radius: 15rpx;
  background: #ffd447;
  font-size: 23rpx;
}

.birthday-arrow {
  margin-left: auto;
  font-size: 36rpx;
  font-weight: 900;
}

.field-card--guardian {
  box-shadow: 7rpx 7rpx 0 #a58bff;
}

.guardian-heading-copy {
  flex: 1;
  min-width: 0;
}

.guardian-count {
  flex-shrink: 0;
  margin-left: 12rpx;
  padding: 6rpx 13rpx;
  color: #fff;
  border: 3rpx solid #392f59;
  border-radius: 999rpx;
  background: #ff765f;
  font-size: 20rpx;
  font-weight: 900;
}

.guardian-card {
  padding: 18rpx;
  border: 3rpx solid #392f59;
  border-radius: 24rpx;
  background: #fffaf0;

  & + & {
    margin-top: 18rpx;
  }
}

.guardian-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14rpx;
}

.guardian-index {
  color: #392f59;
  font-size: 23rpx;
  font-weight: 900;
}

.guardian-remove {
  padding: 5rpx 12rpx;
  color: #b33b38;
  border: 2rpx solid #b33b38;
  border-radius: 999rpx;
  background: #fff0ef;
  font-size: 19rpx;
  font-weight: 900;
}

.relationship-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.relationship-option {
  display: flex;
  align-items: center;
  gap: 5rpx;
  min-height: 54rpx;
  padding: 0 15rpx;
  color: #685f78;
  border: 2rpx solid #a79fb2;
  border-radius: 18rpx;
  background: #fff;
  font-size: 20rpx;
  font-weight: 800;
  box-sizing: border-box;
}

.relationship-option--active {
  color: #392f59;
  border: 3rpx solid #392f59;
  background: #ffd447;
  box-shadow: 3rpx 3rpx 0 #a58bff;
}

.guardian-mobile-wrap {
  display: flex;
  align-items: center;
  height: 78rpx;
  margin-top: 15rpx;
  padding: 0 17rpx;
  border: 3rpx solid #392f59;
  border-radius: 20rpx;
  background: #fff;
  box-sizing: border-box;
}

.guardian-mobile-prefix {
  margin-right: 14rpx;
  padding-right: 14rpx;
  color: #7c63e8;
  border-right: 2rpx solid #ddd5e8;
  font-size: 23rpx;
  font-weight: 900;
}

.guardian-mobile-input {
  flex: 1;
  height: 72rpx;
  color: #31284f;
  font-size: 26rpx;
  font-weight: 800;
}

.guardian-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  width: 100%;
  height: 72rpx;
  margin-top: 18rpx;
  padding: 0;
  color: #392f59;
  border: 3rpx dashed #392f59;
  border-radius: 22rpx;
  background: #eee9ff;
  font-size: 23rpx;
  font-weight: 900;

  &::after {
    border: 0;
  }
}

.guardian-add-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 35rpx;
  height: 35rpx;
  color: #fff;
  border: 2rpx solid #392f59;
  border-radius: 50%;
  background: #7c63e8;
  font-size: 28rpx;
}

.guardian-add--pressed {
  transform: translateY(2rpx);
  background: #dfd7ff;
}

.privacy-note {
  display: flex;
  align-items: flex-start;
  padding: 18rpx 20rpx;
  color: #655d78;
  border: 2rpx dashed #392f59;
  border-radius: 22rpx;
  background: #eee9ff;
  font-size: 21rpx;
  font-weight: 700;
  line-height: 1.5;
}

.privacy-icon {
  flex-shrink: 0;
  margin-right: 9rpx;
}
</style>
