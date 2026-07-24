'use strict'

function compactId(value) {
	if (!value) return ''
	if (typeof value === 'string') return value
	if (value.$oid) return String(value.$oid)
	if (value._id) return compactId(value._id)
	return String(value)
}

function optionText(option = {}) {
	return String(option.text || option.name || '').trim()
}

function getSelectedOption(question = {}) {
	return (question.options || []).find(option => option.selected) || null
}

function getExpectedScore(question = {}, age) {
	const standard = (question.age_standards || []).find(item => Number(item.age) === Number(age))
	return Number(standard?.expected_score) || 0
}

function eligibleCurrentQuestions(questions = [], age) {
	return (questions || []).filter(question => getExpectedScore(question, age) > 0)
}

function buildSourceAnswerMap(sourceHistoryRows = []) {
	const result = new Map()
	for (const history of sourceHistoryRows || []) {
		for (const group of history.assessmentRecords || []) {
			for (const question of group.questions || []) {
				const id = compactId(question._id || question.questionId)
				const selected = getSelectedOption(question)
				if (!id || !selected) continue
				result.set(id, {
					text: optionText(selected),
					score: Number(selected.score) || 0
				})
			}
		}
	}
	return result
}

function matchCurrentOption(options = [], sourceAnswer = null) {
	if (!sourceAnswer) return null
	return (options || []).find(option =>
		optionText(option) === sourceAnswer.text &&
		Number(option.score) === Number(sourceAnswer.score)
	) || null
}

function prepareQuestion(question, age, sourceAnswer, sourceMeta) {
	const expectedScore = getExpectedScore(question, age)
	const options = (question.options || [])
		.filter(option => Number(option.score) <= expectedScore)
		.map(option => ({
			...option,
			text: optionText(option),
			name: optionText(option),
			selected: false
		}))
	const matchedOption = matchCurrentOption(options, sourceAnswer)
	if (matchedOption) matchedOption.selected = true

	return {
		...question,
		expected_score: expectedScore,
		options,
		...(matchedOption ? {
			prefilled: true,
			prefillOriginalAnswer: optionText(matchedOption),
			prefillOriginalScore: Number(matchedOption.score) || 0,
			sourceRecordId: sourceMeta.sourceRecordId,
			sourceCompletedAt: sourceMeta.sourceCompletedAt,
			reviewStatus: 'pending',
			reviewedBy: '',
			reviewedAt: 0
		} : {})
	}
}

function buildPrefillHistories({
	currentQuestions = [],
	sourceHistoryRows = [],
	age,
	sourceRecordId,
	sourceCompletedAt = 0
} = {}) {
	const sourceAnswers = buildSourceAnswerMap(sourceHistoryRows)
	const groupsBySection = new Map()
	let matchedCount = 0
	const eligibleQuestions = eligibleCurrentQuestions(currentQuestions, age)

	for (const currentQuestion of eligibleQuestions) {
		const id = compactId(currentQuestion._id || currentQuestion.questionId)
		const sourceAnswer = sourceAnswers.get(id)
		const prepared = prepareQuestion(currentQuestion, age, sourceAnswer, {
			sourceRecordId,
			sourceCompletedAt
		})
		if (prepared.prefilled) matchedCount++

		const sectionId = String(currentQuestion.section_id || '').trim()
		const alphabet = String(currentQuestion.ablls_r_section_alphabet || '').trim()
		if (!sectionId || !alphabet) continue
		if (!groupsBySection.has(sectionId)) groupsBySection.set(sectionId, new Map())
		const sectionGroups = groupsBySection.get(sectionId)
		if (!sectionGroups.has(alphabet)) {
			sectionGroups.set(alphabet, {
				alphabet,
				sectioName: String(currentQuestion.ablls_r_section || '').trim(),
				questions: []
			})
		}
		sectionGroups.get(alphabet).questions.push(prepared)
	}

	const histories = [...groupsBySection.entries()].map(([sectionId, sectionGroups]) => ({
		sectionId,
		assessmentRecords: [...sectionGroups.values()].map(group => {
			const questions = group.questions.sort((left, right) =>
				Number(left.ablls_r_section_order || left.order || 0) -
				Number(right.ablls_r_section_order || right.order || 0)
			)
			return {
				...group,
				questions,
				totalQuestions: questions.length,
				expectedTotalScore: questions.reduce(
					(total, question) => total + Number(question.expected_score || 0),
					0
				),
				actualTotalScore: questions.reduce((total, question) => {
					const selected = getSelectedOption(question)
					return total + (selected ? Number(selected.score) || 0 : 0)
				}, 0),
				allQuestionsCompleted: false
			}
		})
	}))

	return {
		histories,
		matchedCount,
		totalQuestions: eligibleQuestions.length
	}
}

function countCompatibleAnswers({ currentQuestions = [], sourceHistoryRows = [], age } = {}) {
	const sourceAnswers = buildSourceAnswerMap(sourceHistoryRows)
	let matchedCount = 0
	const eligibleQuestions = eligibleCurrentQuestions(currentQuestions, age)
	for (const question of eligibleQuestions) {
		const id = compactId(question._id || question.questionId)
		const expectedScore = getExpectedScore(question, age)
		const options = (question.options || []).filter(option => Number(option.score) <= expectedScore)
		if (matchCurrentOption(options, sourceAnswers.get(id))) matchedCount++
	}
	return { matchedCount, totalQuestions: eligibleQuestions.length }
}

module.exports = {
	buildPrefillHistories,
	countCompatibleAnswers,
	compactId,
	getSelectedOption
}
