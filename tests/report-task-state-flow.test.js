'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

function readCloudFunction(name) {
	return fs.readFileSync(
		path.join(__dirname, `../uniCloud-aliyun/cloudfunctions/${name}/index.js`),
		'utf8'
	)
}

const dispatcher = readCloudFunction('wt-section-task-dispatcher')
const worker = readCloudFunction('wt-section-analysis-worker')
const merger = readCloudFunction('wt-section-merge-to-report')

test('dispatch keeps the report in analysis until every module succeeds', () => {
	assert.match(dispatcher, /status: 'processing',[\s\S]*totalSections: completedSections\.length/)
	assert.doesNotMatch(dispatcher, /dispatcher-task-mark-waiting-merge/)
	assert.match(worker, /activeCount > 0[\s\S]*updateData\.status = 'processing'/)
	assert.match(worker, /analysisList\.length !== totalSections \|\| doneCount !== totalSections/)
	assert.match(worker, /updateData\.status = 'waiting_merge'/)
})

test('failed modules make the whole report fail with module names', () => {
	assert.match(worker, /buildFailedSectionReason/)
	assert.match(worker, /sectionName \|\| item\.sectionId/)
	assert.match(worker, /failedSections\.length > 0[\s\S]*updateData\.status = 'failed'/)
	assert.match(merger, /buildFailedSectionReason\(failedSections\)/)
	assert.match(merger, /status: 'failed'/)
})

test('merge rejects incomplete analysis and returns premature merge tasks to analysis', () => {
	assert.match(merger, /pendingSections\.length[\s\S]*status: 'processing'/)
	assert.match(merger, /analysisList\.length !== expectedTotal \|\| doneCount !== expectedTotal/)
	assert.match(merger, /模块分析结果不完整，无法合并/)
})
