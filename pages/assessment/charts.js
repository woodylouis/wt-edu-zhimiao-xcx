const processSectionScores = (sectionSummaryList) => {
    // 通过遍历sectionSummaryList，提取其sectionName和的abllsSectionSummaryList列表，然后继续遍历abllsSectionSummaryList列表，获得abllsSection的expectedTotalScore的和以及actualTotalScore的和。
    // 期望的数据结构是对象数据。例如：
    return sectionSummaryList.map(section => {
        const expectedTotalScore = section.abllsSectionSummaryList.reduce(
            (sum, item) =>
                sum + (item.expectedTotalScore || 0), 0
        );

        const actualTotalScore = section.abllsSectionSummaryList.reduce(
            (sum, item) => sum + (item.actualTotalScore || 0), 0
        );

        return {
            sectionName: section.sectionName,
            expectedTotalScore,
            actualTotalScore
        };
    });
};


export const getRadarOption = (sectionSummaryList) => {
    // 从age中提取年龄数字（如"4岁5个月" -> 4）
    // console.log("chartsjs sectionSummaryList", sectionSummaryList)
    let sectionScoreList = processSectionScores(sectionSummaryList)
    const indicators = sectionScoreList.map(section => {
        // max值需要永远比expectedTotalScore大，但当actualTotalScore比expectedTotalScore大时，需要比actualTotalScore大
        const maxScore = Math.max(section.expectedTotalScore, section.actualTotalScore);
        return {
            name: section.sectionName,
            max: maxScore + Math.ceil(maxScore * 0.2) // 在最大值基础上增加20%作为缓冲
        };
    });
    const expectedScores = sectionScoreList.map(section => section.expectedTotalScore);
    const actualScores = sectionScoreList.map(section => section.actualTotalScore);
    return {
        radar: {
            indicator: indicators
        },
        series: [
            {
                name: '能力图',
                type: 'radar',
                data: [
                    {
                        value: expectedScores,
                        name: '期待值'
                    },
                    {
                        value: actualScores,
                        name: '实际得分'
                    }
                ]
            }
        ]
    };
};