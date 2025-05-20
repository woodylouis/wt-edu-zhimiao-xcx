const tempQuestions =
{
    "abllsSectionAlphabet": "C",
    "age": 3,
    "questions": [
        {
            "ablls_r_section": "语言理解",
            "ablls_r_section_alphabet": "C",
            "ablls_r_section_order": 3,
            "age_standards": [
                { age: 2, expected_score: 2 },
                { age: 3, expected_score: 2 },
                { age: 4, expected_score: 2 },
                { age: 5, expected_score: 2 },
                { age: 6, expected_score: 2 },
                { age: 7, expected_score: 2 },
            ],
            "content": "如果你拿着一个强化物，并要求学生看着它，学生会看着它吗?",
            "description": "",
            "expected_score": 2,
            "options": [
                { text: "在3秒钟以内，看着在任何位置的强化物(上、下、左、右)", score: 2 },
                { text: "看着强化物，但要求额外的提示才看或者超过3秒钟才做出反应", score: 1 },
                { text: "无法完成", score: 0 }
            ],
            "section_id": "LANG_1",
            "task_name": "听从命令看着某个强化物",
            "task_name_eng": "Follow instructions tolook at a reinforcing item",
            "task_object": "按照要求，学生会看着老师拿着的某个强化物。",
            "task_sample": "nan",
            "type": "radio",
            "_id": "6826dda51021b06f3150457c",
        },
        {
            "ablls_r_section": "语言理解",
            "ablls_r_section_alphabet": "C",
            "ablls_r_section_order": 4,
            "age_standards": [
                { age: 2, expected_score: 2 },
                { age: 3, expected_score: 2 },
                { age: 4, expected_score: 2 },
                { age: 5, expected_score: 2 },
                { age: 6, expected_score: 2 },
                { age: 7, expected_score: 2 },
            ],
            "content": "如果你拿着一个学生渴望的东西，在他面前不同位置移动，学生会根据指令伸出手，摸或抓该东西吗?",
            "description": "",
            "expected_score": 2,
            "options": [
                { text: "在3秒钟以内，看着在任何位置的强化物(上、下、左、右)", score: 2 },
                { text: "看着强化物，但要求额外的提示才看或者超过3秒钟才做出反应", score: 1 },
                { text: "无法完成", score: 0 }
            ],
            "section_id": "LANG_1",
            "task_name": "听从命令看着某个强化物",
            "task_name_eng": "Follow instructions tolook at a reinforcing item",
            "task_object": "按照要求，学生会看着老师拿着的某个强化物。",
            "task_sample": "nan",
            "type": "radio",
            "_id": "6826dda51021b06f3150457c",
        },

    ],
    "sectionId": "LANG_1",
    "totalQuestions": 45
};

const tempAnswers =
{
    assessmentId: '',
    assessorId: '',
    childId: '',
    childName: '',
    childAge: '',
    currentIndex: {
        ablls_r_section_alphabet: '',
        ablls_r_section_order: '',
        index: 0,
    },
    // 时间戳毫秒，自动生成
    startTimestamp: Date.now(),
    completionTime: 0, // 完成时间，单位毫秒，最后提交执行Date.now()
    // 持续时间秒
    duration: 0,  // 持续时间，单位秒，最后提交执行Date.now() - startTimestamp
    assessmentRecords: {
        sections: [
            {
                sectionId: 'LANG_1',
                sectionName: '语言与沟通技能',
                sectionExpectTotalScore: 120, // 预期总分, 系统计算
                sectionActualTotalScore: 120, // 实际总分, 通过选择计算得出
                ablls_r_sections: {
                    alphabet: 'C',
                    ablls_r_section_expect_total_score: 20, // 预期总分, 系统计算
                    ablls_r_section_actual_total_score: 20, // 实际总分, 通过选择计算得出
                    ablls_r_section_name: '语言理解',
                    ablls_r_section_questions: [
                        {
                            order: 3,
                            question: "如果你拿着一个强化物，并要求学生看着它，学生会看着它吗?",
                            answer: "在3秒钟以内，看着在任何位置的强化物(上、下、左、右)",
                            score: 2, // 实际得分, 通过选择得出
                            expected_score: 2, // 相当于通过expected_score字段
                            // 是否达到标准
                            is_standard: true, // 系统计算得出
                        }
                    ]
                }

            }
        ]
    }

}

module.exports = {
    tempQuestions,
    tempAnswers
}