<template>
  <view>
    <u-popup
      :safeAreaInsetBottom="true"
      :safeAreaInsetTop="true"
      :mode="popupData.mode"
      :show="show"
      :round="popupData.round"
      :overlay="popupData.overlay"
      :borderRadius="popupData.borderRadius"
      :closeable="popupData.closeable"
      :closeOnClickOverlay="popupData.closeOnClickOverlay"
      @close="close"
      @open="open"
    >
      <view class="u-popup-slot report-history-panel">
        <scroll-view class="report" scroll-y>
          <view class="history-hero">
            <view class="history-kicker">GROWTH ARCHIVE</view>
            <text class="history-heading">历史成长报告</text>
            <text class="history-description">选择一份报告，查看每一次成长变化</text>
            <view class="history-decoration">✦</view>
          </view>
          <view v-if="historyReports.length === 0" class="history-empty">
            <view class="empty-icon">📚</view>
            <text class="empty-title">还没有历史报告</text>
            <text class="empty-hint">完成评估后，成长记录会出现在这里</text>
          </view>
          <view
            v-for="(report, index) in historyReports"
            :key="index"
            class="report-list"
            @click="onclickReportCard(index)"
          >
            <view class="report-card" :class="{ 'report-card--current': index === currentReportIndex }">
              <view class="report-index">{{ index + 1 }}</view>
              <view class="report-main">
                <view class="report-title-row">
                  <text class="report-title">
                    {{ report.title ? report.title : "ABLLS-R评估" }}
                  </text>
                  <text v-if="index === currentReportIndex" class="current-tag">当前</text>
                </view>
                <view class="report-date-row">
                  <text class="date-icon">📅</text>
                  <text class="report-date">{{ report.date }}</text>
                </view>
              </view>
              <view class="report-arrow">›</view>
            </view>
          </view>
        </scroll-view>
      </view>
    </u-popup>
  </view>
</template>

<script>
  export default {
    props: {
      show: {
        type: Boolean,
        default: false,
      },
      historyReports: {
        type: Array,
        default: () => [],
      },
    },
    data() {
      return {
        currentReportIndex: 0, // 新增这行，默认第一个报告为当前报告
        popupData: {
          overlay: true,
          mode: "left",
          borderRadius: "",
          closeable: true,
          closeOnClickOverlay: true,
        },
      };
    },
    methods: {
      openPopup(popupData) {
        this.popupData = popupData;
        uni.$u.sleep().then(() => {
          this.show = !this.show;
        });
      },
      navigateBack() {
        uni.navigateBack();
      },
      open() {
        // console.log('open');
      },
      close() {
        this.$emit("update:show", false); // 修改为emit事件
      },
      onclickReportCard(i) {
        this.currentReportIndex = i;
        this.$emit("onclickReportCard", i);
      },
    },
  };
</script>

<style lang="scss" scoped>
.report-history-panel {
  width: 82vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  overflow: hidden;
  border-right: 4rpx solid #392f59;
  background:
    radial-gradient(circle at 88% 34%, rgba(165, 139, 255, 0.22) 0 90rpx, transparent 92rpx),
    linear-gradient(180deg, #fff7d9 0%, #fff3ec 48%, #f4efff 100%);
}

.report {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.history-hero {
  position: relative;
  overflow: hidden;
  margin: 34rpx 26rpx 16rpx;
  padding: 34rpx 28rpx;
  border: 4rpx solid #392f59;
  border-radius: 34rpx;
  background: linear-gradient(135deg, #7c63e8 0%, #a58bff 100%);
  box-shadow: 8rpx 8rpx 0 #ffd447;
}

.history-kicker {
  display: inline-flex;
  margin-bottom: 13rpx;
  padding: 6rpx 12rpx;
  color: #392f59;
  border: 2rpx solid #392f59;
  border-radius: 999rpx;
  background: #ffd447;
  font-size: 17rpx;
  font-weight: 900;
  letter-spacing: 1rpx;
}

.history-heading {
  display: block;
  color: #fff;
  font-size: 38rpx;
  font-weight: 900;
}

.history-description {
  display: block;
  max-width: 360rpx;
  margin-top: 10rpx;
  color: rgba(255, 255, 255, 0.86);
  font-size: 22rpx;
  font-weight: 650;
  line-height: 1.45;
}

.history-decoration {
  position: absolute;
  right: 28rpx;
  bottom: 18rpx;
  color: #ffb6ad;
  font-size: 64rpx;
  font-weight: 900;
  transform: rotate(14deg);
}

.report-list {
  padding: 14rpx 26rpx;
}

.report-card {
  display: flex;
  align-items: center;
  min-height: 126rpx;
  padding: 20rpx;
  border: 3rpx solid #392f59;
  border-radius: 26rpx;
  background: #fff;
  box-shadow: 6rpx 6rpx 0 #79dfc2;
  box-sizing: border-box;

  &:active {
    transform: translate(3rpx, 3rpx);
    box-shadow: 3rpx 3rpx 0 #79dfc2;
  }
}

.report-card--current {
  background: #fff1ac;
  box-shadow: 6rpx 6rpx 0 #ff8f82;
}

.report-index {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 54rpx;
  height: 54rpx;
  margin-right: 16rpx;
  color: #fff;
  border: 3rpx solid #392f59;
  border-radius: 18rpx;
  background: #7c63e8;
  box-shadow: 3rpx 3rpx 0 #ffd447;
  font-size: 24rpx;
  font-weight: 900;
}

.report-main {
  flex: 1;
  min-width: 0;
}

.report-title-row,
.report-date-row {
  display: flex;
  align-items: center;
}

.report-title {
  overflow: hidden;
  color: #31284f;
  font-size: 27rpx;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.current-tag {
  flex-shrink: 0;
  margin-left: 10rpx;
  padding: 4rpx 9rpx;
  color: #392f59;
  border: 2rpx solid #392f59;
  border-radius: 999rpx;
  background: #79dfc2;
  font-size: 17rpx;
  font-weight: 900;
}

.report-date-row {
  margin-top: 11rpx;
}

.date-icon {
  margin-right: 7rpx;
  font-size: 20rpx;
}

.report-date {
  color: #746d88;
  font-size: 22rpx;
  font-weight: 700;
}

.report-arrow {
  flex-shrink: 0;
  margin-left: 10rpx;
  color: #392f59;
  font-size: 42rpx;
  font-weight: 900;
}

.history-empty {
  display: flex;
  align-items: center;
  flex-direction: column;
  margin: 40rpx 26rpx;
  padding: 50rpx 30rpx;
  border: 4rpx solid #392f59;
  border-radius: 30rpx;
  background: #fff;
  box-shadow: 8rpx 8rpx 0 #79dfc2;
}

.empty-icon {
  font-size: 68rpx;
}

.empty-title {
  margin-top: 16rpx;
  color: #31284f;
  font-size: 29rpx;
  font-weight: 900;
}

.empty-hint {
  margin-top: 10rpx;
  color: #746d88;
  font-size: 22rpx;
  text-align: center;
}
</style>
