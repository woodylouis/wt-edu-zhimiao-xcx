const echarts = require('./static/echarts.min');

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
    let sectionScoreList = processSectionScores(sectionSummaryList)

    // 方案1：使用固定的max值策略
    const indicators = sectionScoreList.map(section => {
        // 以期望分数为基准，增加固定缓冲区作为max值
        // 这样标准值（期望分数）始终处于相同的相对位置
        const standardMax = section.expectedTotalScore + Math.ceil(section.expectedTotalScore * 0.2);

        return {
            name: section.sectionName,
            max: standardMax
        };
    });

    // 方案2（备选）：如果需要处理actualTotalScore超出expectedTotalScore很多的情况
    // const indicators = sectionScoreList.map(section => {
    //     // 设置一个最小max值，确保期望分数始终在80%位置
    //     const minMaxForExpected = Math.ceil(section.expectedTotalScore / 0.8);
    //     
    //     // 如果实际分数超出太多，适当扩展max值，但保持期望分数的相对位置稳定
    //     const actualMax = section.actualTotalScore > minMaxForExpected ? 
    //         Math.ceil(section.actualTotalScore * 1.1) : minMaxForExpected;
    //     
    //     return {
    //         name: section.sectionName,
    //         max: actualMax
    //     };
    // });

    const expectedScores = sectionScoreList.map(section => section.expectedTotalScore);
    const actualScores = sectionScoreList.map((section, index) => {
        const standardMax = section.expectedTotalScore + Math.ceil(section.expectedTotalScore * 0.2);
        return Math.min(section.actualTotalScore, standardMax);
    });

    return {
        radar: {
            indicator: indicators,
            splitNumber: 3,
            shape: 'polygon',
            axisName: {
                color: '#392F59',
                fontSize: 11,
                fontWeight: 700
            },
            axisLine: {
                lineStyle: {
                    color: 'rgba(57, 47, 89, 0.28)'
                }
            },
            splitLine: {
                lineStyle: {
                    color: ['rgba(57, 47, 89, 0.16)']
                }
            },
            splitArea: {
                areaStyle: {
                    color: ['rgba(255, 241, 172, 0.26)', 'rgba(238, 233, 255, 0.5)']
                }
            }
        },
        series: [
            {
                name: '能力图',
                type: 'radar',
                data: [
                    {
                        value: expectedScores,
                        name: '期待值',
                        lineStyle: {
                            type: 'dashed',
                            color: '#FF765F',
                            width: 2
                        },
                        itemStyle: {
                            normal: {
                                color: '#FF765F',
                                borderColor: '#392F59',
                                borderWidth: 1
                            }
                        },
                        label: {
                            show: false,
                            formatter: function (params) {
                                return params.value;
                            },
                        },
                    },
                    {
                        value: actualScores,
                        name: '实际得分',
                        areaStyle: {
                            color: new echarts.graphic.RadialGradient(0.1, 0.6, 1, [
                                {
                                    color: 'rgba(121, 223, 194, 0.48)',
                                    offset: 0
                                },
                                {
                                    color: 'rgba(165, 139, 255, 0.72)',
                                    offset: 1
                                }
                            ])
                        },
                        lineStyle: {
                            color: '#7C63E8',
                            width: 3
                        },
                        itemStyle: {
                            normal: {
                                color: '#FFD447',
                                borderColor: '#392F59',
                                borderWidth: 1
                            }
                        },
                    }
                ]
            }
        ]
    };
};
