'use strict';
const uniID = require('uni-id-common')
const dbName = 'wtdb-business-assess-history';
const dbName2 = 'wtdb-business-assess-record';
const dbName3 = 'wtdb-report-tasks'; // 任务状态表
const dbName4 = 'wtdb-business-assess-report'; // 报告表
const dbName5 = 'wtdb-business-children-stats'; // 儿童统计缓存表
const db = uniCloud.database();
const collection = db.collection(dbName);
const deepseek = require('deepseek-client');

async function kickReportTask(taskId) {
	try {
		await uniCloud.callFunction({
			name: 'wt-report-task-orchestrator',
			data: { taskId, kickOnly: true }
		});
	} catch (error) {
		console.error('启动报告后台任务失败:', error);
		await updateTaskStatus(taskId, 'pending', 0, `后台任务等待定时器调度: ${error.message}`);
	}
}

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

		const query = {}
		if (recordId) query.recordId = recordId
		if (assessmentId) query.assessmentId = assessmentId
		if (assessorId) query.assessorId = assessorId
		if (childId) query.childId = childId

		// 执行查询
		const resHistory = await collection.where(query).get();
		const resRecord = await db.collection(dbName2).where(query).get();
		const completedSectionList = []

		if (resRecord.data && resRecord.data.length > 0) {
			const modulesStatus = resRecord.data[0].modulesStatus || [];
			const historyRecords = resHistory.data || [];

			const result = {
				completed: [],
				inProgress: [],
				notStarted: []
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
				// 生成任务ID
				const taskId = `task_${childId}_${Date.now()}`;

				// 创建任务记录，保存原始参数用于重试
				await db.collection(dbName3).add({
					taskId,
					status: 'pending', // pending, processing, completed, failed
					progress: 0,
					childId,
					childName: completedSectionList[0]?.childName,
					recordId,
					assessmentId,
					assessorId,
					totalSections: completedSectionList.length,
					completedSections: 0,
					createTime: Date.now(),
					updateTime: Date.now(),
					logs: [`任务创建：${Date.now()}`],
					originalParams: {
						completedSectionList,
						query
					}
				});

				await kickReportTask(taskId);

				return {
					code: 200,
					data: {
						...result,
						taskId,
						message: '报告生成任务已启动，请稍后查询结果'
					},
					message: '任务已提交，正在后台生成报告'
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
 * 异步生成报告
 */
async function generateReportAsync(taskId, completedSectionList, query) {
	const taskCollection = db.collection(dbName3);

	try {
		// 更新任务状态为处理中
		await updateTaskStatus(taskId, 'processing', 0, '开始生成报告');

		let report = {};
		let sectionSummaryList = [];

		if (completedSectionList.length > 0) {
			for (let i = 0; i < completedSectionList.length; i++) {
				const item = completedSectionList[i];

				// 更新进度
				const progress = Math.floor((i / completedSectionList.length) * 100);
				await updateTaskStatus(taskId, 'processing', progress,
					`正在处理第${i + 1}/${completedSectionList.length}个技能领域: ${item.sectionName}`);

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
				let sectionSkillBelowStandard = []; // 收集整个section的未达标技能

				for (let j = 0; j < item.assessmentRecords.length; j++) {
					const record = item.assessmentRecords[j];

					await updateTaskStatus(taskId, 'processing', progress,
						`处理${item.sectionName} - 第${j + 1}/${item.assessmentRecords.length}个评估记录`);

					const abllsSectionSummary = {
						abllsSectionName: record.sectioName,
						abllsSectionAlphabet: record.alphabet,
						expectedTotalScore: record.expectedTotalScore,
						actualTotalScore: record.actualTotalScore,
						skillBelowStandard: [],
						skillReachStandard: []
					};

					// 处理技能评估数据
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
							sectionSkillBelowStandard.push(temp); // 收集到section级别
						} else {
							abllsSectionSummary.skillReachStandard.push(temp);
						}
					}

					abllsSectionSummaryList.push(abllsSectionSummary);
				}

				// 构建section级别的分析数据
				const sectionSummary = {
					sectionName: item.sectionName,
					sectionId: item.sectionId,
					abllsSectionSummaryList,
					analysis: '' // 将在这里放置分析结果
				};

				// 只对有未达标技能的section进行AI分析
				if (sectionSkillBelowStandard.length > 0) {
					try {
						await updateTaskStatus(taskId, 'processing', progress,
							`正在进行AI分析: ${item.sectionName}`);

						sectionSummary.analysis = await generateSectionAnalysisWithRetry(
							{
								sectionName: item.sectionName,
								skillBelowStandard: sectionSkillBelowStandard
							},
							item.childName,
							item.childAge,
							taskId,
							5 // 最大重试次数
						);

						await updateTaskStatus(taskId, 'processing', progress,
							`AI分析完成: ${item.sectionName}`);

					} catch (aiError) {
						console.error('AI分析最终失败:', aiError);
						await updateTaskStatus(taskId, 'processing', progress,
							`AI分析失败，使用默认分析: ${aiError.message}`);
						// 使用降级分析，确保报告能够完成
						sectionSummary.analysis = generateSectionFallbackAnalysis(
							item.sectionName,
							sectionSkillBelowStandard,
							item.childName
						);
					}
				} else {
					sectionSummary.analysis = `${item.childName}在${item.sectionName}领域的所有技能都已达到年龄标准，表现优秀！建议继续保持并适当增加挑战性活动。`;
				}

				sectionSummaryList.push(sectionSummary);
			}
		}

		// 生成报告级别的总结分析
		let reportAnalysis = '';
		try {
			await updateTaskStatus(taskId, 'processing', 95, '正在生成报告总结分析...');

			// 收集所有技能数据用于总结分析
			const allSkillReachStandard = [];
			const allSkillBelowStandard = [];

			sectionSummaryList.forEach(section => {
				section.abllsSectionSummaryList.forEach(abllsSection => {
					allSkillReachStandard.push(...abllsSection.skillReachStandard);
					allSkillBelowStandard.push(...abllsSection.skillBelowStandard);
				});
			});

			reportAnalysis = await generateReportSummaryWithRetry(
				{
					childName: completedSectionList[0]?.childName,
					childAge: completedSectionList[0]?.childAge,
					skillReachStandard: allSkillReachStandard,
					skillBelowStandard: allSkillBelowStandard,
					sectionsAnalyzed: sectionSummaryList.map(s => s.sectionName)
				},
				taskId,
				3 // 总结分析重试次数较少
			);

			await updateTaskStatus(taskId, 'processing', 98, '报告总结分析完成');

		} catch (error) {
			console.error('报告总结分析失败，使用降级策略:', error);

			// 重新收集数据用于降级分析
			const allSkillReachStandard = [];
			const allSkillBelowStandard = [];
			sectionSummaryList.forEach(section => {
				section.abllsSectionSummaryList.forEach(abllsSection => {
					allSkillReachStandard.push(...abllsSection.skillReachStandard);
					allSkillBelowStandard.push(...abllsSection.skillBelowStandard);
				});
			});

			reportAnalysis = generateReportSummaryFallback(
				completedSectionList[0]?.childName,
				allSkillReachStandard.length,
				allSkillBelowStandard.length,
				sectionSummaryList.map(s => s.sectionName)
			);
		}

		const finalReport = {
			...report,
			sectionSummaryList,
			reportSummary: reportAnalysis // 新增：报告级别总结
		};

		// 关键修改：保存报告和更新状态，使用事务确保一致性
		await updateTaskStatus(taskId, 'processing', 99, '正在保存报告并更新状态...');

		try {
			await saveReportAndUpdateStatus(finalReport, query.recordId, taskId);

			// 保存最终报告并标记任务完成
			await updateTaskStatus(taskId, 'completed', 100, '报告生成完成', finalReport);
		} catch (saveError) {
			console.error('保存报告或更新状态失败:', saveError);
			await updateTaskStatus(taskId, 'failed', 99, `保存报告失败: ${saveError.message}`);
			throw saveError;
		}

	} catch (error) {
		console.error('报告生成失败:', error);
		await updateTaskStatus(taskId, 'failed', 0, `报告生成失败: ${error.message}`);
	}
}

/**
 * 保存报告到数据库并更新评估记录状态
 */
async function saveReportAndUpdateStatus(reportData, recordId, taskId) {
	const reportCollection = db.collection(dbName4);
	const recordCollection = db.collection(dbName2);

	try {
		await updateTaskStatus(taskId, 'processing', 99, '开始保存报告和更新状态');

		// 1. 检查报告是否已存在（基于reportId确保唯一性）
		const existingReport = await reportCollection
			.where({ reportId: reportData.reportId })
			.get();

		if (existingReport.data.length > 0) {
			await updateTaskStatus(taskId, 'processing', 99, `报告已存在，reportId: ${reportData.reportId}`);
			// 如果报告已存在，不需要重复插入，但仍需要更新状态
		} else {
			// 新增报告到 wtdb-business-assess-report 表
			const addResult = await reportCollection.add({
				...reportData,
				createTime: Date.now(),
				updateTime: Date.now()
			});

			if (!addResult.id) {
				throw new Error('报告保存失败：未返回有效的记录ID');
			}

			await updateTaskStatus(taskId, 'processing', 99, `报告保存成功，reportId: ${reportData.reportId}`);
		}

		// 2. 更新 wtdb-business-assess-record 表中的 modulesStatus
		const recordResult = await recordCollection
			.where({ recordId: recordId })
			.get();

		if (recordResult.data.length === 0) {
			throw new Error(`未找到recordId为${recordId}的评估记录`);
		}

		const recordData = recordResult.data[0];
		const modulesStatus = recordData.modulesStatus || [];

		// 将所有 modulesStatus 中的 status 设置为 1
		const updatedModulesStatus = modulesStatus.map(module => ({
			...module,
			status: 1 // 标记为已完成
		}));

		// 更新记录
		const updateResult = await recordCollection
			.where({ recordId: recordId })
			.update({
				modulesStatus: updatedModulesStatus,
				reportStatus: 'completed', // 可选：添加报告状态字段
				reportId: reportData.reportId, // 可选：关联报告ID
				updateTime: Date.now()
			});

		if (updateResult.updated === 0) {
			throw new Error('评估记录状态更新失败：未更新任何记录');
		}

		await updateTaskStatus(taskId, 'processing', 99,
			`评估记录状态更新成功，共更新${updatedModulesStatus.length}个模块状态`);

		await updateTaskStatus(taskId, 'processing', 100, '报告保存和状态更新完成');

		// 3. 更新儿童统计缓存表（重要：优化性能）
		try {
			await updateChildStats(reportData.childId, reportData.classId, reportData.reportId, Date.now());
			await updateTaskStatus(taskId, 'processing', 100, '儿童统计缓存更新完成');
		} catch (statsError) {
			console.error('更新儿童统计失败（不影响报告生成）:', statsError);
		}

		console.log(`报告保存和状态更新成功 - reportId: ${reportData.reportId}, recordId: ${recordId}`);

	} catch (error) {
		console.error('保存报告和更新状态失败:', error);
		await updateTaskStatus(taskId, 'processing', 99, `操作失败: ${error.message}`);

		throw new Error(`保存报告和更新状态失败: ${error.message}`);
	}
}

/**
 * 带重试机制的Section级别AI分析生成
 */
async function generateSectionAnalysisWithRetry(sectionData, childName, childAge, taskId, maxRetries = 5) {
	let attempt = 0;
	let lastError = null;

	// 配置重试参数
	const retryConfig = {
		maxRetries,
		baseDelay: 1000, // 基础延迟1秒
		maxDelay: 30000, // 最大延迟30秒
		backoffMultiplier: 2, // 指数退避倍数
		timeoutMs: 60000 // API调用超时时间60秒
	};

	while (attempt < retryConfig.maxRetries) {
		attempt++;

		try {
			await updateTaskStatus(taskId, 'processing', null,
				`AI分析尝试 ${attempt}/${retryConfig.maxRetries}: ${sectionData.sectionName}`);

			// 调用AI分析，带超时控制
			const result = await Promise.race([
				generateSectionAnalysisCore(sectionData, childName, childAge, taskId, attempt),
				createTimeout(retryConfig.timeoutMs, `AI分析超时 (${retryConfig.timeoutMs}ms)`)
			]);

			// 验证结果质量
			if (validateAnalysisResult(result)) {
				await updateTaskStatus(taskId, 'processing', null,
					`AI分析成功完成 (第${attempt}次尝试): ${sectionData.sectionName}`);
				return result;
			} else {
				throw new Error('AI分析结果质量不符合要求');
			}

		} catch (error) {
			lastError = error;
			console.error(`AI分析第${attempt}次尝试失败:`, error);

			await updateTaskStatus(taskId, 'processing', null,
				`AI分析第${attempt}次尝试失败: ${error.message}`);

			// 如果不是最后一次尝试，则等待后重试
			if (attempt < retryConfig.maxRetries) {
				const delay = calculateRetryDelay(attempt, retryConfig);
				await updateTaskStatus(taskId, 'processing', null,
					`等待${delay}ms后进行第${attempt + 1}次重试...`);
				await sleep(delay);
			}
		}
	}

	// 所有重试都失败，使用降级策略
	console.error(`AI分析最终失败，使用降级策略。最后错误:`, lastError);
	await updateTaskStatus(taskId, 'processing', null,
		`AI分析重试失败，使用模板化分析...`);

	return generateSectionFallbackAnalysis(sectionData.sectionName, sectionData.skillBelowStandard, childName);
}

/**
 * 核心Section级别AI分析功能
 */
async function generateSectionAnalysisCore(sectionData, childName, childAge, taskId, attempt) {
	await updateTaskStatus(taskId, 'processing', null,
		`使用DeepSeek官方API进行AI分析 (第${attempt}次尝试)...`);

	const analysisPrompt = buildSectionAnalysisPrompt(sectionData, childName, childAge);
	return deepseek.chatText({
		messages: [
			{
				role: 'system',
				content: getSectionSystemPrompt()
			},
			{
				role: 'user',
				content: analysisPrompt
			}
		],
		maxTokens: 400,
		timeout: 60000
	});
}

/**
 * 构建Section级别的简化AI分析提示词
 */
function buildSectionAnalysisPrompt(sectionData, childName, childAge) {
	const { sectionName, skillBelowStandard } = sectionData;

	let prompt = `请对${childName}（${childAge}）在"${sectionName}"技能领域的未达标技能进行简短专业的分析：\n\n`;

	prompt += `需要改进的技能：\n`;
	skillBelowStandard.forEach((skill, index) => {
		prompt += `${index + 1}. ${skill.taskName}\n`;
		prompt += `   当前表现：${skill.actualOutcome}\n`;
		prompt += `   期望表现：${skill.expectedOutcome}\n\n`;
	});

	prompt += `请提供一段简短且专业的分析（100-200字），包括：
1. 对这些未达标技能的整体评价
2. 主要问题和改进方向
3. 具体的训练建议

要求：
- 输出纯文本，不使用任何Markdown格式
- 不使用标题、加粗、列表等样式
- 内容简洁明了，适合${childAge}的发展特点
- 一段话完整表达分析结果`;

	return prompt;
}

/**
 * 获取Section级别的系统提示词
 */
function getSectionSystemPrompt() {
	return `你是一名专业的儿童行为分析师和特殊教育专家，专门分析ABLLS-R评估结果。

请提供简短且专业的分析，要求：
1. 分析简洁明了（100-200字）
2. 专业且易懂
3. 具体可操作
4. 考虑儿童年龄特点
5. 重点关注actualOutcome和expectedOutcome的差距

输出要求：
- 只输出纯文本内容
- 不使用任何Markdown格式（如**加粗**、## 标题、- 列表等）
- 不使用特殊符号和样式标记
- 用一段连贯的文字表达完整的分析结果

请确保分析内容实用、有指导价值。`;
}

/**
 * Section级别的降级分析策略
 */
function generateSectionFallbackAnalysis(sectionName, skillBelowStandard, childName) {
	if (!skillBelowStandard || skillBelowStandard.length === 0) {
		return `${childName}在${sectionName}领域表现良好，所有技能均已达标。建议继续保持现有训练强度，适当增加挑战性活动以促进进一步发展。`;
	}

	let analysis = `${childName}在${sectionName}领域共有${skillBelowStandard.length}项技能需要改进。`;

	// 简单分析主要问题
	const skillNames = skillBelowStandard.map(skill => skill.taskName).slice(0, 3);
	if (skillNames.length > 0) {
		analysis += `主要需要加强的技能包括${skillNames.join('、')}等。`;
	}

	analysis += `建议通过系统性训练和个性化指导来逐步提升这些技能，重点关注实际表现与期望表现之间的差距，制定针对性的训练计划。可以采用循序渐进的方式，从简单任务开始，结合孩子的兴趣点进行训练，并及时给予正面反馈和鼓励。`;

	return analysis;
}

/**
 * 计算重试延迟时间（指数退避）
 */
function calculateRetryDelay(attempt, config) {
	const delay = Math.min(
		config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
		config.maxDelay
	);

	// 添加随机抖动，避免多个请求同时重试
	const jitter = Math.random() * 0.1 * delay;
	return Math.floor(delay + jitter);
}

/**
 * 创建超时Promise
 */
function createTimeout(ms, message) {
	return new Promise((_, reject) => {
		setTimeout(() => reject(new Error(message)), ms);
	});
}

/**
 * 休眠函数
 */
function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带重试机制的报告级别总结分析生成
 */
async function generateReportSummaryWithRetry(reportData, taskId, maxRetries = 3) {
	let attempt = 0;
	let lastError = null;

	// 配置重试参数
	const retryConfig = {
		maxRetries,
		baseDelay: 1000,
		maxDelay: 15000,
		backoffMultiplier: 2,
		timeoutMs: 45000
	};

	while (attempt < retryConfig.maxRetries) {
		attempt++;

		try {
			await updateTaskStatus(taskId, 'processing', null,
				`报告总结分析尝试 ${attempt}/${retryConfig.maxRetries}`);

			const result = await Promise.race([
				generateReportSummaryCore(reportData, taskId, attempt),
				createTimeout(retryConfig.timeoutMs, `报告总结分析超时 (${retryConfig.timeoutMs}ms)`)
			]);

			if (validateAnalysisResult(result)) {
				await updateTaskStatus(taskId, 'processing', null,
					`报告总结分析成功完成 (第${attempt}次尝试)`);
				return result;
			} else {
				throw new Error('报告总结分析结果质量不符合要求');
			}

		} catch (error) {
			lastError = error;
			console.error(`报告总结分析第${attempt}次尝试失败:`, error);

			if (attempt < retryConfig.maxRetries) {
				const delay = calculateRetryDelay(attempt, retryConfig);
				await updateTaskStatus(taskId, 'processing', null,
					`等待${delay}ms后进行第${attempt + 1}次重试...`);
				await sleep(delay);
			}
		}
	}

	console.error(`报告总结分析最终失败，使用降级策略。最后错误:`, lastError);
	return generateReportSummaryFallback(
		reportData.childName,
		reportData.skillReachStandard.length,
		reportData.skillBelowStandard.length,
		reportData.sectionsAnalyzed
	);
}

/**
 * 核心报告级别总结分析功能
 */
async function generateReportSummaryCore(reportData, taskId, attempt) {
	await updateTaskStatus(taskId, 'processing', null,
		`使用DeepSeek官方API进行报告总结分析 (第${attempt}次尝试)...`);

	const analysisPrompt = buildReportSummaryPrompt(reportData);
	return deepseek.chatText({
		messages: [
			{
				role: 'system',
				content: getReportSummarySystemPrompt()
			},
			{
				role: 'user',
				content: analysisPrompt
			}
		],
		maxTokens: 500,
		timeout: 45000
	});
}

/**
 * 构建报告级别总结分析的提示词
 */
function buildReportSummaryPrompt(reportData) {
	const { childName, childAge, skillReachStandard, skillBelowStandard, sectionsAnalyzed } = reportData;

	const totalSkills = skillReachStandard.length + skillBelowStandard.length;
	const completionRate = totalSkills > 0 ? Math.round((skillReachStandard.length / totalSkills) * 100) : 0;

	let prompt = `请对${childName}（${childAge}）的ABLLS-R整体评估结果进行专业总结：\n\n`;

	prompt += `评估概况：\n`;
	prompt += `- 评估领域：${sectionsAnalyzed.join('、')}\n`;
	prompt += `- 总技能项目：${totalSkills}项\n`;
	prompt += `- 达标技能：${skillReachStandard.length}项\n`;
	prompt += `- 需改进技能：${skillBelowStandard.length}项\n`;
	prompt += `- 整体达标率：${completionRate}%\n\n`;

	if (skillReachStandard.length > 0) {
		prompt += `已达标技能表现：\n`;
		// 统计达标技能的主要表现类型
		const reachStandardOutcomes = skillReachStandard.map(skill => skill.actualOutcome);
		const outcomeFreq = {};
		reachStandardOutcomes.forEach(outcome => {
			outcomeFreq[outcome] = (outcomeFreq[outcome] || 0) + 1;
		});
		const topOutcomes = Object.entries(outcomeFreq)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 3)
			.map(([outcome, count]) => `${outcome}(${count}项)`)
			.join('、');
		prompt += `主要表现为：${topOutcomes}\n\n`;
	}

	if (skillBelowStandard.length > 0) {
		prompt += `需改进技能分析：\n`;
		skillBelowStandard.slice(0, 5).forEach((skill, index) => {
			prompt += `${index + 1}. ${skill.taskName}：当前${skill.actualOutcome}，期望${skill.expectedOutcome}\n`;
		});
		if (skillBelowStandard.length > 5) {
			prompt += `...等${skillBelowStandard.length}项技能\n`;
		}
		prompt += '\n';
	}

	prompt += `请提供一段简洁专业的整体总结（150-250字），包括：
1. 对整体发展水平的评价
2. 主要优势和需要改进的方面
3. 总体训练建议和发展方向

要求：
- 输出纯文本，不使用任何格式标记
- 内容专业且全面概括
- 适合${childAge}的发展特点
- 为家长和老师提供实用指导`;

	return prompt;
}

