<template>
  <view v-if="show" class="analysis-modal-overlay" @tap="close">
    <view class="analysis-modal-card" @tap.stop>
      <view class="analysis-modal-header">
        <view class="analysis-title-group">
          <text class="analysis-title">{{ title }}</text>
          <text class="analysis-subtitle" v-if="subtitle">{{ subtitle }}</text>
        </view>
        <view class="analysis-close-btn" @tap="close">
          <text class="analysis-close-text">×</text>
        </view>
      </view>

      <view class="analysis-modal-body">
        <view class="analysis-lead-card" v-if="summaryLead">
          <view class="analysis-lead-label">{{ leadLabel }}</view>
          <text class="analysis-lead-text">{{ summaryLead }}</text>
        </view>

        <view class="analysis-detail-title" v-if="summaryParagraphs.length">
          {{ detailTitle }}
        </view>
        <scroll-view
          class="analysis-detail-scroll"
          scroll-y
          :style="{ height: summaryNeedsScroll ? scrollHeight : 'auto' }"
          v-if="summaryParagraphs.length"
        >
          <view
            class="analysis-detail-item"
            v-for="(paragraph, index) in summaryParagraphs"
            :key="index"
          >
            <view class="analysis-detail-index">{{ index + 1 }}</view>
            <text class="analysis-detail-text">{{ paragraph }}</text>
          </view>
        </scroll-view>
      </view>

      <view class="analysis-buttons-container">
        <view class="analysis-btn analysis-btn-primary" @tap="close">
          <text class="analysis-btn-text">{{ confirmText }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    default: "AI分析",
  },
  subtitle: {
    type: String,
    default: "",
  },
  content: {
    type: String,
    default: "",
  },
  leadLabel: {
    type: String,
    default: "核心结论",
  },
  detailTitle: {
    type: String,
    default: "分析详情",
  },
  confirmText: {
    type: String,
    default: "我知道了",
  },
  scrollHeight: {
    type: String,
    default: "42vh",
  },
});

const emit = defineEmits(["update:show", "close"]);

const close = () => {
  emit("update:show", false);
  emit("close");
};

const normalizedContent = computed(() =>
  (props.content || "").replace(/\s+/g, " ").trim()
);

const summarySentences = computed(() => {
  if (!normalizedContent.value) return [];
  return normalizedContent.value.match(/[^。！？；.!?;]+[。！？；.!?;]?/g) || [
    normalizedContent.value,
  ];
});

const summaryLead = computed(() => summarySentences.value[0] || "");

const summaryParagraphs = computed(() => {
  if (!normalizedContent.value) return [];

  const manualParagraphs = (props.content || "")
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (manualParagraphs.length > 1) return manualParagraphs.slice(1);

  const detailSentences = summarySentences.value.slice(1);
  if (detailSentences.length === 0) return [];
  if (detailSentences.length <= 2) return [detailSentences.join("")];

  const paragraphs = [];
  for (let i = 0; i < detailSentences.length; i += 2) {
    paragraphs.push(detailSentences.slice(i, i + 2).join(""));
  }
  return paragraphs;
});

const summaryNeedsScroll = computed(() =>
  normalizedContent.value.length > 220 || summaryParagraphs.value.length > 2
);
</script>

<style lang="scss" scoped>
.analysis-modal-overlay {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  padding: 40rpx;
  box-sizing: border-box;
}

.analysis-modal-card {
  width: 620rpx;
  max-height: 80vh;
  background: #ffffff;
  border-radius: 32rpx;
  overflow: hidden;
  box-shadow: 0 20rpx 48rpx rgba(0, 33, 77, 0.18);
}

.analysis-modal-header {
  min-height: 132rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  background: linear-gradient(221deg, #d6ffd8 2.4%, #eafbff 73.84%);
  padding: 28rpx 28rpx 24rpx 36rpx;
  box-sizing: border-box;
}

.analysis-title-group {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.analysis-title {
  color: #00214d;
  font-family: "PingFang SC";
  font-size: 32rpx;
  font-weight: 600;
  line-height: 48rpx;
}

.analysis-subtitle {
  color: #3d464a;
  font-family: "PingFang SC";
  font-size: 24rpx;
  font-weight: 400;
  line-height: 34rpx;
  margin-top: 4rpx;
}

.analysis-close-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.analysis-close-text {
  color: #00214d;
  font-size: 36rpx;
  font-weight: 400;
  line-height: 40rpx;
}

.analysis-modal-body {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 28rpx 32rpx 0;
}

.analysis-lead-card {
  border-radius: 18rpx;
  background: rgba(110, 221, 138, 0.12);
  border: 1px solid rgba(110, 221, 138, 0.28);
  padding: 22rpx 24rpx;
}

.analysis-lead-label {
  color: #3d464a;
  font-family: "PingFang SC";
  font-size: 24rpx;
  font-weight: 500;
  line-height: 34rpx;
  margin-bottom: 8rpx;
}

.analysis-lead-text {
  color: #00214d;
  font-family: "PingFang SC";
  font-size: 28rpx;
  font-weight: 600;
  line-height: 42rpx;
  word-break: break-word;
}

.analysis-detail-title {
  color: #00214d;
  font-family: "PingFang SC";
  font-size: 28rpx;
  font-weight: 600;
  line-height: 40rpx;
  margin-top: 28rpx;
  margin-bottom: 16rpx;
}

.analysis-detail-scroll {
  width: 100%;
  max-height: 42vh;
}

.analysis-detail-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 18rpx 0;
  border-top: 1px solid #e9e9e9;
}

.analysis-detail-item:first-child {
  border-top: none;
  padding-top: 0;
}

.analysis-detail-index {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #6edd8a;
  color: #00214d;
  font-family: "PingFang SC";
  font-size: 22rpx;
  font-weight: 600;
  line-height: 40rpx;
  text-align: center;
  flex-shrink: 0;
}

.analysis-detail-text {
  flex: 1;
  color: #00214d;
  font-family: "PingFang SC";
  font-size: 26rpx;
  font-weight: 400;
  line-height: 40rpx;
  word-break: break-word;
}

.analysis-buttons-container {
  display: flex;
  justify-content: center;
  padding: 0 32rpx;
  margin-top: 36rpx;
  margin-bottom: 40rpx;
}

.analysis-btn {
  height: 80rpx;
  width: 236rpx;
  border-radius: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.analysis-btn-primary {
  background: #6edd8a;
}

.analysis-btn-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #00214d;
  line-height: 40rpx;
}
</style>
