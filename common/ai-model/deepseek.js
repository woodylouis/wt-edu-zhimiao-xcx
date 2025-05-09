// services/deepseekPlan.js

const BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
const AUTH_TOKEN = 'Bearer 005aeb28-621e-425f-8540-14503fe172a6';

function stripMarkdownCodeBlock(content) {
    return content
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
}

async function requestDeepseek(messages) {
    const res = await uni.request({
        url: BASE_URL,
        method: 'POST',
        timeout: 60000,
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
            const rawContent = res.data.choices[0].message.content;
            const cleaned = stripMarkdownCodeBlock(rawContent);
            return JSON.parse(cleaned);
        } catch (e) {
            throw new Error('JSON 解析失败：' + res.data.choices[0].message.content);
        }
    } else {
        throw new Error('DeepSeek 请求失败：' + JSON.stringify(res.data));
    }
}

export async function generateYearGoal(qnaJsonText) {
    return await requestDeepseek([
        {
            role: 'system',
            content: `你是儿童康复专家。我会提供一组问答形式的评估数据，请你：\n1. 找出所有回答为“无法完成”的题目；\n2. 根据这些未达标能力，生成全年干预的“年度目标”；\n3. 返回格式如下：\n{\n  "yearGoal": "..."\n}\n只输出有效 JSON。数据是数组，每项包含 questions 和 answer 字段。`
        },
        {
            role: 'user',
            content: qnaJsonText
        }
    ]);
}

export async function generateMonthGoal(monthIndex, yearGoalText) {
    return await requestDeepseek([
        {
            role: 'system',
            content: `你是儿童康复专家。请根据年度目标，为第 ${monthIndex} 月生成月度干预目标，返回格式如下：\n{\n  "month": "${monthIndex}月",\n  "goal": "..."\n}\n只输出 JSON。`
        },
        {
            role: 'user',
            content: JSON.stringify(yearGoalText)
        }
    ]);
}

export async function generateWeekGoalByIndex(monthGoal, weekIndex) {
    const simplified = {
        month: monthGoal.month,
        goal: monthGoal.goal
    };
    return await requestDeepseek([
        {
            role: 'system',
            content: `你是儿童康复专家。根据以下月目标，生成第${weekIndex}周的干预目标，格式如下：\n{\n  "week": "第${weekIndex}周",\n  "goal": "..."\n}\n只输出 JSON。`
        },
        {
            role: 'user',
            content: JSON.stringify(simplified)
        }
    ]);
}

export async function generateWeeklyDailyTasks(weekGoal) {
    const simplified = {
        week: weekGoal.week,
        goal: weekGoal.goal
    };
    return await requestDeepseek([
        {
            role: 'system',
            content: `你是儿童康复专家。请根据以下周目标，生成该周7天的每日训练任务，格式如下：\n{\n  "days": [\n    { "day": "周一", "task": "..." },\n    { "day": "周二", "task": "..." },\n    ...\n    { "day": "周日", "task": "..." }\n  ]\n}\n只输出 JSON，不要附加解释。`
        },
        {
            role: 'user',
            content: JSON.stringify(simplified)
        }
    ]);
}

export async function generatePartialPlan(qnaJsonText, monthStart, monthEnd, yearGoalCache = null) {
    if (monthStart < 1 || monthEnd > 12 || monthStart > monthEnd) {
        throw new Error('月份范围错误：起始月必须 >=1 且 <= 结束月 <=12');
    }

    const plan = {
        yearGoal: '',
        months: []
    };

    const year = yearGoalCache || await generateYearGoal(qnaJsonText);
    plan.yearGoal = year.yearGoal;

    for (let monthIndex = monthStart; monthIndex <= monthEnd; monthIndex++) {
        const month = await generateMonthGoal(monthIndex, year);
        const monthBlock = {
            month: month.month,
            goal: month.goal,
            weeks: []
        };

        for (let weekIndex = 1; weekIndex <= 4; weekIndex++) {
            const week = await generateWeekGoalByIndex(month, weekIndex);
            const weekBlock = {
                week: week.week,
                goal: week.goal,
                days: []
            };

            const dailyTasks = await generateWeeklyDailyTasks(week);
            weekBlock.days = dailyTasks.days;

            monthBlock.weeks.push(weekBlock);
        }

        plan.months.push(monthBlock);
    }

    return plan;
}
