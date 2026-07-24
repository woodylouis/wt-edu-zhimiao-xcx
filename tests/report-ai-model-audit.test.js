'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const mergeFunction = fs.readFileSync(
	path.join(__dirname, '../uniCloud-aliyun/cloudfunctions/wt-section-merge-to-report/index.js'),
	'utf8'
)
const reportSchema = JSON.parse(fs.readFileSync(
	path.join(__dirname, '../uniCloud-aliyun/database/wtdb-business-assess-report.schema.json'),
	'utf8'
))

test('completed reports persist the actual AI response model', () => {
	assert.match(mergeFunction, /providerId: completion\.providerId/)
	assert.match(mergeFunction, /provider: completion\.provider/)
	assert.match(mergeFunction, /model: completion\.model/)
	assert.match(mergeFunction, /aiModel: reportSummaryResult\.aiModel/)
	assert.equal(reportSchema.properties.aiModel.bsonType, 'object')
	assert.equal(reportSchema.properties.aiModel.properties.model.bsonType, 'string')
})
