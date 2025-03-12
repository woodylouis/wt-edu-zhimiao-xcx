<template>
    <div class="notification-banner">
        {{ message }}
    </div>
</template>

<script setup>
defineProps({
    message: {
        type: String,
        required: true,
    },
});
</script>

<style scoped>
.notification-banner {
    background-color: rgba(110, 221, 138, 0.2);
    align-self: stretch;
    margin-top: 12px;
    width: 100%;
    padding: 6px 70px;
    font-family:
        PingFang SC,
        -apple-system,
        Roboto,
        Helvetica,
        sans-serif;
    font-size: 14px;
    color: #006234;
    font-weight: 400;
    white-space: nowrap;
    line-height: 1;
}
</style>