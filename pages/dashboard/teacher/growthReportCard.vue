<template>
    <article class="report-card">
        <div class="report-card__content">
            <h3 class="report-card__title">儿童成长预估报告</h3>
            <time class="report-card__date">{{ date }}</time>
            <p class="report-card__teacher">{{ teacher }}</p>
        </div>
        <button class="report-card__action-btn">去查看</button>
    </article>
</template>

<script setup>
defineProps({
    date: {
        type: String,
        required: true,
    },
    teacher: {
        type: String,
        required: true,
    },
});
</script>

<style scoped>
.report-card {
    border-radius: 16px;
    background-color: #fff;
    box-shadow: 0 0 1px rgba(193, 197, 210, 0.2);
    display: flex;
    margin-top: 16px;
    width: 100%;
    max-width: 335px;
    padding: 17px 16px;
    align-items: stretch;
    gap: 20px;
    font-family:
        PingFang SC,
        -apple-system,
        Roboto,
        Helvetica,
        sans-serif;
    font-size: 14px;
    white-space: nowrap;
    line-height: 1;
    justify-content: space-between;
}

.report-card__content {
    display: flex;
    flex-direction: column;
    align-items: start;
    color: #3d464a;
    font-weight: 400;
}

.report-card__title {
    color: #00214d;
    font-weight: 600;
    line-height: 24px;
    margin-left: 14px;
}

.report-card__date {
    margin-top: 8px;
}

.report-card__teacher {
    margin-top: 8px;
}

.report-card__action-btn {
    border-radius: 100px;
    background-color: #6edd8a;
    margin: auto 0;
    padding: 8px 20px;
    color: #00214d;
    font-weight: 500;
    border: none;
    cursor: pointer;
}
</style>