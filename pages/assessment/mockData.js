const tempQuestions = ref(
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
                "task_object": "按照要求，学生会看到老师拿着的某个强化物。",
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
                "task_object": "按照要求，学生会看到老师拿着的某个强化物。",
                "task_sample": "nan",
                "type": "radio",
                "_id": "6826dda51021b06f3150457c",
            },

        ],
        "sectionId": "LANG_1",
        "totalQuestions": 45
    },
    {
        "abllsSectionAlphabet": "C",
        "age": 3,
        "questions": [
            {
                "ablls_r_section": "要求表达",
                "ablls_r_section_alphabet": "E",
                "ablls_r_section_order": 3,
                "age_standards": [
                    { age: 2, expected_score: 2 },
                    { age: 3, expected_score: 2 },
                    { age: 4, expected_score: 2 },
                    { age: 5, expected_score: 2 },
                    { age: 6, expected_score: 2 },
                    { age: 7, expected_score: 2 },
                ],
                "content": "如果你拿着一个强化物，并要求学生看着它，学生会看到它吗?",
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
                "task_object": "按照要求，学生会看到老师拿着的某个强化物。",
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
                "task_object": "按照要求，学生会看到老师拿着的某个强化物。",
                "task_sample": "nan",
                "type": "radio",
                "_id": "6826dda51021b06f3150457c",
            },

        ],
        "sectionId": "LANG_1",
        "totalQuestions": 45
    }
);

const tempRecords = ref(
    {
        assessmentId: '',
        assessorId: '',
        childId: '',
        childName: '',
        childAge: '',
        // 当前问题
        snapshot: {
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
                    sectionExpectTotalScore: 120, // 预期总分, 通过迭代abllsSections.questions下的数组对象的expectedScore字段计算得出
                    sectionActualTotalScore: 110, // 实际总分, 通过迭代abllsSections.questions下的数组对象的score字段计算得出, 默认0
                    abllsSections: {
                        alphabet: 'C',
                        totalQuestions: 2, // 总问题数, 计算questions.length
                        expectedTotalScore: 20, // 预期总分, 系统计算
                        actualTotalScore: 20, // 实际总分, 通过选择计算得出，默认0
                        sectioName: '语言理解',
                        questions: [
                            {
                                order: 3,
                                taskName: "听从命令看着某个强化物",
                                taskNameEng: "Follow instructions tolook at a reinforcing item",
                                taskObject: "按照要求，学生会看到老师拿着的某个强化物。",
                                taskSample: "nan",
                                question: "如果你拿着一个强化物，并要求学生看着它，学生会看到它吗?",
                                options: [
                                    { text: "在3秒钟以内，看着在任何位置的强化物(上、下、左、右)", score: 2 },
                                    { text: "看着强化物，但要求额外的提示才看或者超过3秒钟才做出反应", score: 1 },
                                    { text: "无法完成", score: 0 }
                                ],
                                selectedAnswer: "看着强化物，但要求额外的提示才看或者超过3秒钟才做出反应", // 默认空字符串
                                score: 1, // 实际得分, 通过选择得出，默认0
                                expectedScore: 2, // 相当于通过expected_score字段
                                isStandard: false, // 系统计算得出，如果score小于expectedScore，则未达标，为false。默认false。
                                hasSelected: true, // 是否选择了答案，默认false
                            }
                        ]
                    }
                }
            ]
        }

    }
)