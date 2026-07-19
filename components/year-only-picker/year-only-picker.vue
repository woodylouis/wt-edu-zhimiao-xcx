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
    min-height: 40px;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    border: 1px solid #dcdfe6;
    border-radius: 7px;
    color: #303843;
    background: #ffffff;
    font-size: 14px;
    box-sizing: border-box;
  }

  .year-only-picker__trigger--disabled {
    color: #a8abb2;
    background: #f5f7fa;
  }

  .year-only-picker__placeholder,
  .year-only-picker__arrow {
    color: #a8abb2;
  }

  .year-only-picker__arrow {
    margin-left: 10px;
    font-size: 18px;
  }
</style>