/**
 * 获取报告级别总结的系统提示词
 */
function getReportSummarySystemPrompt() {
	return `你是一名资深的儿童发展评估专家，专门进行ABLLS-R综合评估总结。

请提供专业且全面的评估总结，要求：
1. 总结简洁明了（150-250字）
2. 专业权威且易于理解
3. 全面概括各个技能领域的表现
4. 提供实用的综合发展建议
5. 重点关注整体发展模式和优先改进方向

输出要求：
- 只输出纯文本内容
- 不使用任何Markdown格式或特殊符号
- 用连贯的段落表达完整的总结
- 确保内容对家长和教育者具有指导价值`;
}

/**
 * 报告级别的降级总结策略
 */
function generateReportSummaryFallback(childName, reachStandardCount, belowStandardCount, sectionsAnalyzed) {
	const totalSkills = reachStandardCount + belowStandardCount;
	const completionRate = totalSkills > 0 ? Math.round((reachStandardCount / totalSkills) * 100) : 0;

	let summary = `${childName}在本次ABLLS-R评估中，共完成${sectionsAnalyzed.join('、')}等${sectionsAnalyzed.length}个技能领域的评估，总计${totalSkills}项技能测试。`;

	if (completionRate >= 80) {
		summary += `整体表现优秀，${reachStandardCount}项技能已达到年龄标准，显示出良好的发展基础。`;
	} else if (completionRate >= 60) {
		summary += `整体表现良好，${reachStandardCount}项技能已达标，仍有较大提升空间。`;
	} else {
		summary += `目前${reachStandardCount}项技能已达标，需要重点关注和系统训练。`;
	}

	if (belowStandardCount > 0) {
		summary += `其中${belowStandardCount}项技能需要重点改进，建议制定个性化训练计划，采用循序渐进的方式进行系统性提升。`;
	}

	summary += `建议继续保持已达标技能的训练强度，同时针对薄弱环节加强练习，定期评估进展情况，与专业教师密切配合，为孩子创造更多实践机会。`;

	return summary;
}

