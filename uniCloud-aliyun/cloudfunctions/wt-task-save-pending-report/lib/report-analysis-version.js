'use strict'

function buildInitialReportData(reportData) {
	return {
		...reportData,
		analysisRevision: 1
	}
}

function buildReanalysisVersionUpdate(existingReport, now = Date.now()) {
	const update = {
		analysisRevision: Math.max(1, Number(existingReport?.analysisRevision || 1) + 1)
	}
	if (existingReport?.interventionPlan) {
		update.interventionPlanStatus = 'stale'
		update.interventionPlanStaleReason = '报告已重新AI分析，原训练计划与当前报告不再匹配'
		update.interventionPlanUpdatedAt = now
	}
	return update
}

module.exports = {
	buildInitialReportData,
	buildReanalysisVersionUpdate
}
