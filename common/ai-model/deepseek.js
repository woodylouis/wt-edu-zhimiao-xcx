// AI analysis has moved to uniCloud backend functions.
// Keep this module as a compatibility guard so the mini program does not
// accidentally call an external model provider or expose API keys.

function createBackendOnlyError() {
    return new Error('AI分析已迁移到云函数后台，请通过报告生成任务触发。');
}

async function requestDeepseek() {
    throw createBackendOnlyError();
}

export async function generateYearGoal() {
    return requestDeepseek();
}

export async function generateMonthGoal() {
    return requestDeepseek();
}

export async function generateWeekGoalByIndex() {
    return requestDeepseek();
}

export async function generateWeeklyDailyTasks() {
    return requestDeepseek();
}

export async function generatePartialPlan() {
    return requestDeepseek();
}
