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
                <view v-for="(item, index) in classes[selectedRole]" :key="index" class="class-item"
                    @click="selected = index">
                    <image
                        :src="selected === index ? '/static/switch-class/selected.png' : '/static/switch-class/unselected.png'"
                        class="class-bg" />
                    <view class="class-info">
                        <text class="class-name">{{ item.name }}</text>
                        <text class="user-nickname">{{ item.nickname }}</text>
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
        }
    },
    components: {

    },
    // 在data中修正show定义位置
    data() {
        return {
            selectedRole: 'parent',
            selected: 0,
            classes: {
                parent: [
                    { name: '小小班3班', classCode: 123456, nickname: '李思思的爸爸' },
                    { name: '小班3班', classCode: 654321, nickname: '李思思的爸爸' },
                    { name: '中班3班', classCode: 789012, nickname: '李思思的爸爸' },
                    { name: '小班3班', classCode: 654321, nickname: '李思思的爸爸' },
                    { name: '中班3班', classCode: 789012, nickname: '李思思的爸爸' },
                    { name: '小班3班', classCode: 654321, nickname: '李思思的爸爸' },
                    { name: '中班3班', classCode: 789012, nickname: '李思思的爸爸' },
                ],
                teacher: [
                    { name: '中班4班', classCode: 345678, nickname: '李文津' },
                    { name: '大班3班', classCode: 876543, nickname: '李文津' },
                ]
            }
        };
    },
    // 修正handleSubmit中的逻辑
    methods: {
        async loadClasses() {
            try {
                const res = await uniCloud.callFunction({
                    name: 'wtdb-business-member-class',
                    data: {
                        uniIdToken: uni.getStorageSync('uni_id_token')
                    }
                })

                if (res.result.code === 200) {
                    // 按角色分类班级数据

                    this.classes.parent = res.result.data
                        .filter(item => item.role === 'parent')
                        .map(item => ({
                            name: item.classInfo.nickname,
                            classCode: item.classInfo.code,
                            nickname: item.relationship ? `${item.classInfo.nickname}的${item.relationship}` : item.classInfo.nickname
                        }))

                    this.classes.teacher = res.result.data
                        .filter(item => item.role === 'teacher')
                        .map(item => ({
                            name: item.classInfo.nickname,
                            classCode: item.classInfo.code,
                            nickname: item.classInfo.teacherName || '未知老师'
                        }))
                }
            } catch (error) {
                uni.showToast({
                    title: '班级数据加载失败',
                    icon: 'none'
                })
            }
        },
        handleRoleChange(role) {
            this.selectedRole = role;
        }

    },

    onLoad() {
        // this.loadClasses();
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
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 30rpx;
    /* 列间距 */
}

.class-item {
    position: relative;
    width: calc(33.33% - 20rpx);
    /* 调整为更精确的三列计算 */
    margin-bottom: 30rpx;
    // padding: 12rpx;
    // box-sizing: border-box;
    /* 新增盒模型计算方式 */
    // background: #FFFFFF;
    // border-radius: 24rpx;
    // box-shadow: 0 8rpx 24rpx rgba(0, 33, 77, 0.08);
}

.class-bg {
    width: 100%;
    height: 230rpx;
    // border-radius: 16rpx;
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
    // background-color: red;
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
</style>