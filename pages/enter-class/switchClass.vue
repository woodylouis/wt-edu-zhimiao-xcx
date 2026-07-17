<template>
    <view class="growth-assessment">
        <view class="page-orb orb-coral"></view>
        <view class="page-orb orb-purple"></view>
        <view class="page-spark">+</view>
        <u-sticky>
            <custom-nav 
                :needBack="true" 
                :needBar="false" 
                :xcxName="'切换'" 
                :backHandler="handleNavBack"
                navCustomStyle="background: linear-gradient(135deg, #FFF2B8 0%, #FFD778 45%, #FFB8AC 100%);height: calc(100vh / 8);"
            />
        </u-sticky>
        <view class="form-container">
            <view class="form-header">
                <view class="header-kicker">MY GROWTH CLASS</view>
                <view class="form-title">选择班级</view>
                <view class="form-description">请选择您要进入的班级</view>
            </view>
            
            <!-- 角色切换 -->
            <view class="role-tabs">
                <view 
                    class="role-tab" 
                    :class="{ 'role-tab-active': selectedRole === 'parent' }"
                    @click="handleRoleChange('parent')"
                >
                    <text class="role-icon">👨‍👩‍👧</text>
                    <text class="role-text">我是家长</text>
                </view>
                <view 
                    class="role-tab" 
                    :class="{ 'role-tab-active': selectedRole === 'teacher' }"
                    @click="handleRoleChange('teacher')"
                >
                    <text class="role-icon">👩‍🏫</text>
                    <text class="role-text">我是老师</text>
                </view>
            </view>
            
            <!-- 无数据状态 -->
            <view v-if="groupedClasses[selectedRole].length === 0" class="no-data">
                <view class="empty-illustration">🏫</view>
                <text class="empty-text">暂无班级数据</text>
                <text class="empty-hint">请先加入班级</text>
            </view>
            
            <!-- 学校分组列表 -->
            <view v-else class="school-groups">
                <view 
                    v-for="(school, schoolIndex) in groupedClasses[selectedRole]" 
                    :key="school.schoolId || schoolIndex"
                    class="school-group"
                    :class="{ 
                        'school-group-expanded': expandedSchoolId === school.schoolId,
                        'school-group-nearest': schoolIndex === 0 && school.distance !== null
                    }"
                >
                    <!-- 学校头部（可点击展开/收起） -->
                    <view class="school-header" @click="toggleSchool(school.schoolId)">
                        <view class="school-header-left">
                            <view class="school-avatar" :class="getSchoolAvatarClass(schoolIndex)">
                                <text class="school-emoji">{{ getSchoolEmoji(schoolIndex) }}</text>
                            </view>
                            <view class="school-info">
                                <view class="school-name-row">
                                    <text class="school-name">{{ school.schoolName }}</text>
                                    <view v-if="schoolIndex === 0 && school.distance !== null" class="nearest-badge">
                                        <text>最近</text>
                                    </view>
                                </view>
                                <view class="school-meta">
                                    <view class="meta-item">
                                        <!-- <text class="meta-icon">🏫</text> -->
                                        <text>{{ school.classes.length }}个班级</text>
                                    </view>
                                    <view v-if="school.distance !== null" class="meta-item" :class="getDistanceClass(school.distance)">
                                        <text class="meta-icon">📍</text>
                                        <text>{{ formatDistance(school.distance) }}</text>
                                    </view>
                                    <view v-if="school.distance !== null && school.distance <= 1500" class="in-range-tag">
                                        <text>✅ 范围内</text>
                                    </view>
                                </view>
                            </view>
                        </view>
                        <view class="school-header-right">
                            <view class="expand-icon" :class="{ 'expand-icon-rotated': expandedSchoolId === school.schoolId }">
                                <text>▼</text>
                            </view>
                        </view>
                    </view>
                    
                    <!-- 班级列表（可展开/收起） -->
                    <view class="class-list" v-if="expandedSchoolId === school.schoolId">
                        <view 
                            v-for="(item, classIndex) in school.classes" 
                            :key="item.classCode"
                            class="class-item"
                            :class="{ 'class-item-selected': isSelected(school.schoolId, classIndex) }"
                            @click.stop="handleSelectClass(school.schoolId, classIndex)"
                        >
                            <view class="class-card">
                                <view class="class-avatar" :style="{ background: getClassColor(classIndex) }">
                                    <text class="avatar-text">{{ item.name.charAt(0) }}</text>
                                </view>
                                <view class="class-info">
                                    <view class="class-name-row">
                                        <text class="class-name">{{ item.name }}</text>
                                        <view v-if="isCurrentClass(item)" class="current-class-badge">
                                            <text>当前</text>
                                        </view>
                                    </view>
                                    <view class="class-identity-row">
                                        <view
                                            class="class-identity-badge"
                                            :class="{ 'class-identity-badge--parent': item.role === 'parent' }"
                                        >
                                            <view class="identity-dot"></view>
                                            <text>{{ item.role === 'teacher' ? '任课老师' : '家长' }}</text>
                                        </view>
                                    </view>
                                </view>
                                <view class="class-check">
                                    <view v-if="isSelected(school.schoolId, classIndex)" class="check-circle">
                                        <text class="check-icon">✓</text>
                                    </view>
                                    <view v-else class="uncheck-circle"></view>
                                </view>
                            </view>
                        </view>
                    </view>
                </view>
            </view>
            
            <!-- 底部占位 -->
            <view style="height: 160rpx;"></view>
        </view>
        
        <!-- 底部固定按钮 -->
        <view class="bottom-action" v-if="selectedClass">
            <view class="selected-info">
                <view class="selected-class-row">
                    <text class="selected-label">已选择：</text>
                    <text class="selected-name">{{ selectedClass.name }}</text>
                </view>
                <view class="selected-school-row">
                    <!-- <text class="school-tag">🏫</text> -->
                    <text class="school-text">{{ selectedSchoolName }}</text>
                </view>
            </view>
            <view class="enter-btn" @click="handleEnterClass">
                <text class="enter-text">进入班级</text>
                <text class="enter-arrow">→</text>
            </view>
        </view>

        <dopamine-modal
            :show="showEnterConfirm"
            eyebrow="即将进入"
            title="确认进入这个班级吗？"
            :content="enterConfirmContent"
            confirm-text="确定进入"
            cancel-text="再看看"
            @confirm="confirmEnterClass"
            @cancel="showEnterConfirm = false"
        />

        <dopamine-loading
            :show="loadingVisible"
            :text="loadingText"
            subtext="小芽正在整理班级信息"
        />
    </view>
