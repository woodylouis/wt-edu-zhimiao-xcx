<template>
    <view class="growth-assessment">
        <u-sticky>
            <custom-nav :needBack="true" :xcxName="'切换'" :backHandler="handleNavBack" />
        </u-sticky>
        <view class="form-container">
            <view class="form-description">请选择您要进入的班级：</view>
            <view class="form-button">
                <u-button style="margin-right:20rpx" size="large"
                    :color="selectedRole === 'parent' ? '#6EDD8A' : '#FFFFFF'" shape="circle"
                    @click="handleRoleChange('parent')">
                    <span :style="buttonTextStyle.parent">我是家长</span>
                </u-button>
                <u-button size="large" shape="circle" :color="selectedRole === 'teacher' ? '#6EDD8A' : '#FFFFFF'"
                    @click="handleRoleChange('teacher')">
                    <span :style="buttonTextStyle.teacher">我是老师</span>
                </u-button>
            </view>
            
            <!-- 无数据状态 -->
            <view v-if="groupedClasses[selectedRole].length === 0" class="no-data">
                <image src="/static/empty-state.png" class="empty-icon" mode="aspectFit" />
                <text>暂无班级数据</text>
            </view>
            
            <!-- 按学校分组展示 -->
            <view v-else class="school-groups">
                <view 
                    v-for="(school, schoolIndex) in groupedClasses[selectedRole]" 
                    :key="school.schoolId || schoolIndex"
                    class="school-group"
                >
                    <!-- 学校分组头部 -->
                    <view class="school-header">
                        <view class="school-icon">
                            <text class="icon-text">校</text>
                        </view>
                        <text class="school-name">{{ school.schoolName }}</text>
                        <text class="class-count">{{ school.classes.length }}个班级</text>
                    </view>
                    
                    <!-- 班级列表 -->
                    <view class="class-list">
                        <view 
                            v-for="(item, classIndex) in school.classes" 
                            :key="item.classCode"
                            class="class-item"
                            :class="{ 'class-item-selected': isSelected(school.schoolId, classIndex) }"
                            @click="handleChooseClass(school.schoolId, classIndex)"
                        >
                            <view class="class-card">
                                <view class="class-card-left">
                                    <view class="class-avatar">
                                        <text class="avatar-text">{{ item.name.charAt(0) }}</text>
                                    </view>
                                </view>
                                <view class="class-card-center">
                                    <text class="class-name">{{ item.name }}</text>
                                    <text class="user-nickname">{{ item.nickname }}</text>
                                </view>
                                <view class="class-card-right">
                                    <view v-if="isSelected(school.schoolId, classIndex)" class="check-icon">
                                        <text class="check-text">✓</text>
                                    </view>
                                </view>
                            </view>
                        </view>
                    </view>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    computed: {
        userInfo() {
            return store.userInfo
        },
        buttonTextStyle() {
            return {
                parent: {
                    color: this.selectedRole === 'parent' ? '#00214D' : '#6F7374',
                    fontWeight: this.selectedRole === 'parent' ? 500 : 400
                },
                teacher: {
                    color: this.selectedRole === 'teacher' ? '#00214D' : '#6F7374',
                    fontWeight: this.selectedRole === 'teacher' ? 500 : 400
                }
            }
        },
        // 按学校分组的班级数据
        groupedClasses() {
            return {
                parent: this.groupBySchool(this.classes.parent),
                teacher: this.groupBySchool(this.classes.teacher)
            }
        },
        // 添加计算属性判断默认角色
        hasClassData() {
            return {
                parent: this.classes.parent.length > 0,
                teacher: this.classes.teacher.length > 0
            }
        },
        defaultRole() {
            return this.hasClassData.parent ? 'parent' :
                this.hasClassData.teacher ? 'teacher' : 'parent'
        }
    },
    data() {
        return {
            selectedRole: 'parent',
            selectedSchoolId: null,
            selectedClassIndex: 0,
            classes: {
                parent: [],
                teacher: []
            },
            debounceTimer: null
        };
    },
    methods: {
        // 按学校分组
        groupBySchool(classList) {
            const schoolMap = new Map()
            
            classList.forEach(item => {
                const schoolId = item.schoolId || 'unknown'
                const schoolName = item.schoolName || '未分配学校'
                
                if (!schoolMap.has(schoolId)) {
                    schoolMap.set(schoolId, {
                        schoolId,
                        schoolName,
                        classes: []
                    })
                }
                schoolMap.get(schoolId).classes.push(item)
            })
            
            return Array.from(schoolMap.values())
        },
        
        // 检查是否选中
        isSelected(schoolId, classIndex) {
            return this.selectedSchoolId === schoolId && this.selectedClassIndex === classIndex
        },
        
        async loadClasses() {
            try {
                const res = await uniCloud.callFunction({
                    name: 'wtdb-business-member-class',
                    data: {
                        uniIdToken: uni.getStorageSync('uni_id_token')
                    }
                })

                if (res.result.code === 200) {
                    console.log('班级数据加载成功', res.result.data)
                    
                    // 按角色分类班级数据，并包含学校信息
                    this.classes.parent = res.result.data
                        .filter(item => item.role === 'parent')
                        .map(item => ({
                            name: item.classInfo.nickname,
                            classCode: item.classInfo.code,
                            nickname: item.nickname || '家长',
                            role: item.role,
                            schoolId: item.classInfo.school_id || item.schoolInfo?.school_id || 'unknown',
                            schoolName: item.schoolInfo?.name || '未分配学校'
                        }))

                    this.classes.teacher = res.result.data
                        .filter(item => item.role === 'teacher')
                        .map(item => ({
                            name: item.classInfo.nickname,
                            classCode: item.classInfo.code,
                            nickname: item.classInfo.teacherName || item.classInfo.class_creator_teacher || '老师',
                            role: item.role,
                            schoolId: item.classInfo.school_id || item.schoolInfo?.school_id || 'unknown',
                            schoolName: item.schoolInfo?.name || '未分配学校'
                        }))
                    
                    // 设置默认角色
                    this.selectedRole = this.defaultRole
                    
                    // 恢复之前选中的班级
                    const currentClass = uni.getStorageSync('currentClass')
                    if (currentClass?.code) {
                        this.restoreSelection(currentClass.code)
                    } else {
                        // 默认选中第一个
                        this.selectFirstClass()
                    }
                }
            } catch (error) {
                console.error('班级数据加载失败', error)
                uni.showToast({
                    title: '班级数据加载失败',
                    icon: 'none'
                })
            }
        },
        
        // 恢复之前的选中状态
        restoreSelection(classCode) {
            // 遍历家长班级
            for (const school of this.groupedClasses.parent) {
                const classIndex = school.classes.findIndex(c => c.classCode === classCode)
                if (classIndex > -1) {
                    this.selectedRole = 'parent'
                    this.selectedSchoolId = school.schoolId
                    this.selectedClassIndex = classIndex
                    return
                }
            }
            // 遍历老师班级
            for (const school of this.groupedClasses.teacher) {
                const classIndex = school.classes.findIndex(c => c.classCode === classCode)
                if (classIndex > -1) {
                    this.selectedRole = 'teacher'
                    this.selectedSchoolId = school.schoolId
                    this.selectedClassIndex = classIndex
                    return
                }
            }
            // 未找到，选中第一个
            this.selectFirstClass()
        },
        
        // 默认选中第一个班级
        selectFirstClass() {
            const groups = this.groupedClasses[this.selectedRole]
            if (groups.length > 0 && groups[0].classes.length > 0) {
                this.selectedSchoolId = groups[0].schoolId
                this.selectedClassIndex = 0
            }
        },
        
        handleRoleChange(role) {
            this.selectedRole = role
            this.selectFirstClass()
        },
        
        async handleChooseClass(schoolId, classIndex) {
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer)
            }

            this.debounceTimer = setTimeout(async () => {
                this.selectedSchoolId = schoolId
                this.selectedClassIndex = classIndex
                
                // 查找选中的班级
                const school = this.groupedClasses[this.selectedRole].find(s => s.schoolId === schoolId)
                const selectedClass = school?.classes[classIndex]
                
                if (!selectedClass) return
                
                const { result } = await uniCloud.callFunction({
                    name: 'wtdb-business-class-detail',
                    data: { code: selectedClass.classCode }
                })
                
                uni.showModal({
                    title: '切换班级',
                    content: `确定切换到「${selectedClass.name}」吗？`,
                    showCancel: true,
                    confirmColor: '#6EDD8A',
                    success: ({ confirm }) => {
                        if (confirm) {
                            uni.setStorageSync('currentClass', result.data)
                            uni.redirectTo({
                                url: `/pages/dashboard/teacher/teacher?userNickname=${selectedClass.nickname}&role=${selectedClass.role}`
                            })
                        }
                    }
                })
            }, 300)
        }
    },

    onLoad() {
        this.loadClasses()
    }
}
</script>

