export const getRadarOption = (age, scores) => {
    // 从age中提取年龄数字（如"4岁5个月" -> 4）

    return {
        radar: {
            indicator: [
                { name: "社交与游戏技能", max: 98 },
                { name: "认知与专业技能", max: 16 },
                { name: "生活自理技能", max: 30 },
                { name: "运动与操作技能", max: 28 },
            ]
        },
        series: [
            {
                name: '能力图',
                type: 'radar',
                data: [
                    {
                        value: [81, 13, 25, 23],
                        name: 'Expected Score'
                    },
                    {
                        value: [79, 12, 24, 13],
                        name: 'Actual Score'
                    }
                ]
            }
        ]
    };
};