'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const core = require('../uniCloud-aliyun/cloudfunctions/common/wechat-subscribe-service/core')

function read(relativePath) {
	return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8')
}

test('uses the two approved one-time subscription templates', () => {
	assert.equal(
		core.TEMPLATES[core.TEMPLATE_KEYS.ASSESSMENT_REMINDER].id,
		'wbFkmIdPNgpDfLPEGjudl3QMJXuWtxSZd9mzkZVPKZ0'
	)
	assert.equal(
		core.TEMPLATES[core.TEMPLATE_KEYS.REPORT_RESULT].id,
		'VlSHDV8Vz0fiR4oV0plxOJlSwjAgLcueTP3pIV4F5AE'
	)
})

test('one assessment record gets stable one-time grant and message event identities', () => {
	const first = core.stableId('wxgrant', 'teacher-1:record-1:assessment_reminder')
	const second = core.stableId('wxgrant', 'teacher-1:record-1:assessment_reminder')
	const anotherRound = core.stableId('wxgrant', 'teacher-1:record-2:assessment_reminder')
	assert.equal(first, second)
	assert.notEqual(first, anotherRound)
})

test('subscription decisions map WeChat results without treating refusal as consent', () => {
	assert.equal(core.normalizeDecision('accept'), 'accepted')
	assert.equal(core.normalizeDecision('acceptWithAudio'), 'accepted')
	assert.equal(core.normalizeDecision('reject'), 'rejected')
	assert.equal(core.normalizeDecision('ban'), 'banned')
	assert.equal(core.normalizeDecision('filter'), 'filtered')
	assert.equal(core.normalizeDecision('anything-else'), 'error')
})

test('unfinished assessment reminder uses approved keywords and contains no child identity', () => {
	const message = core.buildReminderMessage({
		recordId: 'record-1',
		assessmentTitle: '儿童成长评估',
		childName: '不应出现的姓名',
		createTime: Date.UTC(2026, 8, 9, 0, 0),
		plannedEndTime: Date.UTC(2026, 8, 12, 0, 0)
	})
	assert.equal(message.eventType, 'assessment_reminder')
	assert.equal(message.data.phrase2.value, '未完成')
	assert.ok(message.data.thing1.value)
	assert.ok(message.data.time4.value)
	assert.ok(message.data.thing5.value)
	assert.doesNotMatch(JSON.stringify(message), /不应出现的姓名/)
})

test('one report grant produces either a success or failure terminal message', () => {
	const record = { recordId: 'record-1', assessmentTitle: '儿童成长评估' }
	const success = core.buildReportMessage({
		taskId: 'task-1',
		status: 'completed',
		report: { reportId: 'report-1' },
		endTime: Date.now()
	}, record)
	const failure = core.buildReportMessage({
		taskId: 'task-1',
		status: 'failed',
		endTime: Date.now()
	}, record)
	assert.equal(success.eventType, 'report_succeeded')
	assert.equal(success.data.phrase2.value, '生成成功')
	assert.match(success.page, /report-v2/)
	assert.equal(failure.eventType, 'report_failed')
	assert.equal(failure.data.phrase2.value, '生成失败')
	assert.match(failure.page, /afterAssess/)
})

test('assessment lifecycle uses a database due time and one daily reminder trigger', () => {
	const startSource = read('uniCloud-aliyun/cloudfunctions/wt-upload-assess-record/index.js')
	const progressSource = read('uniCloud-aliyun/cloudfunctions/wtdb-upload-assess-history/index.js')
	const reportSource = read('uniCloud-aliyun/cloudfunctions/wt-business-report-gen-v2/index.js')
	const reminderService = read('uniCloud-aliyun/cloudfunctions/common/wechat-subscribe-service/index.js')
	const reportOrchestrator = read('uniCloud-aliyun/cloudfunctions/wt-report-task-orchestrator/index.js')
	const cronSource = read('uniCloud-aliyun/cloudfunctions/wtdb-wechat-reminder-cron/index.js')
	const cronConfig = JSON.parse(read('uniCloud-aliyun/cloudfunctions/wtdb-wechat-reminder-cron/package.json'))

	assert.match(startSource, /assessmentStatus: 'started'/)
	assert.match(startSource, /plannedEndTime: now \+ \(3 \* DAY_MS\)/)
	assert.match(progressSource, /assessmentStatus: allModulesCompleted \? 'completed' : 'in_progress'/)
	assert.match(progressSource, /nextReminderAt: now \+ REMINDER_DELAY_MS/)
	assert.match(progressSource, /next_check_time: now \+ REMINDER_DELAY_MS/)
	assert.match(reportSource, /reportStatus: 'generating'/)
	assert.match(reminderService, /next_check_time: dbCmd\.lte\(now\)/)
	assert.match(cronSource, /processDueReminderGrants\(200\)/)
	assert.match(reportOrchestrator, /handleReportTerminal\(task\)/)
	assert.equal(
		cronConfig['cloudfunction-config'].triggers[0].config,
		'0 1 0 * * * *'
	)
	assert.equal(
		fs.existsSync(path.join(
			__dirname,
			'..',
			'uniCloud-aliyun/cloudfunctions/wtdb-wechat-message-cron/package.json'
		)),
		false
	)
})

test('client binds each subscription decision to the current assessment record', () => {
	const client = read('common/wechat-subscribe.js')
	const service = read('uniCloud-aliyun/cloudfunctions/common/wechat-subscribe-service/index.js')
	const modulePage = read('pages/assessment/listMoudules.vue')
	const formPage = read('pages/assessment/form.vue')
	assert.match(client, /recordId,[\s\S]*templateKey,[\s\S]*nativeResult/)
	assert.match(client, /action: "grant-status"/)
	assert.match(service, /\['accepted', 'consumed'\]\.includes\(oldGrant\.status\)/)
	assert.match(modulePage, /ASSESSMENT_REMINDER[\s\S]*recordId/)
	assert.match(formPage, /REPORT_RESULT[\s\S]*recordId: assessmentMeta\.recordId/)
})
