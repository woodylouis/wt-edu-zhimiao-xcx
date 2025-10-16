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
            <view class="class-list">
                <view v-if="groupedClasses[selectedRole].length === 0" class="no-data">
                    ～～ 暂无数据 ～～
                </view>
                <view v-else v-for="(schoolGroup, schoolIndex) in groupedClasses[selectedRole]" :key="schoolIndex" class="school-group">
                    <view class="school-header">
                        <text class="school-name">{{ schoolGroup.schoolName }}</text>
                        <text class="class-count">{{ schoolGroup.classes.length }}个班级</text>
                    </view>
                    <view class="class-grid">
                        <view v-for="(item, classIndex) in schoolGroup.classes" :key="classIndex" class="class-item"
                            @click="handleChooseClass(schoolGroup.schoolId, classIndex)">
                            <image
                                :src="selectedSchoolId === schoolGroup.schoolId && selectedClassIndex === classIndex ? '/static/switch-class/selected.png' : '/static/switch-class/unselected.png'"
                                class="class-bg" />
                            <view class="class-info">
                                <text class="class-name">{{ item.name }}</text>
                                <text class="user-nickname">{{ item.nickname }}</text>
                            </view>
                        </view>
                    </view>
                </view>
            </view>
        </view>
    </view>
</template>

<script>
// 导入modlBox组件

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
        classBgUrl() {
            if (this.selected) {
                return '../../static/switch-class/selected.png'
            }
            return '../../static/switch-class/unselected.png'
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
    components: {

    },
    // 在data中修正show定义位置
    data() {
        return {
            selectedRole: 'parent',
            selected: 0,
            selectedSchoolId: null,
            selectedClassIndex: 0,
            classes: {
                parent: [],
                teacher: []
            },
            groupedClasses: {
                parent: [],
                teacher: []
            },
            debounceTimer: null
        };
    },
    // 修正handleSubmit中的逻辑
    methods: {
        async loadClasses() {
            this.selectedRole = this.defaultRole

            try {
                const res = await uniCloud.callFunction({
                    name: 'wtdb-business-member-class',
                    data: {
                        uniIdToken: uni.getStorageSync('uni_id_token')
                    }
                })


                if (res.result.code === 200) {
                    console.log('班级数据加载成功', res.result.data)
                    // 按角色分类班级数据
                    this.classes.parent = res.result.data
                        .filter(item => item.role === 'parent')
                        .map(item => ({
                            name: item.classInfo.nickname,
                            classCode: item.classInfo.code,
                            nickname: item.nickname || '家长', // 用户在本班的昵称
                            role: item.role,
                            schoolId: item.classInfo.school_id || null
                        }))

                    this.classes.teacher = res.result.data
                        .filter(item => item.role === 'teacher')
                        .map(item => ({
                            name: item.classInfo.nickname,
                            classCode: item.classInfo.code,
                            nickname: item.classInfo.teacherName || '老师',
                            role: item.role,
                            schoolId: item.classInfo.school_id || null
                        }))
                    
                    // 按学校分类班级数据
                    this.groupClassesBySchool();
                    
                    console.log('this.classes', this.classes)
                    console.log('this.groupedClasses', this.groupedClasses)
                    
                    const currentClass = uni.getStorageSync('currentClass');
                    console.log('currentClass', currentClass)
                    if (currentClass?.code) {
                        // 查找当前班级在分组中的位置
                        this.setCurrentClassSelection(currentClass.code);
                    }
                }

            } catch (error) {
                console.error('班级数据加载失败', error);
                uni.showToast({
                    title: '班级数据加载失败',
                    icon: 'none'
                })
            }
        },
        handleRoleChange(role) {
            this.selectedRole = role;
        },
        // 按学校分类班级数据
        groupClassesBySchool() {
            const roles = ['parent', 'teacher'];
            roles.forEach(role => {
                const classes = this.classes[role];
                const schoolMap = new Map();
                
                // 按school_id分组
                classes.forEach(classItem => {
                    const schoolId = classItem.schoolId || 'other';
                    if (!schoolMap.has(schoolId)) {
                        schoolMap.set(schoolId, {
                            schoolId: schoolId,
                            schoolName: schoolId === 'other' ? '其它' : `学校${schoolId}`,
                            classes: []
                        });
                    }
                    schoolMap.get(schoolId).classes.push(classItem);
                });
                
                // 转换为数组并排序（其它放在最后）
                this.groupedClasses[role] = Array.from(schoolMap.values()).sort((a, b) => {
                    if (a.schoolId === 'other') return 1;
                    if (b.schoolId === 'other') return -1;
                    return a.schoolId.localeCompare(b.schoolId);
                });
            });
        },
        // 设置当前班级选择状态
        setCurrentClassSelection(classCode) {
            const role = this.selectedRole;
            const groupedClasses = this.groupedClasses[role];
            
            for (let schoolIndex = 0; schoolIndex < groupedClasses.length; schoolIndex++) {
                const schoolGroup = groupedClasses[schoolIndex];
                for (let classIndex = 0; classIndex < schoolGroup.classes.length; classIndex++) {
                    if (schoolGroup.classes[classIndex].classCode === classCode) {
                        this.selectedSchoolId = schoolGroup.schoolId;
                        this.selectedClassIndex = classIndex;
                        return;
                    }
                }
            }
        },
        // 处理班级选择
        async handleChooseClass(schoolId, classIndex) {
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }

            this.debounceTimer = setTimeout(async () => {
                this.selectedSchoolId = schoolId;
                this.selectedClassIndex = classIndex;
                
                // 查找选中的班级
                const schoolGroup = this.groupedClasses[this.selectedRole].find(group => group.schoolId === schoolId);
                if (!schoolGroup) return;
                
                const selectedClass = schoolGroup.classes[classIndex];
                console.log("选择的班级：", selectedClass);
                
                const { result } = await uniCloud.callFunction({
                    name: 'wtdb-business-class-detail',
                    data: { code: selectedClass.classCode }
                });
                
                uni.showModal({
                    title: '提示',
                    content: '确定切换到选中班级吗？',
                    showCancel: true,
                    success: ({ confirm, cancel }) => {
                        if (confirm) {
                            uni.setStorageSync('currentClass', result.data);
                            uni.redirectTo({
                                url: `/pages/dashboard/teacher/teacher?userNickname=${selectedClass.nickname}&role=${selectedClass.role}`
                            });
                        }
                    }
                });
            }, 1000); // 防抖间隔
        }

    },

    onLoad() {
        this.loadClasses();
    },

}
</script>

