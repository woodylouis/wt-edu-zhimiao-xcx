'use strict';
const uniID = require('uni-id-common')
const dbName = 'wtdb-business-assess-history';
const dbName2 = 'wtdb-business-assess-record';
const db = uniCloud.database();
const collection = db.collection(dbName);

exports.main = async (event, context) => {
	try {
		const uniIdInstance = uniID.createInstance({ context });
		const { uid } = await uniIdInstance.checkToken(event.uniIdToken);
		const { recordId, assessmentId, assessorId, childId, confirmToGenerateReport } = event;

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
				let report = {}
				let sectionSummaryList = []

				if (completedSectionList.length > 0) {
					for (const item of completedSectionList) {
						const { recordId, assessmentId, assessorId, assessorName,
							classId, className, childId, avatar, childName, childAge,
							ageInt, assessmentTitle } = item;

						report = {
							reportVersion: 'v2',
							reportId: `report_ablls_${childId}_${Date.now()}`,
							recordId, assessmentId, assessorId, assessorName,
							classId, className, childId, avatar, childName, childAge,
							ageInt, assessmentTitle
						};

						const abllsSectionSummaryList = [];

						for (const record of item.assessmentRecords) {
							const abllsSectionSummary = {
								abllsSectionName: record.sectioName,
								abllsSectionAlphabet: record.alphabet,
								expectedTotalScore: record.expectedTotalScore,
								actualTotalScore: record.actualTotalScore,
								skillBelowStandard: [],
								skillReachStandard: [],
								analysis: '' // AI分析结果
							};

							for (const question of record.questions) {
								const temp = {
									taskName: question.task_name,
									taskObject: question.task_object,
									taskContent: question.content,
									actualOutcome: question.options.find(option => option.selected)?.name || '',
									actualScore: question.score,
									expectedOutcome: (() => {
										const ageStandard = question.age_standards?.find(as => as.age === item.ageInt);
										if (ageStandard) {
											const matchingOption = question.options.find(opt => opt.score === ageStandard.expected_score);
											return matchingOption?.name || '';
										}
										return '';
									})(),
									expectedScore: question.expected_score
								};

								if (!question.isStandard) {
									abllsSectionSummary.skillBelowStandard.push(temp);
								} else {
									abllsSectionSummary.skillReachStandard.push(temp);
								}
							}

							// 如果有技能需要改进，进行AI分析
							if (abllsSectionSummary.skillBelowStandard.length > 0) {
								try {
									// 调用AI分析函数
									abllsSectionSummary.analysis = await generateAIAnalysis(
										abllsSectionSummary,
										childName,
										childAge
									);
								} catch (aiError) {
									console.error('AI分析失败:', aiError);
									abllsSectionSummary.analysis = '分析暂时无法生成，请稍后重试';
								}

								abllsSectionSummaryList.push(abllsSectionSummary);
							}
						}

						const sectionSummary = {
							sectionName: item.sectionName,
							sectionId: item.sectionId,
							abllsSectionSummaryList
						};

						sectionSummaryList.push(sectionSummary);
					}
				}

				result.report = {
					...report,
					sectionSummaryList
				};

				return {
					code: 200,
					data: result,
					message: '报告生成完成'
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

/**
 * 使用uni-ai生成技能分析报告
 * @param {Object} sectionSummary - 技能评估摘要
 * @param {string} childName - 儿童姓名
 * @param {string} childAge - 儿童年龄
 */
async function generateAIAnalysis(sectionSummary, childName, childAge) {
	try {
		// 初始化LLM管理器，使用DeepSeek模型
		const llmManager = uniCloud.ai.getLLMManager({
			provider: 'deepseek',
			apiKey: 'sk-f6ccfbb5f4c64f19900608a4184e2f4b'
		});

		// 构建分析提示词
		const analysisPrompt = buildAnalysisPrompt(sectionSummary, childName, childAge);

		// 调用AI进行分析
		const res = await llmManager.chatCompletion({
			model: 'deepseek-chat', // 使用deepseek-reasoner模型，专门用于推理和分析
			messages: [
				{
					role: 'system',
					content: `你是一名专业的儿童行为分析师和特殊教育专家，专门分析ABLLS-R（Assessment of Basic Language and Learning Skills - Revised）评估结果。请基于评估数据提供专业、准确、有建设性的分析和建议。分析应该包括：
					1. 当前技能发展状况的客观描述
					2. 具体的改进建议和训练方法
					3. 适合的教学策略和活动建议
					4. 预期的发展目标和时间框架
					请确保建议具体可操作，适合儿童的年龄和发展水平。`
				},
				{
					role: 'user',
					content: analysisPrompt
				}
			],
			tokensToGenerate: 800 // 控制生成长度
		});

		return res.reply || '分析生成失败';

	} catch (error) {
		console.error('AI分析生成失败:', error);
		throw error;
	}
}

/**
 * 构建AI分析的提示词
 */
function buildAnalysisPrompt(sectionSummary, childName, childAge) {
	const { abllsSectionName, skillBelowStandard, skillReachStandard } = sectionSummary;

	let prompt = `请分析${childName}（${childAge}）在"${abllsSectionName}"技能领域的评估结果：\n\n`;

	// 添加已达标技能信息
	if (skillReachStandard && skillReachStandard.length > 0) {
		prompt += `**已达标技能（${skillReachStandard.length}项）：**\n`;
		skillReachStandard.forEach((skill, index) => {
			prompt += `${index + 1}. ${skill.taskName}：${skill.actualOutcome}\n`;
		});
		prompt += '\n';
	}

	// 添加未达标技能信息
	if (skillBelowStandard && skillBelowStandard.length > 0) {
		prompt += `**需要改进的技能（${skillBelowStandard.length}项）：**\n`;
		skillBelowStandard.forEach((skill, index) => {
			prompt += `${index + 1}. **${skill.taskName}**\n`;
			prompt += `   - 任务目标：${skill.taskObject}\n`;
			prompt += `   - 任务内容：${skill.taskContent}\n`;
			prompt += `   - 当前表现：${skill.actualOutcome}\n`;
			prompt += `   - 期望表现：${skill.expectedOutcome}\n`;
			prompt += `   - 得分：${skill.actualScore}/${skill.expectedScore}\n\n`;
		});
	}

	prompt += `请提供专业的分析和具体的改进建议，包括：
1. 对当前技能发展水平的整体评价
2. 每个未达标技能的具体训练方法和步骤
3. 推荐的教学活动和练习方式
4. 家长和老师可以采取的支持策略
5. 预期的改进时间框架和阶段性目标

请确保建议实用、具体，适合${childAge}的儿童。`;

	return prompt;
}

/**
 * 流式AI分析生成（可选实现）
 * 如果需要实时显示分析过程，可以使用此函数
 */
async function generateStreamAIAnalysis(sectionSummary, childName, childAge, sseChannel) {
	try {
		const llmManager = uniCloud.ai.getLLMManager({
			provider: 'deepseek'
		});

		const analysisPrompt = buildAnalysisPrompt(sectionSummary, childName, childAge);

		const res = await llmManager.chatCompletion({
			model: 'deepseek-reasoner', // 使用deepseek-reasoner模型进行推理分析
			messages: [
				{
					role: 'system',
					content: '你是一名专业的儿童行为分析师，请基于ABLLS-R评估结果提供专业分析。'
				},
				{
					role: 'user',
					content: analysisPrompt
				}
			],
			tokensToGenerate: 800,
			stream: true,
			sseChannel: sseChannel // 传入SSE通道用于流式响应
		});

		return {
			errCode: 0,
			message: '分析开始生成'
		};

	} catch (error) {
		console.error('流式AI分析失败:', error);
		throw error;
	}
}