/**
 * 验证分析结果质量
 */
function validateAnalysisResult(result) {
	if (!result || typeof result !== 'string') {
		return false;
	}

	// 检查最小长度（降低要求，因为是简短分析）
	if (result.length < 50) {
		return false;
	}

	// 检查是否包含关键内容
	const requiredKeywords = ['技能', '改进', '训练', '建议'];
	const hasRequiredContent = requiredKeywords.some(keyword =>
		result.includes(keyword)
	);

	if (!hasRequiredContent) {
		return false;
	}

	// 检查是否是错误信息
	const errorKeywords = ['错误', '失败', '无法', '不能', 'error', 'fail'];
	const hasErrorContent = errorKeywords.some(keyword =>
		result.toLowerCase().includes(keyword.toLowerCase())
	);

	return !hasErrorContent;
}

/**
 * 更新任务状态
 */
async function updateTaskStatus(taskId, status, progress, message, report = null) {
	const taskCollection = db.collection(dbName3);
	const updateData = {
		status,
		progress,
		updateTime: Date.now()
	};

	if (report) {
		updateData.report = report;
	}

	// 添加日志
	const logEntry = `${Date.now()}: ${message}`;

	try {
		// 先获取当前记录
		const currentTask = await taskCollection.where({ taskId }).get();
		if (currentTask.data.length > 0) {
			const currentLogs = currentTask.data[0].logs || [];
			updateData.logs = [...currentLogs, logEntry];
		} else {
			updateData.logs = [logEntry];
		}

		await taskCollection.where({ taskId }).update(updateData);

		// 输出到控制台供后台监控
		console.log(`[任务${taskId}] ${status.toUpperCase()}: ${progress}% - ${message}`);

	} catch (error) {
		console.error('更新任务状态失败:', error);
	}
}