</template>

<script>
import DopamineModal from "@/components/dopamine-modal/index.vue"
import DopamineLoading from "@/components/dopamine-loading/index.vue"

export default {
    components: {
        DopamineModal,
        DopamineLoading
    },
    computed: {
        userInfo() {
            return store.userInfo
        },
        groupedClasses() {
            return {
                parent: this.groupBySchool(this.classes.parent),
                teacher: this.groupBySchool(this.classes.teacher)
            }
        },
        hasClassData() {
            return {
                parent: this.classes.parent.length > 0,
                teacher: this.classes.teacher.length > 0
            }
        },
        defaultRole() {
            return this.hasClassData.parent ? 'parent' :
                this.hasClassData.teacher ? 'teacher' : 'parent'
        },
        selectedClass() {
            if (!this.selectedSchoolId) return null
            const school = this.groupedClasses[this.selectedRole].find(s => s.schoolId === this.selectedSchoolId)
            return school?.classes[this.selectedClassIndex] || null
        },
        // 获取选中班级所属学校名称
        selectedSchoolName() {
            if (!this.selectedSchoolId) return ''
            const school = this.groupedClasses[this.selectedRole].find(s => s.schoolId === this.selectedSchoolId)
            return school?.schoolName || '未分配学校'
        },
        enterConfirmContent() {
            if (!this.selectedClass) return ''
            return `即将进入「${this.selectedClass.name}」，进入后可以查看学生并开始成长评估。`
        }
    },
    data() {
        return {
            // ========== 开发配置 ==========
            USE_MOCK_LOCATION: false,
            MOCK_LOCATION: {
                latitude: 22.504876,
                longitude: 113.408551
            },
            // ========== 开发配置 END ==========
            
            selectedRole: 'parent',
            selectedSchoolId: null,
            selectedClassIndex: 0,
            expandedSchoolId: null,
            currentClassCode: '',
            classes: {
                parent: [],
                teacher: []
            },
            userLocation: null,
            schoolDistances: {},
            showEnterConfirm: false,
            loadingVisible: false,
            loadingText: '正在加载班级',
            classColors: [
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
            ]
        };
    },
    methods: {
        groupBySchool(classList) {
            const schoolMap = new Map()
            
            classList.forEach(item => {
                const schoolId = item.schoolId || 'unknown'
                const schoolName = item.schoolName || '未分配学校'
                
                if (!schoolMap.has(schoolId)) {
                    schoolMap.set(schoolId, {
                        schoolId,
                        schoolName,
                        latitude: item.schoolLatitude,
                        longitude: item.schoolLongitude,
                        hasLocation: !!(item.schoolLatitude && item.schoolLongitude),
                        distance: this.schoolDistances[schoolId] ?? null,
                        classes: []
                    })
                }
                schoolMap.get(schoolId).classes.push(item)
            })
            
            const result = Array.from(schoolMap.values())
            result.sort((a, b) => {
                if (a.distance === null && b.distance === null) return 0
                if (a.distance === null) return 1
                if (b.distance === null) return -1
                return a.distance - b.distance
            })
            
            return result
        },
        
        toggleSchool(schoolId) {
            this.expandedSchoolId = this.expandedSchoolId === schoolId ? null : schoolId
        },
        
        handleSelectClass(schoolId, classIndex) {
            this.selectedSchoolId = schoolId
            this.selectedClassIndex = classIndex
        },
        
        async handleEnterClass() {
            if (!this.selectedClass) return
            this.showEnterConfirm = true
        },

        async confirmEnterClass() {
            this.showEnterConfirm = false
            await this.doEnterClass()
        },
        
        // 执行进入班级
        async doEnterClass() {
            this.loadingText = '正在进入班级'
            this.loadingVisible = true
            
            try {
                const { result } = await uniCloud.callFunction({
                    name: 'wtdb-business-class-detail',
                    data: { code: this.selectedClass.classCode }
                })
                
                if (result.code === 200) {
                    const currentClass = {
                        ...result.data,
                        memberRole: this.selectedClass.role,
                        memberNickname: this.selectedClass.nickname,
                        schoolName: this.selectedSchoolName
                    }
                    this.currentClassCode = currentClass.code || ''
                    uni.setStorageSync('currentClass', currentClass)
                    uni.redirectTo({
                        url: `/pages/dashboard/teacher/teacher?userNickname=${this.selectedClass.nickname}&role=${this.selectedClass.role}`
                    })
                }
            } catch (e) {
                uni.showToast({ title: '进入失败', icon: 'none' })
            } finally {
                this.loadingVisible = false
            }
        },
        
        isSelected(schoolId, classIndex) {
            return this.selectedSchoolId === schoolId && this.selectedClassIndex === classIndex
        },

        isCurrentClass(item) {
            return !!this.currentClassCode && item.classCode === this.currentClassCode
        },
        
        getClassColor(index) {
            return this.classColors[index % this.classColors.length]
        },
        
        getSchoolAvatarClass(index) {
            const classes = ['avatar-green', 'avatar-blue', 'avatar-purple', 'avatar-orange']
            return classes[index % classes.length]
        },
        
        getSchoolEmoji(index) {
            const emojis = ['🏫', '🏢', '🏰', '🌟']
            return emojis[index % emojis.length]
        },
        
        async loadClasses() {
            this.loadingText = '正在整理班级'
            this.loadingVisible = true
            try {
                const res = await uniCloud.callFunction({
                    name: 'wtdb-business-member-class',
                    data: {
                        uniIdToken: uni.getStorageSync('uni_id_token')
                    }
                })

                if (res.result.code === 200) {
                    this.classes.parent = res.result.data
                        .filter(item => item.role === 'parent')
                        .map(item => ({
                            name: item.classInfo.nickname,
                            classCode: item.classInfo.code,
                            nickname: item.nickname || '家长',
                            role: item.role,
                            schoolId: item.classInfo.school_id || item.schoolInfo?.school_id || 'unknown',
                            schoolName: item.schoolInfo?.name || '未分配学校',
                            schoolLatitude: item.schoolInfo?.latitude,
                            schoolLongitude: item.schoolInfo?.longitude
                        }))

                    this.classes.teacher = res.result.data
                        .filter(item => item.role === 'teacher')
                        .map(item => ({
                            name: item.classInfo.nickname,
                            classCode: item.classInfo.code,
                            nickname: item.classInfo.teacherName || item.classInfo.class_creator_teacher || '老师',
                            role: item.role,
                            schoolId: item.classInfo.school_id || item.schoolInfo?.school_id || 'unknown',
                            schoolName: item.schoolInfo?.name || '未分配学校',
                            schoolLatitude: item.schoolInfo?.latitude,
                            schoolLongitude: item.schoolInfo?.longitude
                        }))
                    
                    this.selectedRole = this.defaultRole
                    this.calculateSchoolDistances()
                    
                    this.$nextTick(() => {
                        const groups = this.groupedClasses[this.selectedRole]
                        if (groups.length > 0) {
                            this.expandedSchoolId = groups[0].schoolId
                            this.selectedSchoolId = groups[0].schoolId
                            this.selectedClassIndex = 0
                        }
                    })
                    
                    const currentClass = uni.getStorageSync('currentClass')
                    if (currentClass?.code) {
                        this.restoreSelection(currentClass.code)
                    }
                }
            } catch (error) {
                console.error('班级数据加载失败', error)
                uni.showToast({ title: '加载失败', icon: 'none' })
            } finally {
                this.loadingVisible = false
            }
        },
        
        restoreSelection(classCode) {
            for (const school of this.groupedClasses.parent) {
                const classIndex = school.classes.findIndex(c => c.classCode === classCode)
                if (classIndex > -1) {
                    this.selectedRole = 'parent'
                    this.selectedSchoolId = school.schoolId
                    this.selectedClassIndex = classIndex
                    this.expandedSchoolId = school.schoolId
                    return
                }
            }
            for (const school of this.groupedClasses.teacher) {
                const classIndex = school.classes.findIndex(c => c.classCode === classCode)
                if (classIndex > -1) {
                    this.selectedRole = 'teacher'
                    this.selectedSchoolId = school.schoolId
                    this.selectedClassIndex = classIndex
                    this.expandedSchoolId = school.schoolId
                    return
                }
            }
        },
        
        handleRoleChange(role) {
            this.selectedRole = role
            this.$nextTick(() => {
                const groups = this.groupedClasses[role]
                if (groups.length > 0) {
                    this.expandedSchoolId = groups[0].schoolId
                    this.selectedSchoolId = groups[0].schoolId
                    this.selectedClassIndex = 0
                } else {
                    this.expandedSchoolId = null
                    this.selectedSchoolId = null
                }
            })
        },
        
        getUserLocation() {
            if (this.USE_MOCK_LOCATION) {
                this.userLocation = { ...this.MOCK_LOCATION }
                this.calculateSchoolDistances()
                return
            }
            
            uni.getFuzzyLocation({
                type: 'wgs84',
                success: (res) => {
                    this.userLocation = { latitude: res.latitude, longitude: res.longitude }
                    this.calculateSchoolDistances()
                    console.log('用户位置获取成功', res)
                },
                fail: (err) => { this.userLocation = null; console.log('用户位置获取失败', err) }
            })
        },
        
        calculateSchoolDistances() {
            if (!this.userLocation) return
            
            const allClasses = [...this.classes.parent, ...this.classes.teacher]
            const schoolSet = new Set()
            
            allClasses.forEach(item => {
                if (item.schoolId && item.schoolLatitude && item.schoolLongitude && !schoolSet.has(item.schoolId)) {
                    schoolSet.add(item.schoolId)
                    const distance = this.calculateDistance(
                        this.userLocation.latitude,
                        this.userLocation.longitude,
                        item.schoolLatitude,
                        item.schoolLongitude
                    )
                    this.$set(this.schoolDistances, item.schoolId, distance)
                }
            })
        },
        
        calculateDistance(lat1, lon1, lat2, lon2) {
            const R = 6371000
            const dLat = this.toRad(lat2 - lat1)
            const dLon = this.toRad(lon2 - lon1)
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2)
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
            return Math.round(R * c)
        },
        
        toRad(deg) { return deg * (Math.PI / 180) },
        
        formatDistance(distance) {
            if (distance === null || distance === undefined) return ''
            return distance < 1000 ? `${distance}m` : `${(distance / 1000).toFixed(1)}km`
        },
        
        getDistanceClass(distance) {
            if (distance === null) return ''
            if (distance <= 500) return 'distance-near'
            if (distance <= 1500) return 'distance-medium'
            return 'distance-far'
        }
    },

    onLoad() {
        const currentClass = uni.getStorageSync('currentClass') || {}
        this.currentClassCode = currentClass.code || ''
        this.getUserLocation()
        this.loadClasses()
    }
}
</script>

