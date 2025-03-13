# z-serach 使用步骤

1.导入

2.使用示例

@select="formValue.flightNo = $event" 将选中的值赋值给指定的formValue参数

```vue
<template>
	<view>
		<view class="label">航班号</view>
		<search :list="list" labelName="flightNo" valueName="id" placeholder="请输入航班号"
			@select="formValue.flightNo = $event"></search>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				formValue: {
					pageSize: 20,
					pageNumber: 1,
					flightNo: ''
				},
				list: [{
						"id": "1",
						"flightNo": "CXA2212"
					},
					{
						"id": "2",
						"flightNo": "CXA2215"
					}
				]
			}
		},
		methods: {
			// 编写请求后端获取list数据的方法
		}
	}
</script>

<style>

</style>

```
