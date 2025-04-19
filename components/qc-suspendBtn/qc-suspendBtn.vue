<script setup>
import { ref, computed } from "vue";

import { suspendBtnProps } from './qc-suspendBtn.js'

const props = defineProps(suspendBtnProps)

// 是否展开菜单
const isExpand = ref(false)

const $emits = defineEmits([, 'mainClick', 'childClick'])

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
  const needMinus = props.openType === 'SectorLeft'
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
  if (props.openType.startsWith('Line')) {
    // 计算时将是否为负数
    const needMinus =
      props.openType === 'LineLeft' || props.openType === 'LineUp'
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
    const isX = props.openType === 'LineLeft' || props.openType === 'LineRight'
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
const allHorW = computed(() => {
  const len = props.childBtns.length
  const temp =
    len * props.childSize +
    props.mainBtn.size +
    props.childMargin * (len - 1) +
    props.mainToChildMargin
  return temp
})

const allbtnsBackStyle = computed(() => {
  const lineMargin =
    props.openType === 'LineUp' || props.openType === 'LineLeft'
      ? allHorW.value - props.mainBtn.size
      : 0
  if (props.openType === 'LineUp' || props.openType === 'LineDown') {
    return `margin-top:${lineMargin}px; flex-direction: column;`
  }
  if (props.openType === 'LineLeft' || props.openType === 'LineRight') {
    return `margin-left:${lineMargin}px;flex-direction:row;`
  }
  const sectorMargin =
    props.openType === 'SectorLeft'
      ? props.mainToChildMargin + props.childSize
      : 0
  return `margin-left:${sectorMargin}px;flex-direction:row;`
})
const moveAreaStyle = computed(() => {
  return `width:calc(100vw - ${props.padding * 2}px);
            height:calc(50vh - ${props.padding * 2 + props.tabbarHeight}px);
            top:${props.padding}px;
            left:${props.padding}px;
            `
})
// 被拖动部分的大小
const dragStyle = computed(() => {
  if (props.openType === 'LineUp' || props.openType === 'LineDown') {
    return `width:${Math.max(props.mainBtn.size, props.childSize)}px;height:${allHorW.value
      }px;`
  }
  if (props.openType === 'LineLeft' || props.openType === 'LineRight') {
    return `width:${allHorW.value}px;height:${Math.max(
      props.mainBtn.size,
      props.childSize
    )}px;`
  }

  const width = props.mainBtn.size + props.childSize + props.mainToChildMargin
  const yPoint1 = Math.abs(getSectorPoint(0).yPoint)
  const yPoint2 = Math.abs(getSectorPoint(props.childBtns.length + 1).yPoint)
  const distance = props.childSize
  return `width:${width}px;
  height:${yPoint1 + yPoint2 + distance}px;`
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
  <movable-area class="qc-suspendbtn" :style="moveAreaStyle">
    <movable-view class="drag-back" direction="all" :style="dragStyle" inertia :x="props.mainBtn.initX"
      :y="props.mainBtn.initY" :disabled="!props.moveable">
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