<style lang="scss" scoped>
.form-container {
    background-color: #ffffff;
    border-radius: 48rpx 48rpx 0 0;
    min-height: 80vh;
    padding: 32rpx 40rpx;
    display: flex;
    flex-direction: column;
}

.form-description {
    color: #3D464A;
    font-size: 24rpx;
    line-height: 1;
    margin-bottom: 32rpx;
}

.form-button {
    display: flex;
    justify-content: space-between;
    margin-bottom: 32rpx;

    .button-txt-style {
        color: #00214D;
        text-align: center;
        font-family: "PingFang SC";
        font-size: 16px;
        font-style: normal;
        font-weight: 500;
        line-height: 24px;
        /* 150% */
    }

    .button-txt-style-2 {
        color: #6F7374;
        text-align: center;
        font-family: "PingFang SC";
        font-size: 16px;
        font-style: normal;
        font-weight: 400;
        line-height: 24px;
        /* 150% */
    }


}

.form-content {
    display: flex;
    flex-direction: column;
    gap: 32rpx;
}



.help-link {
    color: rgba(111, 115, 116, 1);
    font-size: 28rpx;
    text-decoration: underline;
    text-align: center;
    margin-top: 32rpx;
}


.class-list {
    margin-top: 40rpx;
    display: flex;
    flex-direction: column;
    gap: 40rpx;
}

.school-group {
    display: flex;
    flex-direction: column;
    gap: 24rpx;
}

.school-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 16rpx;
    
    .school-name {
        font-size: 32rpx;
        color: #00214D;
        font-weight: 600;
        font-family: "PingFang SC";
    }
    
    .class-count {
        font-size: 24rpx;
        color: #6F7374;
        font-family: "PingFang SC";
    }
}

.class-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 30rpx;
    /* 列间距 */
}

.class-item {
    position: relative;
    width: calc(33.33% - 20rpx);
    /* 调整为更精确的三列计算 */
    margin-bottom: 0;
}

.class-bg {
    width: 100%;
    height: 230rpx;
    object-fit: cover;
}

.class-info {
    position: absolute;
    left: 32rpx;
    top: 32rpx;
    right: 32rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 76rpx;
    font-family: "PingFang SC";

    /* 文字居中 */
    .class-name {
        font-size: 28rpx;
        color: #00214D;
        margin-bottom: 16rpx;
        font-weight: 400;
        text-align: center;
        width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .user-nickname {
        font-size: 24rpx;
        color: #3D464A;
    }
}

.no-data {
    margin-top: 100rpx;
    width: 100%;
    text-align: center;
    color: #6F7374;
    font-size: 32rpx;
    padding: 60rpx 0;
    font-family: "PingFang SC";
}
</style>