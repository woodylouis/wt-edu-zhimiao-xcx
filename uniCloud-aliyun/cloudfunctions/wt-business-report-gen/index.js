const db = uniCloud.database()
const uuid = require('uni-cloud').uuid

module.exports = {
	async submitReport(mainData) {
		// 数据校验
		const requiredFields = ['assessmentId', 'childId', 'answers', 'duration']
		requiredFields.forEach(field => {
			if (!mainData[field]) throw new Error(`缺少必要字段: ${field}`)
		})

		// 获取关联数据
		const [childRes, assessmentRes, evaluatorRes] = await Promise.all([
			db.collection('wtdb-business-children').doc(mainData.childId).get(),
			db.collection('wtdb-business-assessment').doc(mainData.assessmentId).get(),
			db.collection('uni-id-users').doc(mainData.userId).get()
		])

		// 构建报告文档
		const reportDoc = {
			evaluationId: uuid.v4().replace(/-/g, ''),
			assessmentId: mainData.assessmentId,
			assessmentName: assessmentRes.data[0].name,
			userId: mainData.childId,
			childInfo: {
				name: childRes.data[0].name,
				className: childRes.data[0].className,
				age: childRes.data[0].age
			},
			evaluationInfo: {
				evaluatorName: evaluatorRes.data[0].nickname || '未知',
				evaluatorId: mainData.userId,
				evaluationTime: Date.now(),
				evaluationDuration: mainData.duration
			},
			scores: this.calculateScores(mainData.answers, assessmentRes.data[0]),
			rawAnswers: mainData.answers.map(answer => ({
				questionId: answer.questionId,
				selectedOption: answer.selectedOption,
				responseTime: answer.responseTime
			})),
			systemInfo: {
				createTime: Date.now(),
				updateTime: Date.now(),
				deviceInfo: mainData.deviceInfo
			}
		}

		// 写入数据库
		const result = await db.collection('wtdb-business-assessment-report')
			.add(reportDoc)

		return {
			evaluationId: reportDoc.evaluationId,
			reportPath: `/pages/assessment/report?id=${reportDoc.evaluationId}`
		}
	},

	calculateScores(answers, assessment) {
		// 初始化分数结构
		const scores = {
			totalScore: 0,
			dimensionScores: {},
			scoreRanges: {}
		}

		// 按维度计算分数
		answers.forEach(answer => {
			const question = assessment.questions.find(q => q._id === answer.questionId)
			if (question) {
				scores.totalScore += answer.selectedOption.score
				const dimension = question.section
				scores.dimensionScores[dimension] =
					(scores.dimensionScores[dimension] || 0) + answer.selectedOption.score
			}
		})

		// 计算评分区间
		for (const [dimension, score] of Object.entries(scores.dimensionScores)) {
			const criteria = assessment.scoringCriteria.find(c => c.dimension === dimension)
			scores.scoreRanges[dimension] = this.getScoreRange(score, criteria.ranges)
		}

		return scores
	},

	getScoreRange(score, ranges) {
		const matched = ranges.find(r => score >= r.min && score <= r.max)
		return matched ? matched.level : '未知'
	}
}