/**
 * 检查并重试失败的AI分析任务
 */
async function retryFailedAnalysisTasks() {
	const taskCollection = db.collection(dbName3);

	try {
		// 查找状态为processing且更新时间超过10分钟的任务
		const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
		const stuckTasks = await taskCollection.where({
			status: 'processing',
			updateTime: db.command.lt(tenMinutesAgo)
		}).get();

		// 查找失败的任务
		const failedTasks = await taskCollection.where({
			status: 'failed'
		}).get();

		const tasksToRetry = [...stuckTasks.data, ...failedTasks.data];

		for (const task of tasksToRetry) {
			console.log(`发现需要重试的任务: ${task.taskId}`);

			// 重置任务状态
			await updateTaskStatus(task.taskId, 'pending', 0, '任务被重新调度');

			// 重新启动任务
			if (task.originalParams) {
				await generateReportAsync(
					task.taskId,
					task.originalParams.completedSectionList,
					task.originalParams.query
				);
			}
		}

		return {
			code: 200,
			message: `发现并重试了 ${tasksToRetry.length} 个任务`,
			retryCount: tasksToRetry.length
		};

	} catch (error) {
		console.error('重试失败任务时出错:', error);
		return {
			code: 500,
			message: '重试失败任务时出错: ' + error.message
		};
	}
}

