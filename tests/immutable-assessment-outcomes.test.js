'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const planService = fs.readFileSync(
	path.join(__dirname, '../uniCloud-aliyun/cloudfunctions/common/intervention-plan-service/index.js'),
	'utf8'
)
const reportSave = fs.readFileSync(
	path.join(__dirname, '../uniCloud-aliyun/cloudfunctions/wt-task-save-pending-report/index.js'),
	'utf8'
)
const reportMerge = fs.readFileSync(
	path.join(__dirname, '../uniCloud-aliyun/cloudfunctions/wt-section-merge-to-report/index.js'),
	'utf8'
)

test('an existing training plan cannot start another AI generation task', () => {
	assert.match(planService, /if \(existing\) \{/)
	assert.match(planService, /PLAN_ALREADY_EXISTS/)
	assert.match(planService, /已生成训练方案；请使用手动调整/)
	assert.doesNotMatch(planService, /if \(existing && forceRegenerate\)/)
})

test('one assessment record maps to one immutable report', () => {
	assert.match(reportSave, /\{ recordId \}/)
	assert.match(reportSave, /该评估已生成报告，不能覆盖/)
	assert.match(reportSave, /existingReport\.sourceTaskId === taskId/)
	assert.match(reportMerge, /reportId: `report_\$\{recordId\}`/)
	assert.doesNotMatch(reportMerge, /targetReportId/)
})
