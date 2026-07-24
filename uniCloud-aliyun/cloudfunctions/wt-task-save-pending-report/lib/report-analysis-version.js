'use strict'

function buildInitialReportData(reportData) {
	return {
		...reportData,
		analysisRevision: 1
	}
}

module.exports = {
	buildInitialReportData
}
