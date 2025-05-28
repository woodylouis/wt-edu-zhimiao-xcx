'use strict';
const uniID = require('uni-id-common')
const dbName = 'wtdb-business-assess-history';
const dbName2 = 'wtdb-business-assess-record';
const db = uniCloud.database();
const collection = db.collection(dbName);
// const reportGen = require('../common/wt-business-report-gen');
exports.main = async (event, context) => {
	try {
		const uniIdInstance = uniID.createInstance({ context });
		const { uid } = await uniIdInstance.checkToken(event.uniIdToken);
		const { recordId, assessmentId, assessorId, childId, confirmToGenerateReport } = event;
		// console.log('confirmToGenerateReport', confirmToGenerateReport)

		// 参数校验
		if (!recordId || !assessmentId || !assessorId || !childId) {
			return {
				code: 400,
				message: '缺少必要参数: recordId, assessmentId, assessorId, childId'
			};
		}

		// 查询条件
		const query = {
			recordId,
			assessmentId,
			assessorId: uid,
			childId,
		};

		// 执行查询
		const resHistory = await collection.where(query).get();
		const resRecord = await db.collection(dbName2).where(query).get();
		const completedSectionList = []


		if (resRecord.data && resRecord.data.length > 0) {
			const modulesStatus = resRecord.data[0].modulesStatus || [];
			const historyRecords = resHistory.data || [];

			const result = {
				completed: [],  // 已完成 1
				inProgress: [], // 进行中 2
				notStarted: []  // 未开始 0
			};

			modulesStatus.forEach(module => {
				const historyRecord = historyRecords.find(
					h => h.sectionId === module.sectionId
				);

				if (historyRecord) {
					if (historyRecord.hasCompleted) {
						result.completed.push(module);
						if (confirmToGenerateReport) {
							historyRecord.sectionName = module.sectionName;
							completedSectionList.push(historyRecord)
						}
					} else {
						result.inProgress.push(module);
					}
				} else {
					result.notStarted.push(module);
				}
			});

			if (confirmToGenerateReport) {
				const sectionSummary = {
					reportVersion: 'v2',
					// sectionName: '语言与沟通技能',
					// sectionId: 'LANG_1',
					// expectedTotalScore: 100,
					// actualTotalScore: 90,
					// abllsSectionSummaryList: [
					// 	{
					// 		abllsSectionName: '命名',
					// 		absllsSectionAlphabet: 'G',
					// 		abllsSectionExpectedScore: 10,
					// 		abbllsSectionActualScore: 8,
					// 		abllsSectionTotalQuestions: 4,
					// 		analyasis: '', // 这里需要通过ai分析
					// 		skillBelowStandard: [
					// 			{
					// 				taskName: '说出强化物的名称',
					// 				taskObject: '学生将能够说出具有强化作用物品的名称。',
					// 				taskContent: '如果给学生看具有强化物作用的物品，你问“那是什么?"他能够辨认该物品吗?',
					// 				currentSituation: '4个名称',
					// 				expectedSituation: '10个名称以上',
					// 				expectedScore: 4,
					// 				actualScore: 3,
					// 			}
					// 		],
					// 		skillReachStandard: [
					// 			{
					// 				taskName: '说出常见物品的名称',
					// 				taskObject: '学生将能够说出至少100件物品，它们都是他的环境中常见的。',
					// 				taskContent: '如果给学生看一个常见的物品，并问：“那是什么?”学生会辨认出该物品吗?',
					// 				currentSituation: '100个以上的物品名称，能够辨认出其中多数物品几种不同的例子(包括新的例子)',
					// 				expectedSituation: '100个以上的物品名称，能够辨认出其中多数物品几种不同的例子(包括新的例子)',
					// 				expectedScore: 4,
					// 				actualScore: 4,
					// 			}
					// 		]
					// 	}
					// ]
				}
				let reportSectionName = ''
				let skillBelowStandard = []
				let subsectionsSummary = []
				if (completedSectionList.length > 0) {
					completedSectionList.forEach(async (item) => {
						// console.log("completedSectionList item", item)
						let abllsSectionSummaryList = []
						let abllsSectionSummary = {}
						item.assessmentRecords.forEach(async (record) => {
							let abllsSectionName = record.sectioName
							let abllsSectionAlphabet = record.alphabet
							let expectedTotalScore = record.expectedTotalScore
							let actualTotalScore = record.actualTotalScore
							let skillBelowStandard = []

							// console.log("completedSectionList item record", record)
							// 找record里questions里的isStandard为false的
							record.questions.forEach(async (question) => {
								// console.log("completedSectionList item record question", question.isStandard)

								let temp = {}
								// 没达到标准的 
								if (!question.isStandard) {
									abllsSectionSummary = {
										abllsSectionName: abllsSectionName,
										abllsSectionAlphabet: abllsSectionAlphabet,
										expectedTotalScore: expectedTotalScore,
										actualTotalScore: actualTotalScore,
									}
									temp = {
										taskName: question.task_name,
										taskObject: question.task_object,
										taskContent: question.content,
										actualOutcome: question.options.find(option => option.selected)?.name || '',
										actualScore: question.score,
										expectedOutcome: (() => {
											const ageStandard = question.age_standards?.find(as => as.age === item.ageInt);
											// console.log("ageStandard", ageStandard)
											if (ageStandard) {
												const matchingOption = question.options.find(opt => opt.score === ageStandard.expected_score);
												return matchingOption?.name || '';
											}
											return '';
										})(),
										expectedScore: question.expected_score
									}
									if (temp) {
										skillBelowStandard.push(temp)
										abllsSectionSummary.skillBelowStandard = skillBelowStandard
									}
								}
							})
							// subsectionsSummary.push(abllsSectionSummary)
							if (Object.keys(abllsSectionSummary).length > 0) {
								// subsectionsSummary.push(abllsSectionSummary)
								// console.log("abllsSectionSummary", abllsSectionSummary)
								abllsSectionSummaryList.push(abllsSectionSummary)
								// console.log("abllsSectionSummaryList", abllsSectionSummaryList)
							}
						})
						sectionSummary.sectionName = item.sectionName
						sectionSummary.abllsSectionSummaryList = abllsSectionSummaryList
						console.log("sectionSummary", sectionSummary)
						console.log("abllsSectionSummaryList", abllsSectionSummaryList)


					})

				}

				// console.log("subsectionsSummary", subsectionsSummary)
				// 去掉空的对象
				// subsectionsSummary = subsectionsSummary.filter(item => Object.keys(item).length > 0)
				// console.log("subsectionsSummary", subsectionsSummary)

				return {
					code: 200,
					data: result,
					message: '报告生成中，请稍后查询'
				};
			} else {
				return {
					code: 200,
					data: result,
					message: '查询成功'
				};
			}

		} else {
			return {
				code: 404,
				data: null,
				message: '未找到评估记录'
			};
		}
	} catch (e) {
		console.error('查询失败:', e);
		return {
			code: 500,
			message: '查询失败: ' + e.message
		};
	}
};

function getFallBehindiTmer(isStandard) {

}