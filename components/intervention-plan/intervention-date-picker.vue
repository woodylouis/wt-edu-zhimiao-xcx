<template>
  <view class="intervention-date-picker">
    <view class="picker-trigger" @click="openCalendar"><slot /></view>
    <view v-if="calendarVisible" class="calendar-mask" @click="closeCalendar">
      <view class="calendar-panel" @click.stop>
        <view class="calendar-header">
          <button class="month-button" @click="changeMonth(-1)">‹</button>
          <text class="calendar-title">{{ calendarTitle }}</text>
          <button class="month-button" @click="changeMonth(1)">›</button>
        </view>
        <view class="weekday-row">
          <text v-for="weekday in weekdayLabels" :key="weekday" class="weekday-cell">{{ weekday }}</text>
        </view>
        <view class="date-grid">
          <view
            v-for="cell in calendarCells"
            :key="cell.value"
            class="date-cell"
            :class="{
              disabled: cell.disabled,
              muted: !cell.currentMonth,
              active: cell.value === value
            }"
            @click="selectCalendarDate(cell)"
          >
            <text>{{ cell.day }}</text>
          </view>
        </view>
        <view class="calendar-footer">
          <text class="calendar-help">{{ calendarHelpText }}</text>
          <button class="close-button" @click="closeCalendar">取消</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'InterventionDatePicker',
  props: {
    startDate: { type: String, default: '' },
    value: { type: String, default: '' },
    restrictToCompleteWeeks: { type: Boolean, default: false }
  },
  data() {
    return {
      calendarVisible: false,
      displayMonth: '',
      weekdayLabels: ['日', '一', '二', '三', '四', '五', '六']
    }
  },
  computed: {
    minimumEndDate() {
      return this.restrictToCompleteWeeks ? this.addDays(this.startDate, 6) : ''
    },
    calendarHelpText() {
      return this.restrictToCompleteWeeks
        ? '仅可选择第7、14、21…天对应的完整周结束日'
        : '请选择计划开始日期'
    },
    calendarTitle() {
      const [year, month] = String(this.displayMonth || '').split('-')
      return year && month ? `${year}年${Number(month)}月` : ''
    },
    calendarCells() {
      const [yearText, monthText] = String(this.displayMonth || '').split('-')
      const year = Number(yearText)
      const monthIndex = Number(monthText) - 1
      if (!year || monthIndex < 0) return []

      const firstDay = new Date(Date.UTC(year, monthIndex, 1))
      const gridStart = new Date(firstDay)
      gridStart.setUTCDate(gridStart.getUTCDate() - firstDay.getUTCDay())

      return Array.from({ length: 42 }, (_, index) => {
        const date = new Date(gridStart)
        date.setUTCDate(gridStart.getUTCDate() + index)
        const value = date.toISOString().slice(0, 10)
        return {
          value,
          day: date.getUTCDate(),
          currentMonth: date.getUTCMonth() === monthIndex,
          disabled: this.restrictToCompleteWeeks && !this.isValidEndDate(value)
        }
      })
    }
  },
  watch: {
    startDate() {
      if (this.calendarVisible) this.setDisplayMonth()
    }
  },
  methods: {
    parseDate(value) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null
      const date = new Date(`${value}T00:00:00.000Z`)
      return Number.isNaN(date.getTime()) ? null : date
    },
    addDays(value, days) {
      const date = this.parseDate(value)
      if (!date) return ''
      date.setUTCDate(date.getUTCDate() + days)
      return date.toISOString().slice(0, 10)
    },
    isValidEndDate(value) {
      const start = this.parseDate(this.startDate)
      const end = this.parseDate(value)
      if (!start || !end) return false
      const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
      return totalDays > 0 && totalDays % 7 === 0
    },
    setDisplayMonth() {
      const baseDate = this.value || this.minimumEndDate || this.todayDate()
      this.displayMonth = String(baseDate || '').slice(0, 7)
    },
    openCalendar() {
      if (this.restrictToCompleteWeeks && !this.startDate) return
      this.setDisplayMonth()
      this.calendarVisible = true
    },
    closeCalendar() {
      this.calendarVisible = false
    },
    changeMonth(offset) {
      const [yearText, monthText] = String(this.displayMonth || '').split('-')
      const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1 + offset, 1))
      this.displayMonth = date.toISOString().slice(0, 7)
    },
    selectCalendarDate(cell) {
      if (!cell || cell.disabled) return
      this.calendarVisible = false
      this.emitValidDate(cell.value)
    },
    todayDate() {
      const date = new Date()
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    emitValidDate(value) {
      if (!this.restrictToCompleteWeeks) {
        if (this.parseDate(value)) this.$emit('change', { value })
        return
      }
      const start = this.parseDate(this.startDate)
      const end = this.parseDate(value)
      if (!start || !end) return

      const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
      if (totalDays <= 0 || totalDays % 7 !== 0) {
        this.$emit('invalid', { value, totalDays })
        return
      }

      this.$emit('change', {
        value,
        totalDays,
        weeks: totalDays / 7
      })
    }
  }
}
</script>

