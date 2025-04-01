<!-- 选择弹窗 -->
<template>
    <view class="create-class-card">
        <view class="create-class-header">
            <text class="header-text"> {{ tips }}</text>
        </view>

        <view class="options-list">
            <block v-for="(item, index) in list" :key="index">
                <view class="option" :class="{ 'option-selected': selected === index }" @tap="selectOption(index)">
                    <image :src="selected === index
                ? '/static/general/selected.png'
                : '/static/general/unselected.png'
                " class="option-icon" mode="aspectFit" />
                    <text class="option-text" :class="{ 'text-selected': selected === index }">
                        {{ item }}
                    </text>
                </view>
            </block>
        </view>

        <view class="buttons-container">
            <view class="btn btn-cancel" @tap="onCancel">
                <text class="btn-text">{{ cancelText }}</text>
            </view>
            <view class="btn btn-create" @tap="onCreate">
                <text class="btn-text">{{ confirmText }}</text>
            </view>
        </view>
    </view>
</template>

<script>
export default {
    name: "CreateClassCard",
    props: {
        list: {
            type: Array,
            default: () => ["我是家长/家委", "老师"],
        },
        cancelText: {
            type: String,
            default: "取消",
        },
        confirmText: {
            type: String,
            default: "确定",
        },
        tips: {
            type: String,
            default: "创建班级",
        }
    },
    data() {
        return {
            selected: 0,
        };
    },
    methods: {
        selectOption(index) {
            this.selected = index;
            uni.vibrateShort();
            this.$emit("select", index);
        },
        onCancel() {
            this.$emit("cancel");
        },
        onCreate() {
            this.$emit("create", this.selected);
        },
    },
};
</script>

<style>
.create-class-card {
    width: 560rpx;
    /* 高度自适应 */
    height: auto;
    background: #ffffff;
    border-radius: 32rpx;
    overflow: hidden;
}

.create-class-header {
    height: 120rpx;
    display: flex;
    align-items: center;
    background: linear-gradient(221deg, #D6FFD8 2.4%, #EAFBFF 73.84%);
    text-align: center;
    justify-content: center;
}

.header-text {
    font-size: 32rpx;
    font-weight: 600;
    color: #00214d;
    line-height: 48rpx;
}

.options-list {
    padding: 40rpx 32rpx;
    display: flex;
    flex-direction: column;
    gap: 24rpx;
}

.option {
    display: flex;
    align-items: center;
    height: 80rpx;
    background: #f3f4f6;
    border-radius: 16rpx;
    padding: 0 32rpx;
    width: calc(100% - 64rpx);
    cursor: pointer;
}

.option-selected {
    background: #D8F2E0;
}

.option-icon {
    width: 40rpx;
    height: 40rpx;
}

.option-text {
    margin-left: 72rpx;
    font-size: 28rpx;
    line-height: 40rpx;
    color: #71717a;
}

.text-selected {
    color: #00214d;
}

.buttons-container {
    display: flex;
    gap: 20rpx;
    padding: 0 32rpx;
    margin-top: 40rpx;
    margin-bottom: 40rpx;
}

.btn {
    height: 80rpx;
    width: 236rpx;
    border-radius: 60rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn-cancel {
    border: 2rpx solid #00214d;
}

.btn-create {
    background: #6edd8a;
}

.btn-text {
    font-size: 28rpx;
    font-weight: 500;
    color: #00214d;
    line-height: 40rpx;
}
</style>