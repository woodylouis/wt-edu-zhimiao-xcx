<template>
    <view class="growth-assessment">
        <u-sticky>
            <custom-nav :needBack="true" :xcxName="'切换'" :backHandler="handleNavBack" />
        </u-sticky>
        <view class="form-container">
            <view class="form-description">请选择您要进入的班级：</view>
            <view class="form-button">
                <u-button style="margin-right:20rpx" size="large" iconColor="#6EDD8A" color="#6EDD8A" shape="circle"><span class="button-txt-style">我是家长</span></u-button>
                <u-button size="large" shape="circle" iconColor="#FFFFFF" color="#FFFFFF"><span class="button-txt-style-2">我是老师</span></u-button>
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
    },
    components: {
        
    },
    // 在data中修正show定义位置
    data() {
        return {

        };
    },
    // 修正handleSubmit中的逻辑
    methods: {

        handleCodeBlur(e) {
            console.log('handleCodeBlur', e);
            this.$forceUpdate()
        },
       
    },

    onLoad() {
        
    }, 
    watch: {

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
        line-height: 24px; /* 150% */
    }
    .button-txt-style-2 {
        color: #6F7374;
        text-align: center;
        font-family: "PingFang SC";
        font-size: 16px;
        font-style: normal;
        font-weight: 400;
        line-height: 24px; /* 150% */
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
</style>