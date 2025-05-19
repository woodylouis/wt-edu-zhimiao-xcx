'use strict';
const db = uniCloud.database();

exports.main = async (event) => {
	// const assessmentId = event.assessmentId || '6826d1093d029cca22a1ee0b';
	// const age = 2;
	// event = {
	// 	assessmentId: '6826d1093d029cca22a1ee0b',
	// 	age: 2,
	// };
	const { assessmentId, age } = event;	
	const assessmentSectionDbName = 'wtdb-business-assess-section';
	const assessmentQuestionDbName = 'wtdb-business-assessment-q';
	const sectionIdList = []; // 存储section_id的数组
	const output = [];
	if (!assessmentId || !age || age === undefined || age === null || age === '') {
		return {
			code: 400,
			message: '缺少必需参数，请传入assessmentId和age参数'
		};
	}
	try {
		// 1. 先通过assessmentId查询评估部分数据
		const sectionRes = await db.collection(assessmentSectionDbName)
			.where({
				assessment_id: assessmentId,
			})
			.get();

		if (!sectionRes.data || sectionRes.data.length === 0) {
			return {
				code: 404,
				message: '未找到对应的评估部分数据'
			};
		} else {
			sectionRes.data.forEach((section) => {
				sectionIdList.push(section.section_id); // 将每个section_id添加到数组中
			});
		}

		// 2. 迭代sectionIdList，查询每个section_id对应的题目数据

		const questionRes = await db.collection(assessmentQuestionDbName)
			.where({
				section_id: db.command.in(sectionIdList) // 使用in操作符查询多个section_id
			})
			.orderBy('order', 'asc') // 按order字段升序排序
			.limit(1000)
			.get();

		questionRes.data.forEach((question) => {
			question.age_standards.forEach((ageStandard) => {
				if (ageStandard.age === age && ageStandard.expected_score > 0) {
					question.expected_score = ageStandard.expected_score;
					output.push(question);
				}
			});
		})
		// 处理output，按照section_id进行分组，然后往下下面再通过ablls_r_section进行分组，只输出唯一的ablls_r_section和对应的题目数量的长度
		// 先按section_id分组，再按ablls_r_section分组
		const groupedResult = output.reduce((acc, question) => {
			const sectionId = question.section_id;
			const abllsSection = question.ablls_r_section;
			const abllsSectionAlphabet = question.ablls_r_section_alphabet; // 新增的字段，用于区分同一个section_id下的不同ablls_r_section

			if (!acc[sectionId]) {
				acc[sectionId] = {};
			}

			if (!acc[sectionId][abllsSection]) {
				acc[sectionId][abllsSection] = {
					abllsSectionAlphabet: abllsSectionAlphabet,
					sectionName: abllsSection,
					questionCount: 0
				};
			}

			acc[sectionId][abllsSection].questionCount++;
			return acc;
		}, {});

		// 转换为最终输出格式
		const result = Object.entries(groupedResult).map(([sectionId, abllsGroups]) => {
			// 找到对应的section完整数据
			const sectionData = sectionRes.data.find(s => s.section_id === sectionId);
			return {
				...sectionData, // 包含section的所有字段
				abllsSections: Object.values(abllsGroups)
			};
		});

		return {
			code: 200,
			data: {
				assessmentId: assessmentId,
				age: age,
				section: result,
			}
		};

	} catch (error) {
		console.error('查询失败:', error);
		return {
			code: 500,
			message: '服务器内部错误',
			error: error.message
		};
	}
};