<style lang="scss" scoped>
.form-container {
    background-color: #f8f9fa;
    border-radius: 48rpx 48rpx 0 0;
    min-height: 80vh;
    padding: 32rpx 32rpx;
    display: flex;
    flex-direction: column;
}

.form-description {
    color: #3D464A;
    font-size: 28rpx;
    line-height: 1.4;
    margin-bottom: 24rpx;
    font-weight: 500;
}

.form-button {
    display: flex;
    justify-content: space-between;
    margin-bottom: 24rpx;
    gap: 20rpx;
}

// 无数据状态
.no-data {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 120rpx 40rpx;
    color: #9CA3AF;
    font-size: 28rpx;
    font-family: "PingFang SC";
    
    .empty-icon {
        width: 200rpx;
        height: 200rpx;
        margin-bottom: 24rpx;
        opacity: 0.6;
    }
}

// 学校分组容器
.school-groups {
    display: flex;
    flex-direction: column;
    gap: 32rpx;
}

// 学校分组
.school-group {
    background: #FFFFFF;
    border-radius: 24rpx;
    overflow: hidden;
    box-shadow: 0 4rpx 16rpx rgba(0, 33, 77, 0.06);
}

// 学校头部
.school-header {
    display: flex;
    align-items: center;
    padding: 28rpx 32rpx;
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    border-bottom: 1rpx solid rgba(110, 221, 138, 0.2);
    
    .school-icon {
        width: 56rpx;
        height: 56rpx;
        background: linear-gradient(135deg, #6EDD8A 0%, #4ade80 100%);
        border-radius: 12rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 20rpx;
        box-shadow: 0 4rpx 12rpx rgba(110, 221, 138, 0.3);
        
        .icon-text {
            color: #FFFFFF;
            font-size: 28rpx;
            font-weight: 600;
        }
    }
    
    .school-name {
        flex: 1;
        font-size: 32rpx;
        font-weight: 600;
        color: #1f2937;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    
    .class-count {
        font-size: 24rpx;
        color: #6B7280;
        background: rgba(255, 255, 255, 0.8);
        padding: 8rpx 16rpx;
        border-radius: 20rpx;
    }
}

// 班级列表
.class-list {
    padding: 16rpx;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
}

// 班级卡片
.class-item {
    border-radius: 16rpx;
    transition: all 0.3s ease;
    
    &:active {
        transform: scale(0.98);
    }
}

.class-item-selected {
    .class-card {
        background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        border-color: #6EDD8A;
    }
}

.class-card {
    display: flex;
    align-items: center;
    padding: 24rpx;
    background: #FAFBFC;
    border-radius: 16rpx;
    border: 2rpx solid transparent;
    transition: all 0.3s ease;
    
    .class-card-left {
        margin-right: 20rpx;
    }
    
    .class-avatar {
        width: 88rpx;
        height: 88rpx;
        background: linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 100%);
        border-radius: 16rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        
        .avatar-text {
            font-size: 36rpx;
            font-weight: 600;
            color: #4F46E5;
        }
    }
    
    .class-card-center {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8rpx;
        overflow: hidden;
        
        .class-name {
            font-size: 30rpx;
            font-weight: 500;
            color: #1f2937;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .user-nickname {
            font-size: 24rpx;
            color: #6B7280;
        }
    }
    
    .class-card-right {
        margin-left: 16rpx;
        
        .check-icon {
            width: 48rpx;
            height: 48rpx;
            background: #6EDD8A;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            
            .check-text {
                color: #FFFFFF;
                font-size: 28rpx;
                font-weight: 600;
            }
        }
    }
}
</style>