/**
 * 获取任务状态和进度
 */
async function getTaskStatus(taskId) {
	const taskCollection = db.collection(dbName3);

	try {
		const result = await taskCollection.where({ taskId }).get();

		if (result.data.length > 0) {
			const task = result.data[0];
			return {
				code: 200,
				data: {
					taskId: task.taskId,
					status: task.status,
					progress: task.progress,
					createTime: task.createTime,
					updateTime: task.updateTime,
					logs: task.logs || [],
					report: task.report || null,
					totalSections: task.totalSections,
					completedSections: task.completedSections
				},
				message: '查询成功'
			};
		} else {
			return {
				code: 404,
				message: '任务不存在'
			};
		}
	} catch (error) {
		console.error('查询任务状态失败:', error);
		return {
			code: 500,
			message: '查询失败: ' + error.message
		};
	}
}

/**
 * 手动重试特定任务的AI分析
 */
async function manualRetryTask(taskId) {
	const taskCollection = db.collection(dbName3);

	try {
		const taskResult = await taskCollection.where({ taskId }).get();

		if (taskResult.data.length === 0) {
			return {
				code: 404,
				message: '任务不存在'
			};
		}

		const task = taskResult.data[0];

		// 重试整个任务
		await updateTaskStatus(taskId, 'pending', 0, '手动重试整个任务');

		if (task.originalParams) {
			await generateReportAsync(
				taskId,
				task.originalParams.completedSectionList,
				task.originalParams.query
			);
		}

		return {
			code: 200,
			message: '重试任务已启动'
		};

	} catch (error) {
		console.error('手动重试任务失败:', error);
		return {
			code: 500,
			message: '重试失败: ' + error.message
		};
	}
}

