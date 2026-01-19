<script setup>
import { ref, computed, onMounted, nextTick } from "vue";

import { suspendBtnProps } from './qc-suspendBtn.js'

const props = defineProps(suspendBtnProps)

// 是否展开菜单
const isExpand = ref(false)

// 屏幕信息
const screenWidth = ref(375)
const screenHeight = ref(667)

// 当前位置 - 初始值设为屏幕右侧
const currentX = ref(9999)  // 临时大值，确保在右边
const currentY = ref(500)
const isOnLeft = ref(false)
const isReady = ref(false)

// 组件挂载后设置正确位置
onMounted(() => {
  const sysInfo = uni.getSystemInfoSync()
  screenWidth.value = sysInfo.windowWidth
  screenHeight.value = sysInfo.windowHeight
  
  // 计算正确的默认位置：右边缘，离底部120px
  const btnSize = props.mainBtn?.size || 52
  const padding = props.padding || 10
  
  nextTick(() => {
    currentX.value = screenWidth.value - btnSize - padding
    currentY.value = screenHeight.value - 120 - btnSize
    isReady.value = true
  })
})

// 是否正在拖拽
const isDragging = ref(false)

// 拖拽结束时的临时位置
const lastDragX = ref(0)
const lastDragY = ref(0)

const $emits = defineEmits([, 'mainClick', 'childClick'])

// 计算拖拽区域的实际宽度（包含子按钮）
const allHorW = computed(() => {
  const len = props.childBtns.length
  const temp =
    len * props.childSize +
    props.mainBtn.size +
    props.childMargin * (len - 1) +
    props.mainToChildMargin
  return temp
})

// 拖拽过程中的处理 - 只记录位置，不做吸附
const onDragChange = (e) => {
  if (!props.moveable) return
  
  const { x, y, source } = e.detail
  
  // 记录拖拽位置
  lastDragX.value = x
  lastDragY.value = y
  
  // 只有在触摸结束时才吸附（source为空或touch-out-of-bounds表示触摸结束）
  if (source === '' || source === 'touch-out-of-bounds' || source === 'out-of-bounds') {
    snapToEdge(x, y)
  }
}

// 吸附到边缘（只允许左边或右边）
const snapToEdge = (x, y) => {
  const btnSize = props.mainBtn?.size || 52
  const padding = props.padding || 10
  
  // 使用主按钮中心点判断吸附方向
  const centerX = x + btnSize / 2
  const halfScreen = screenWidth.value / 2
  
  let targetX
  if (centerX < halfScreen) {
    // 吸附到左边
    targetX = padding
    isOnLeft.value = true
  } else {
    // 吸附到右边
    targetX = screenWidth.value - btnSize - padding
    isOnLeft.value = false
  }
  
  // 确保 Y 位置不超出边界
  const targetY = Math.max(padding, Math.min(y, screenHeight.value - btnSize - padding - props.tabbarHeight))
  
  // 更新位置
  currentX.value = targetX
  currentY.value = targetY
}

// 触摸结束时吸附
const onTouchEnd = () => {
  if (lastDragX.value > 0 || lastDragY.value > 0) {
    snapToEdge(lastDragX.value, lastDragY.value)
  }
}

// 动态计算弹出方向
const dynamicOpenType = computed(() => {
  if (props.openType.startsWith('Line')) {
    if (props.openType === 'LineLeft' || props.openType === 'LineRight') {
      return isOnLeft.value ? 'LineRight' : 'LineLeft'
    }
  } else if (props.openType.startsWith('Sector')) {
    return isOnLeft.value ? 'SectorRight' : 'SectorLeft'
  }
  return props.openType
})

/**
 * 组件动画逻辑
 */
const mainAni = uni.createAnimation({
  duration: 300,
  timingFunction: 'ease',
})

const childAni = uni.createAnimation({
  duration: 400,
  timingFunction: 'ease',
})

// 设置主按钮动画
const mainAnimation = computed(() => {
  mainAni.rotateZ(isExpand.value ? 180 : 0).step()
  return mainAni.export()
})

