export const getRadarOption = (age, scores) => {
    // 从age中提取年龄数字（如"4岁5个月" -> 4）
    const ageYears = age ? parseInt(age.split('岁')[0]) : 0;

    return {
        radar: {
            indicator: [
                { name: '自发性语言', max: 7 },
                { name: '句法和语法', max: 7 },
                { name: '合作及强化物效果', max: 7 },
                { name: '课堂纪律', max: 7 }
            ],
        },
        series: [{
            type: 'radar',
            data: [
                {
                    value: [
                        scores.ziFaXingYuYanScore,
                        scores.juFaHeYuFaScore,
                        scores.heZuoJiQiangHuaWuXiaoGuoScore,
                        scores.keTangJiLvScore
                    ],
                    name: '当前',
                },
                {
                    value: [
                        Math.min(ageYears, 7),
                        Math.min(ageYears, 7),
                        Math.min(ageYears, 7),
                        Math.min(ageYears, 7)
                    ],
                    name: '理想值',
                }
            ]
        }]
    };
};