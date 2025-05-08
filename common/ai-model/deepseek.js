// services/deepseekPlan.js

const BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const AUTH_TOKEN = 'Bearer 005aeb28-621e-425f-8540-14503fe172a6';

/**
 * 通用 DeepSeek 请求函数
 */
async function requestDeepseek(messages) {
    const res = await uni.request({
        url: BASE_URL,
        method: 'POST',
        timeout: 20000,
        header: {
            'Content-Type': 'application/json',
            'Authorization': AUTH_TOKEN
        },
        data: {
            model: 'deepseek-v3-250324',
            messages
        }
    });

    if (res.statusCode === 200 && res.data.choices) {
        try {
            return JSON.parse(res.data.choices[0].message.content);
        } catch (e) {
            throw new Error('JSON 解析失败：' + res.data.choices[0].message.content);
        }
    } else {
        throw new Error('DeepSeek 请求失败：' + JSON.stringify(res.data));
    }
}

/**
 * 年度目标
 */
export async function generateYearGoal(qnaJsonText) {
    return await requestDeepseek([
        {
            role: 'system',
            content: `你是儿童康复专家。我会提供一组问答形式的评估数据，请你：

1. 找出所有回答为“否”的题目；
2. 根据这些未达标能力，生成全年干预的“年度目标”；
3. 返回格式如下：

{
  "yearGoal": "..."
}

只输出有效 JSON。数据是数组，每项包含 questions 和 answer 字段。`
        },
        {
            role: 'user',
            content: qnaJsonText
        }
    ]);
}

/**
 * 月目标
 */
export async function generateMonthGoal(monthIndex, yearGoalText) {
    return await requestDeepseek([
        {
            role: 'system',
            content: `你是儿童康复专家。请根据年度目标，为第 ${monthIndex} 月生成月度干预目标，返回格式如下：
{
  "month": "${monthIndex}月",
  "goal": "..."
}
只输出 JSON。`
        },
        {
            role: 'user',
            content: JSON.stringify(yearGoalText)
        }
    ]);
}

/**
 * 周目标（4周）
 */
export async function generateWeekGoals(monthGoalText, weekCount = 4) {
    return await requestDeepseek([
        {
            role: 'system',
            content: `你是儿童康复专家。请根据以下月目标，生成 ${weekCount} 个周目标，返回格式如下：
{
  "weeks": [
    { "week": "第1周", "goal": "..." },
    ...
  ]
}
只输出 JSON。`
        },
        {
            role: 'user',
            content: JSON.stringify(monthGoalText)
        }
    ]);
}

/**
 * 每周每日任务
 */
export async function generateDailyTasks(weekGoalText) {
    return await requestDeepseek([
        {
            role: 'system',
            content: `你是儿童康复专家。请根据以下周目标，生成 7 天每日干预任务，返回格式如下：
            {
            "days": [
                { "day": "周一", "task": "..." },
                ...
            ]
            }
            只输出 JSON。`
        },
        {
            role: 'user',
            content: JSON.stringify(weekGoalText)
        }
    ]);
}

/**
 * 高阶函数：生成全年计划（年 → 12月 → 每周 → 每日）
 */
export async function generateFullYearPlan(qnaJsonText) {
    const fullPlan = {
        yearGoal: '',
        months: []
    };

    const year = await generateYearGoal(qnaJsonText);
    fullPlan.yearGoal = year.yearGoal;

    for (let monthIndex = 1; monthIndex <= 12; monthIndex++) {
        const month = await generateMonthGoal(monthIndex, year);
        const monthBlock = {
            month: month.month,
            goal: month.goal,
            weeks: []
        };

        const weekGoals = await generateWeekGoals(month, 4);
        for (const week of weekGoals.weeks) {
            const weekBlock = {
                week: week.week,
                goal: week.goal,
                days: []
            };

            const dayTasks = await generateDailyTasks(week);
            weekBlock.days = dayTasks.days;

            monthBlock.weeks.push(weekBlock);
        }

        fullPlan.months.push(monthBlock);
    }

    return fullPlan;
}
