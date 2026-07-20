<template>
  <picker
    class="year-only-picker"
    mode="date"
    fields="year"
    :value="pickerValue"
    :start="startDate"
    :end="endDate"
    :disabled="disabled"
    @change="handleChange"
  >
    <view class="year-only-picker__trigger" :class="{ 'year-only-picker__trigger--disabled': disabled }">
      <text :class="{ 'year-only-picker__placeholder': !selectedYear }">
        {{ selectedYear ? `${selectedYear}年` : placeholder }}
      </text>
      <text class="year-only-picker__arrow">⌄</text>
    </view>
  </picker>
</template>

<script>
  export default {
    name: "YearOnlyPicker",
    emits: ["input", "update:modelValue", "change"],
    props: {
      value: {
        type: [String, Number],
        default: "",
      },
      modelValue: {
        type: [String, Number],
        default: "",
      },
      minYear: {
        type: Number,
        default: 1900,
      },
      maxYear: {
        type: Number,
        default: 2100,
      },
      placeholder: {
        type: String,
        default: "请选择年份",
      },
      disabled: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      rawValue() {
        return this.modelValue !== "" ? this.modelValue : this.value;
      },
      selectedYear() {
        const match = String(this.rawValue || "").match(/^\d{4}/);
        return match ? match[0] : "";
      },
      pickerValue() {
        const year = this.selectedYear || String(new Date().getFullYear());
        return `${year}-01-01`;
      },
      startDate() {
        return `${this.minYear}-01-01`;
      },
      endDate() {
        return `${this.maxYear}-12-31`;
      },
    },
    methods: {
      handleChange(event) {
        const rawValue = event && event.detail ? event.detail.value : "";
        const match = String(rawValue || "").match(/^\d{4}/);
        if (!match) return;
        const year = match[0];
        this.$emit("input", year);
        this.$emit("update:modelValue", year);
        this.$emit("change", year);
      },
    },
  };
</script>

<style scoped>
  .year-only-picker {
    display: block;
    width: 100%;
  }

  .year-only-picker__trigger {
    display: flex;
    width: 100%;
    min-height: 92rpx;
    align-items: center;
    justify-content: space-between;
    padding: 0 26rpx;
    border: 3rpx solid #2f2854;
    border-radius: 22rpx;
    color: #2f2854;
    background: #fffdf8;
    font-size: 27rpx;
    font-weight: 700;
    box-sizing: border-box;
    box-shadow: 4rpx 5rpx 0 rgba(47, 40, 84, 0.16);
  }

  .year-only-picker__trigger--disabled {
    color: #9a94aa;
    background: #f2eff7;
  }

  .year-only-picker__placeholder,
  .year-only-picker__arrow {
    color: #7657f6;
  }

  .year-only-picker__arrow {
    margin-left: 10px;
    font-size: 34rpx;
    font-weight: 900;
  }
</style>