<style lang="scss" scoped>
.growth-assessment {
    min-height: 100vh;
    // 从头部颜色平滑过渡到内容区域
    background: linear-gradient(180deg, 
        #F5FDF8 0%,      // 与头部左侧衰接
        #F1FCF5 8%,      // 与头部中间衰接
        #e8f5e9 20%,     // 过渡色
        #f5f5f5 45%      // 内容区域背景色
    );
}

.form-container {
    padding: 0 32rpx 32rpx 32rpx;
    padding-bottom: 180rpx;
}

.form-header {
    margin-bottom: 32rpx;
    
    .form-title {
        font-size: 44rpx;
        font-weight: 700;
        color: #1a1a1a;
        margin-bottom: 8rpx;
    }
    
    .form-description {
        font-size: 28rpx;
        color: #666;
    }
}

// 角色切换Tab
.role-tabs {
    display: flex;
    gap: 24rpx;
    margin-bottom: 32rpx;
    
    .role-tab {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12rpx;
        padding: 28rpx 24rpx;
        background: #fff;
        border-radius: 24rpx;
        border: 3rpx solid transparent;
        box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
        transition: all 0.3s ease;
        
        .role-icon {
            font-size: 36rpx;
        }
        
        .role-text {
            font-size: 28rpx;
            font-weight: 500;
            color: #666;
        }
        
        &-active {
            border-color: #4CAF50;
            background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
            box-shadow: 0 4rpx 20rpx rgba(76, 175, 80, 0.2);
            
            .role-text {
                color: #2e7d32;
                font-weight: 600;
            }
        }
    }
}

