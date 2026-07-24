'use strict'

const assert = require('node:assert/strict')
const test = require('node:test')
const {
	buildPrefillHistories,
	countCompatibleAnswers
} = require('../uniCloud-aliyun/cloudfunctions/wt-upload-assess-record/lib/prefill')

const currentQuestions = [
	{
		_id: 'question-a',
		section_id: 'language',
		ablls_r_section_alphabet: 'A',
		ablls_r_section: '语言理解',
		age_standards: [{ age: 4, expected_score: 2 }],
		options: [
			{ text: '不能完成', score: 0 },
			{ text: '提示后完成', score: 1 },
			{ text: '独立完成', score: 2 }
		]
	},
	{
		_id: 'question-b',
		section_id: 'language',
		ablls_r_section_alphabet: 'A',
		ablls_r_section: '语言理解',
		age_standards: [{ age: 4, expected_score: 1 }],
		options: [
			{ text: '不能完成', score: 0 },
			{ text: '可以完成', score: 1 }
		]
	},
	{
		_id: 'question-c',
		section_id: 'social',
		ablls_r_section_alphabet: 'B',
		ablls_r_section: '社会交往',
		age_standards: [{ age: 5, expected_score: 1 }],
		options: [{ text: '可以完成', score: 1 }]
	}
]

const sourceHistoryRows = [{
	assessmentRecords: [{
		alphabet: 'A',
		questions: [
			{
				_id: 'question-a',
				options: [
					{ text: '不能完成', score: 0, selected: false },
					{ text: '提示后完成', score: 1, selected: true }
				]
			},
			{
				_id: 'question-b',
				options: [{ text: '旧版本答案', score: 1, selected: true }]
			}
		]
	}]
}]

test('historical answers prefill a new assessment by stable question and option values', () => {
	const result = buildPrefillHistories({
		currentQuestions,
		sourceHistoryRows,
		age: 4,
		sourceRecordId: 'record-old',
		sourceCompletedAt: 123456
	})

	assert.equal(result.matchedCount, 1)
	assert.equal(result.totalQuestions, 2)
	assert.equal(result.histories.length, 1)
	const group = result.histories[0].assessmentRecords[0]
	assert.equal(group.allQuestionsCompleted, false)
	assert.equal(group.questions.length, 2)

	const matched = group.questions.find(question => question._id === 'question-a')
	assert.equal(matched.prefilled, true)
	assert.equal(matched.reviewStatus, 'pending')
	assert.equal(matched.sourceRecordId, 'record-old')
	assert.equal(matched.options.find(option => option.selected).text, '提示后完成')

	const incompatible = group.questions.find(question => question._id === 'question-b')
	assert.equal(incompatible.prefilled, undefined)
	assert.equal(incompatible.options.some(option => option.selected), false)
})

test('compatibility preview uses the same matching rules as the copied assessment', () => {
	assert.deepEqual(countCompatibleAnswers({
		currentQuestions,
		sourceHistoryRows,
		age: 4
	}), {
		matchedCount: 1,
		totalQuestions: 2
	})
})