// 获取扇形上子按钮的移动距离
const getSectorPoint = (index) => {
  let realMainToChild = props.mainToChildMargin
  let temp = props.childBtns.length + 1
  // 防止出现 90度 60 度的时候有的子按钮不显示
  if (temp % 2 === 0) {
    temp += 0.001
  }
  const needMinus = dynamicOpenType.value === 'SectorLeft'
  let margin = 0
  if (needMinus) {
    realMainToChild = -realMainToChild
    margin = -props.childSize
  } else {
    margin = props.mainBtn.size
  }

  const degree = Math.PI / temp
  const xPoint = (realMainToChild + margin) * Math.sin(degree * (index + 1))
  const yPoint = (realMainToChild + margin) * Math.cos(degree * (index + 1))
  return {
    xPoint,
    yPoint,
  }
}
const marginObj = (index) => {
  // 计算主按钮到子按钮的距离
  let realMainToChild = props.mainToChildMargin
  // 如果是直线弹出
  if (dynamicOpenType.value.startsWith('Line')) {
    // 计算时将是否为负数
    const needMinus =
      dynamicOpenType.value === 'LineLeft' || dynamicOpenType.value === 'LineUp'
    let margin = 0
    if (needMinus) {
      const maxSize = Math.max(props.childSize, props.mainBtn.size)
      margin = index > 0 ? (props.childMargin + props.childSize) * index : 0
      margin += props.childSize > props.mainBtn.size ? maxSize : props.childSize
      margin = -margin
      realMainToChild = -realMainToChild
    } else {
      const minSize = Math.min(props.childSize, props.mainBtn.size)
      margin = index > 0 ? (props.childMargin + props.childSize) * index : 0
      margin +=
        props.childSize > props.mainBtn.size ? minSize : props.mainBtn.size
    }
    // 计算偏移量
    const translate = isExpand.value
      ? margin + realMainToChild
      : (props.mainBtn.size - props.childSize) / 2
    // 弹出方向是否是X轴
    const isX = dynamicOpenType.value === 'LineLeft' || dynamicOpenType.value === 'LineRight'
    return {
      translateX: isX ? translate : 0,
      translateY: !isX ? translate : 0,
    }
  }

  return {
    translateX: isExpand.value
      ? getSectorPoint(index).xPoint
      : (props.mainBtn.size - props.childSize) / 2,
    translateY: isExpand.value ? getSectorPoint(index).yPoint : 0,
  }
}
// 设置子按钮动画
const childBtnsAni = computed(() => (index) => {
  // 子组件缩放
  let scale = 1
  if (!isExpand.value && props.mainBtn.size < props.childSize) {
    scale = props.mainBtn.size / props.childSize
  }
  childAni
    .translateY(marginObj(index).translateY)
    .translateX(marginObj(index).translateX)
    .scale(scale)
    .rotateZ(isExpand.value ? 360 : 0)
    .step()
  return childAni.export()
})

/**
 * 组件拖动逻辑
 */

const allbtnsBackStyle = computed(() => {
  return `position:relative;display:flex;align-items:center;`
})
const moveAreaStyle = computed(() => {
  return `position:fixed;
            width:100vw;
            height:100vh;
            top:0;
            left:0;
            z-index:9999;
            pointer-events:none;
            `
})

// 拖拽区域样式 - 需要响应事件
const dragViewStyle = computed(() => {
  return `pointer-events:auto;`
})
// 被拖动部分的大小 - 只使用主按钮大小，子按钮通过动画展开
const dragStyle = computed(() => {
  const btnSize = props.mainBtn?.size || 52
  return `width:${btnSize}px;height:${btnSize}px;`
})

/**
 * 组件点击回调
 */
const mainClick = () => {
  isExpand.value = !isExpand.value
  $emits('mainClick')
}
const childClick = (index) => {
  isExpand.value = false
  $emits('childClick', index)
}
</script>
<template>
  <movable-area v-if="isReady" class="qc-suspendbtn" :style="moveAreaStyle">
    <movable-view class="drag-back" direction="all" :style="dragStyle + dragViewStyle" inertia :x="currentX"
      :y="currentY" :disabled="!props.moveable" @change="onDragChange" @touchend="onTouchEnd">
      <view class="allbtns-back" :style="allbtnsBackStyle">
        <view v-for="(child, index) in props.childBtns" class="child-btn" :key="index"
          :style="`width:${props.childSize}px;height:${props.childSize}px;`" :animation="childBtnsAni(index)"
          @tap="childClick(index)">
          <image class="child-btn-content f-c-c" v-if="child.bgImg" :src="child.bgImg" />
          <view class="child-btn-content f-c-c" v-else-if="child.textBg"
            :style="`background-color:${child.textBg.bgColor};${child.textBg.textStyle}`">
            {{ child.textBg.content }}
          </view>
        </view>
        <view class="main-btn" :style="`width:${props.mainBtn.size}px;height:${props.mainBtn.size}px;`"
          :animation="mainAnimation" @tap="mainClick">
          <image class="main-btn-content f-c-c" :src="props.mainBtn.bgImg" />
          <!-- <view
            class="main-btn-content f-c-c"
            v-else-if="props.mainBtn.textBg"
            :style="`background-color:${props.mainBtn.textBg.bgColor};${props.mainBtn.textBg.textStyle}`"
          >
            {{ props.mainBtn.textBg.content }}
          </view> -->
        </view>
      </view>
    </movable-view>
    <view v-if="isExpand" class="screen-back" @tap="mainClick" />
  </movable-area>
</template>
<style lang="scss">
@import './qc-suspendBtn.scss';
</style>
