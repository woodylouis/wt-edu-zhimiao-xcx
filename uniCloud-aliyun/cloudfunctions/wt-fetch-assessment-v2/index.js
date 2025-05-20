'use strict';
const db = uniCloud.database();

exports.main = async (event) => {
	// event = {
	// 	sectionId: 'LANG_1',
	// 	abllsSectionAlphabet: 'I',
	// 	age: 2,
	// };
	const { sectionId, abllsSectionAlphabet, age } = event;
	// const sectionId = 'LANG_1';
	// const abllsSectionAlphabet = 'I';
	// const age = 2;
	if (!sectionId || !abllsSectionAlphabet || age === undefined || age === null || age === '') {
		return {
			code: 400,
			message: '缺少必需参数，请传入sectionId、abllsSectionAlphabet和age参数'
		};
	}
	const assessmentQuestionDbName = 'wtdb-business-assessment-q';
	const output = [];
	try {
		const questionRes = await db.collection(assessmentQuestionDbName)
			.where({
				section_id: sectionId,
				ablls_r_section_alphabet: abllsSectionAlphabet
			})
			.orderBy('ablls_r_section_order', 'asc')
			.get();

		// 把questionRes下的每道题目的age_standards做一个比较，找到age_standards中age为age的expected_score, 只需要保留expected_score > 0的那一到题目，把这些question放到output中
		questionRes.data.forEach((question) => {
			question.age_standards.forEach((ageStandard) => {
				if (ageStandard.age === age && ageStandard.expected_score > 0) {
					question.expected_score = ageStandard.expected_score;
					output.push(question);
				}
			});
		})
		return {
			code: 200,
			data: {
				questions: output,
				totalQuestions: output.length,
				age: age,
				sectionId: sectionId,
				abllsSectionAlphabet: abllsSectionAlphabet
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