/**
 * 清理过期的任务记录
 */
async function cleanupExpiredTasks(daysOld = 30) {
	const taskCollection = db.collection(dbName3);

	try {
		const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

		const result = await taskCollection.where({
			createTime: db.command.lt(cutoffDate),
			status: db.command.in(['completed', 'failed'])
		}).remove();

		return {
			code: 200,
			message: `清理了 ${result.deleted} 个过期任务记录`,
			deletedCount: result.deleted
		};

	} catch (error) {
		console.error('清理过期任务失败:', error);
		return {
			code: 500,
			message: '清理失败: ' + error.message
		};
	}
}

// 如果需要导出辅助函数供其他云函数调用
// exports.retryFailedAnalysisTasks = retryFailedAnalysisTasks;
// exports.getTaskStatus = getTaskStatus;
// exports.manualRetryTask = manualRetryTask;
// exports.cleanupExpiredTasks = cleanupExpiredTasks;

/**
 * 更新儿童统计缓存表
 * 在报告生成成功后调用，用于优化列表页面加载性能
 */
async function updateChildStats(childId, classId, reportId, completionTime) {
	const statsCollection = db.collection(dbName5);
	const reportCollection = db.collection(dbName4);

	try {
		// 1. 查询该儿童的报告总数
		const countRes = await reportCollection
			.where({ childId: childId })
			.count();
		const reportCount = countRes.total;

		// 2. 检查统计记录是否存在
		const existingStats = await statsCollection
			.where({ childId: childId })
			.get();

		const statsData = {
			childId,
			classId,
			reportCount,
			latestReportTime: completionTime,
			latestReportId: reportId,
			updateTime: Date.now()
		};

		if (existingStats.data.length > 0) {
			// 更新现有记录
			await statsCollection
				.where({ childId: childId })
				.update(statsData);
		} else {
			// 创建新记录
			await statsCollection.add(statsData);
		}

		console.log(`儿童统计更新成功 - childId: ${childId}, reportCount: ${reportCount}`);

	} catch (error) {
		console.error('更新儿童统计失败:', error);
		throw error;
	}
}