// 无数据状态
.no-data {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 120rpx 40rpx;
    
    .empty-illustration {
        font-size: 120rpx;
        margin-bottom: 24rpx;
    }
    
    .empty-text {
        font-size: 32rpx;
        color: #666;
        margin-bottom: 12rpx;
    }
    
    .empty-hint {
        font-size: 26rpx;
        color: #999;
    }
}

// 学校分组
.school-groups {
    display: flex;
    flex-direction: column;
    gap: 24rpx;
}

.school-group {
    background: #fff;
    border-radius: 28rpx;
    overflow: hidden;
    box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.06);
    transition: all 0.3s ease;
    
    &-expanded {
        box-shadow: 0 12rpx 40rpx rgba(76, 175, 80, 0.15);
    }
    
    &-nearest {
        border: 3rpx solid #4CAF50;
    }
}

// 学校头部
.school-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 28rpx 32rpx;
    background: #fff;
    
    &:active {
        background: #f9f9f9;
    }
}

.school-header-left {
    display: flex;
    align-items: flex-start;
    flex: 1;
    min-width: 0;
}

.school-avatar {
    width: 80rpx;
    height: 80rpx;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 24rpx;
    margin-top: 4rpx;
    flex-shrink: 0;
    
    .school-emoji {
        font-size: 40rpx;
    }
    
    &.avatar-green {
        background: linear-gradient(135deg, #c8e6c9 0%, #a5d6a7 100%);
    }
    &.avatar-blue {
        background: linear-gradient(135deg, #bbdefb 0%, #90caf9 100%);
    }
    &.avatar-purple {
        background: linear-gradient(135deg, #e1bee7 0%, #ce93d8 100%);
    }
    &.avatar-orange {
        background: linear-gradient(135deg, #ffe0b2 0%, #ffcc80 100%);
    }
}

.school-info {
    flex: 1;
    min-width: 0;
}

.school-name-row {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 8rpx;
}

.school-name {
    font-size: 30rpx;
    font-weight: 600;
    color: #1a1a1a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.nearest-badge {
    background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
    color: #fff;
    font-size: 20rpx;
    font-weight: 600;
    padding: 4rpx 12rpx;
    border-radius: 12rpx;
}

.school-meta {
    display: flex;
    align-items: center;
    gap: 16rpx;
    flex-wrap: wrap;
    line-height: 1;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 6rpx;
    font-size: 24rpx;
    color: #888;
    height: 40rpx;
    line-height: 40rpx;
    
    .meta-icon {
        font-size: 22rpx;
        line-height: 1;
    }
    
    &.distance-near { color: #2e7d32; }
    &.distance-medium { color: #f57c00; }
    &.distance-far { color: #c62828; }
}

.in-range-tag {
    display: flex;
    align-items: center;
    font-size: 22rpx;
    color: #2e7d32;
    background: #e8f5e9;
    padding: 0 12rpx;
    height: 40rpx;
    line-height: 40rpx;
    border-radius: 12rpx;
}

.school-header-right {
    margin-left: 16rpx;
}

.expand-icon {
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #999;
    font-size: 24rpx;
    transition: transform 0.3s ease;
    
    &-rotated {
        transform: rotate(180deg);
    }
}

// 班级列表
.class-list {
    padding: 0 24rpx 24rpx;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    animation: slideDown 0.3s ease;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10rpx);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.class-item {
    border-radius: 20rpx;
    transition: all 0.2s ease;
    
    &:active {
        transform: scale(0.98);
    }
}

.class-card {
    display: flex;
    align-items: center;
    padding: 24rpx;
    background: #f8f9fa;
    border-radius: 20rpx;
    border: 3rpx solid transparent;
    transition: all 0.2s ease;
}

.class-item-selected .class-card {
    background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
    border-color: #4CAF50;
}

.class-avatar {
    width: 88rpx;
    height: 88rpx;
    border-radius: 18rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 20rpx;
    flex-shrink: 0;
    
    .avatar-text {
        font-size: 36rpx;
        font-weight: 700;
        color: #fff;
    }
}

.class-info {
    flex: 1;
    min-width: 0;
    
    .class-name {
        font-size: 30rpx;
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 6rpx;
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    
    .class-role {
        font-size: 24rpx;
        color: #888;
    }
}

.class-check {
    margin-left: 16rpx;
    
    .check-circle {
        width: 48rpx;
        height: 48rpx;
        background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        
        .check-icon {
            color: #fff;
            font-size: 28rpx;
            font-weight: 700;
        }
    }
    
    .uncheck-circle {
        width: 48rpx;
        height: 48rpx;
        border: 3rpx solid #ddd;
        border-radius: 50%;
        background: #fff;
    }
}

// 底部固定按钮
.bottom-action {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 24rpx 32rpx;
    padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
    background: #fff;
    box-shadow: 0 -8rpx 32rpx rgba(0, 0, 0, 0.08);
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 100;
}

.selected-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    
    .selected-class-row {
        display: flex;
        align-items: center;
    }
    
    .selected-label {
        font-size: 24rpx;
        color: #888;
    }
    
    .selected-name {
        font-size: 30rpx;
        font-weight: 600;
        color: #1a1a1a;
        margin-left: 8rpx;
    }
    
    .selected-school-row {
        display: flex;
        align-items: center;
        gap: 6rpx;
    }
    
    .school-tag {
        font-size: 22rpx;
    }
    
    .school-text {
        font-size: 24rpx;
        color: #666;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}

.enter-btn {
    display: flex;
    align-items: center;
    gap: 12rpx;
    padding: 24rpx 48rpx;
    background: linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%);
    border-radius: 48rpx;
    box-shadow: 0 8rpx 24rpx rgba(76, 175, 80, 0.3);
    
    &:active {
        transform: scale(0.96);
        box-shadow: 0 4rpx 16rpx rgba(76, 175, 80, 0.3);
    }
    
    .enter-text {
        font-size: 30rpx;
        font-weight: 600;
        color: #fff;
    }
    
    .enter-arrow {
        font-size: 32rpx;
        color: #fff;
    }
}
</style>

<style scoped lang="scss">
.growth-assessment {
    position: relative;
    min-height: 100vh;
    overflow-x: hidden;
    color: #31284f;
    background:
        radial-gradient(circle at 12% 18%, rgba(255, 208, 69, 0.34) 0 96rpx, transparent 98rpx),
        radial-gradient(circle at 90% 34%, rgba(163, 132, 255, 0.22) 0 130rpx, transparent 132rpx),
        linear-gradient(180deg, #fff9df 0%, #fff5f1 42%, #f4efff 100%);
}

.page-orb {
    position: fixed;
    z-index: 0;
    border: 4rpx solid #392f59;
    pointer-events: none;
}

.orb-coral {
    top: 24%;
    left: -54rpx;
    width: 112rpx;
    height: 112rpx;
    border-radius: 50%;
    background: #ff8f82;
    box-shadow: 12rpx 12rpx 0 #ffd447;
}

.orb-purple {
    top: 56%;
    right: -46rpx;
    width: 94rpx;
    height: 142rpx;
    border-radius: 48rpx;
    background: #a58bff;
    transform: rotate(16deg);
}

.page-spark {
    position: fixed;
    z-index: 0;
    top: 43%;
    left: 22rpx;
    color: #ff765f;
    font-size: 58rpx;
    font-weight: 900;
    transform: rotate(18deg);
}

.form-container {
    position: relative;
    z-index: 1;
    padding: 30rpx 28rpx 80rpx;
}

.form-header {
    position: relative;
    overflow: hidden;
    margin-bottom: 32rpx;
    padding: 34rpx 38rpx 36rpx;
    text-align: left;
    border: 4rpx solid #392f59;
    border-radius: 36rpx;
    background: linear-gradient(135deg, #7c63e8 0%, #a78cff 100%);
    box-shadow: 12rpx 12rpx 0 #ffd447;

    &::after {
        content: '';
        position: absolute;
        right: -26rpx;
        bottom: -40rpx;
        width: 156rpx;
        height: 156rpx;
        border: 4rpx solid #392f59;
        border-radius: 52% 48% 43% 57%;
        background: #ff8f82;
        transform: rotate(14deg);
    }
}

.header-kicker {
    position: relative;
    z-index: 1;
    display: inline-flex;
    margin-bottom: 14rpx;
    padding: 8rpx 16rpx;
    color: #392f59;
    font-size: 20rpx;
    font-weight: 900;
    letter-spacing: 2rpx;
    border: 3rpx solid #392f59;
    border-radius: 999rpx;
    background: #ffd447;
}

.form-header .form-title {
    position: relative;
    z-index: 1;
    color: #fff;
    font-size: 48rpx;
    font-weight: 900;
    letter-spacing: 2rpx;
}

.form-header .form-description {
    position: relative;
    z-index: 1;
    margin-top: 10rpx;
    color: rgba(255, 255, 255, 0.9);
    font-size: 26rpx;
    font-weight: 600;
}

.role-tabs {
    gap: 20rpx;
    margin-bottom: 34rpx;
    padding: 0;
    background: transparent;
}

.role-tabs .role-tab {
    min-height: 112rpx;
    padding: 20rpx 18rpx;
    border: 4rpx solid #392f59;
    border-radius: 30rpx;
    background: #fff;
    box-shadow: 7rpx 7rpx 0 #ffaaa0;
    transition: transform 0.18s ease, box-shadow 0.18s ease;

    &:active {
        transform: translate(4rpx, 4rpx);
        box-shadow: 3rpx 3rpx 0 #ffaaa0;
    }

    &:last-child {
        box-shadow: 7rpx 7rpx 0 #79dfc2;
    }
}

.role-tabs .role-tab .role-icon {
    font-size: 42rpx;
}

.role-tabs .role-tab .role-text {
    color: #392f59;
    font-size: 27rpx;
    font-weight: 800;
}

.role-tabs .role-tab-active {
    background: #ffd447;
    box-shadow: 7rpx 7rpx 0 #a58bff !important;
}

.school-groups {
    gap: 28rpx;
}

.school-group {
    overflow: hidden;
    border: 4rpx solid #392f59;
    border-radius: 32rpx;
    background: #fffdf6;
    box-shadow: 9rpx 9rpx 0 #b9a6ff;
}

.school-group-nearest {
    border-color: #392f59;
    background: #fffef9;
    box-shadow: 9rpx 9rpx 0 #ff8f82;
}

.school-header {
    min-height: 126rpx;
    padding: 24rpx;
    background: linear-gradient(135deg, #fff 0%, #fff8d9 100%);
}

.school-group-expanded .school-header {
    border-bottom: 3rpx dashed rgba(57, 47, 89, 0.3);
}

.school-avatar {
    width: 82rpx;
    height: 82rpx;
    border: 3rpx solid #392f59;
    box-shadow: 4rpx 4rpx 0 #ffd447;
}

.school-name {
    color: #31284f;
    font-size: 29rpx;
    font-weight: 900;
}

.nearest-badge,
.in-range-tag {
    color: #392f59;
    border: 2rpx solid #392f59;
    background: #79dfc2;
    font-weight: 800;
}

.school-meta,
.meta-item {
    color: #746d88;
    font-weight: 600;
}

.expand-icon {
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    border: 3rpx solid #392f59;
    border-radius: 50%;
    background: #a58bff;
}

.class-list {
    padding: 22rpx;
    background: #fff8ee;
}

.class-item {
    margin-bottom: 18rpx;
    border: 3rpx solid #392f59;
    border-radius: 26rpx;
    background: #fff;
    box-shadow: 5rpx 5rpx 0 rgba(57, 47, 89, 0.13);
}

.class-item:last-child {
    margin-bottom: 0;
}

.class-item-selected {
    border-color: #392f59;
    background: #eee9ff;
    box-shadow: 7rpx 7rpx 0 #ffd447;
}

.class-card {
    min-height: 112rpx;
    padding: 20rpx;
    border: none;
    background: transparent;
}

.class-item-selected .class-card {
    border: none;
    background: transparent;
}

.class-avatar {
    border: 3rpx solid #392f59;
}

.class-info .class-name {
    color: #31284f;
    font-size: 28rpx;
    font-weight: 900;
}

.class-name-row {
    display: flex;
    align-items: center;
    min-width: 0;
    gap: 12rpx;
}

.class-name-row .class-name {
    min-width: 0;
    margin-bottom: 0;
}

.current-class-badge {
    flex-shrink: 0;
    padding: 5rpx 11rpx;
    color: #392f59;
    font-size: 19rpx;
    font-weight: 900;
    line-height: 1;
    border: 2rpx solid #392f59;
    border-radius: 999rpx;
    background: #ffd447;
}

.class-identity-row {
    display: flex;
    align-items: center;
    margin-top: 10rpx;
}

.class-identity-badge {
    display: inline-flex;
    align-items: center;
    gap: 8rpx;
    height: 34rpx;
    padding: 0 13rpx;
    color: #4f4570;
    font-size: 20rpx;
    font-weight: 800;
    line-height: 34rpx;
    border-radius: 999rpx;
    background: #eee9ff;
}

.class-identity-badge .identity-dot {
    width: 10rpx;
    height: 10rpx;
    border-radius: 50%;
    background: #7c63e8;
}

.class-identity-badge--parent {
    color: #7a3f38;
    background: #ffe5df;
}

.class-identity-badge--parent .identity-dot {
    background: #ff765f;
}

.class-check .check-circle,
.class-check .uncheck-circle {
    border: 3rpx solid #392f59;
}

.class-check .check-circle {
    color: #fff;
    background: #7c63e8;
    box-shadow: 3rpx 3rpx 0 #ffd447;
}

.no-data {
    min-height: 360rpx;
    padding: 44rpx;
    border: 4rpx solid #392f59;
    border-radius: 34rpx;
    background: #fff;
    box-shadow: 10rpx 10rpx 0 #79dfc2;
}

.no-data .empty-illustration {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 126rpx;
    height: 126rpx;
    margin-bottom: 24rpx;
    font-size: 68rpx;
    border: 3rpx solid #392f59;
    border-radius: 42% 58% 54% 46%;
    background: #ffd447;
    transform: rotate(-4deg);
}

.no-data .empty-text {
    color: #31284f;
    font-weight: 900;
}

.bottom-action {
    z-index: 8;
    left: 22rpx;
    right: 22rpx;
    bottom: calc(22rpx + env(safe-area-inset-bottom));
    width: auto;
    padding: 18rpx 20rpx;
    border: 4rpx solid #392f59;
    border-radius: 30rpx;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 9rpx 9rpx 0 #79dfc2;
}

.selected-info .selected-label,
.selected-info .school-text {
    color: #746d88;
    font-weight: 600;
}

.selected-info .selected-name {
    color: #31284f;
    font-weight: 900;
}

.enter-btn {
    padding: 22rpx 32rpx;
    border: 4rpx solid #392f59;
    border-radius: 24rpx;
    background: #7c63e8;
    box-shadow: 6rpx 6rpx 0 #ffd447;

    &:active {
        transform: translate(4rpx, 4rpx);
        box-shadow: 2rpx 2rpx 0 #ffd447;
    }
}

.enter-btn .enter-text,
.enter-btn .enter-arrow {
    color: #fff;
    font-weight: 900;
}
</style>