<style scoped>
.intervention-date-picker,
.picker-trigger {
  position: relative;
  display: block;
  width: 100%;
}

.calendar-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(29, 24, 40, 0.42);
  box-sizing: border-box;
}

.calendar-panel {
  width: 100%;
  max-width: 430px;
  padding: 24rpx;
  border-radius: 30rpx;
  background: #fff;
  box-shadow: 0 -16rpx 48rpx rgba(37, 29, 57, 0.14);
  box-sizing: border-box;
}

.calendar-header,
.weekday-row,
.date-grid,
.calendar-footer {
  display: flex;
}

.calendar-header {
  align-items: center;
  justify-content: space-between;
  padding: 4rpx 6rpx 22rpx;
}

.calendar-title {
  color: #372f48;
  font-size: 30rpx;
  font-weight: 850;
}

.month-button,
.close-button {
  margin: 0;
  border: 0;
}

.month-button {
  display: flex;
  width: 62rpx;
  height: 62rpx;
  align-items: center;
  justify-content: center;
  border-radius: 18rpx;
  background: #f1edf9;
  color: #6651b2;
  font-size: 42rpx;
}

.month-button::after,
.close-button::after {
  border: 0;
}

.weekday-row {
  padding-bottom: 10rpx;
}

.weekday-cell,
.date-cell {
  width: 14.285%;
  text-align: center;
}

.weekday-cell {
  color: #9a92a2;
  font-size: 20rpx;
  font-weight: 750;
}

.date-grid {
  flex-wrap: wrap;
}

.date-cell {
  display: flex;
  height: 72rpx;
  align-items: center;
  justify-content: center;
  color: #9b94a1;
  font-size: 25rpx;
}

.date-cell text {
  display: flex;
  width: 58rpx;
  height: 58rpx;
  align-items: center;
  justify-content: center;
  border-radius: 18rpx;
}

.date-cell:not(.disabled) {
  color: #4e3f6e;
  font-weight: 850;
}

.date-cell:not(.disabled) text {
  background: #f0ebfb;
}

.date-cell.disabled {
  color: #d1ccd5;
}

.date-cell.muted {
  opacity: 0.38;
}

.date-cell.active text {
  background: #6751b7;
  color: #fff;
  box-shadow: 0 5rpx 12rpx rgba(81, 61, 157, 0.24);
}

.calendar-footer {
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  margin-top: 14rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid #eeeaf2;
}

.calendar-help {
  flex: 1;
  color: #8d8595;
  font-size: 20rpx;
  line-height: 1.5;
}

.close-button {
  padding: 14rpx 24rpx;
  border-radius: 16rpx;
  background: #eee9f8;
  color: #6752b2;
  font-size: 22rpx;
  font-weight: 850;
}

@media screen and (max-width: 560px) {
  .calendar-mask {
    align-items: flex-end;
    padding: 0;
  }

  .calendar-panel {
    max-width: none;
    padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
    border-radius: 30rpx 30rpx 0 0;
  }
}
</style>
