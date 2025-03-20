<!-- 默认为空，可输可选，
例：可以输入通航机场三字码或名称匹配
20250303 zhuanghw
 -->
<template>
	<view class="index">
		<!-- 输入框 -->
		<view class="input-container">
			<input class="input" v-model="keyword" type="text" :placeholder="placeholder" @focus="showList = true" @input="filterList" />
		</view>

		<!-- 下拉框 -->
		<view class="search" v-if="showList">
			<scroll-view class="list" scroll-y v-if="filteredList.length > 0" :lower-threshold="10">
				<view v-for="item in filteredList" :key="item[valueName]" class="item" hover-class="item-hover" hover-start-time="0" hover-stay-time="100" @click="selectItem(item)">
					{{ item[labelName] }}
				</view>
			</scroll-view>
			<!-- <view class="empty" v-else @click="showList = false">{{ noData }}</view> -->
		</view>
	</view>
</template>

<script>
export default {
	props: {
		/** 需要展示的列表 */
		list: {
			type: Array,
			default: () => []
		},
		/** 自定义label */
		labelName: {
			type: String,
			default: 'label'
		},
		/** 自定义value */
		valueName: {
			type: String,
			default: 'value'
		},
		/** 无内容时显示的内容  */
		noData: {
			type: String,
			default: '暂无匹配内容...'
		},
		placeholder: {
			type: String,
			default: '请输入'
		},
		// 新增modelValue支持双向绑定
		modelValue: {
			type: String,
			default: ''
		},
	},
	data() {
		return {
			keyword: this.modelValue, // 初始值来自prop
			showList: false, // 控制下拉框显示
			filteredList: [] // 初始化过滤后的列表为所有列表
		};
	},
	watch: {
		// 新增监听modelValue变化
		modelValue(newVal) {
			this.keyword = newVal;
			this.filterList();
		}
	},
	methods: {
		/** 筛选list数据 */
		filterList() {
			if (this.keyword === '') {
				this.showList = false; // 如果输入框为空，关闭下拉框
				this.$emit('update:modelValue', ''); // 新增同步空值
			} else {
				if (this.list && this.keyword) {
					const keyword = this.keyword.toString().toLowerCase();
					this.filteredList = this.list.filter(item =>
						item[this.labelName].toLowerCase().includes(keyword)
					);
				}
			}
		},
		/** 点击选择item */
		selectItem(item) {
			this.keyword = item[this.labelName]; // 将选中的label赋值给input
			this.showList = false; // 关闭下拉框
			this.$emit('select', item[this.valueName]); //将值传承父页面
			this.$emit('update:modelValue', this.keyword); // 新增同步值
		},
	}
};
</script>

<style lang="scss" scoped>
.index {
	width: 100%;
	position: relative;
	font-size: 30rpx;
}

.input-container {
	background: #FFF;
	border-radius: 10px;
	padding: 10px 18px !important;
}

.input {
	color: #888A8C;
	width: 100%;
	padding: 10rpx;
}

.search {
	width: 100%;
	position: absolute;
	z-index: 9;
	height: 60rpx;

	.list,
	.empty {
		padding: 10rpx;
		background-color: #fff;
		box-shadow: 0 0 10rpx #888;
		border-radius: 10rpx;
	}

	.list {
		box-sizing: border-box;
		max-height: 300rpx;
		overflow: hidden;

		.item {
			padding: 20rpx 40rpx;
			text-align: left;
			/* 这里固定设置为左对齐 */
			border-bottom: 1rpx dashed #ddd;
			/* 添加虚线分隔 */
		}

		.item-hover {
			background-color: #f5f5f5;
		}
	}

	.empty {
		height: 80rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}
}
</style>