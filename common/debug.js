import uniStarterConfig from '@/uni-starter.config.js'

function getConfigDebugFlag() {
	return !!(uniStarterConfig && uniStarterConfig.debug)
}

function getAppDebugFlag() {
	try {
		const app = getApp({ allowDefault: true })
		return !!(app && app.globalData && app.globalData.config && app.globalData.config.debug)
	} catch (_) {
		return false
	}
}

function getSystemDebugFlag() {
	try {
		const systemInfo = uni.getSystemInfoSync && uni.getSystemInfoSync()
		return !!(systemInfo && systemInfo.enableDebug)
	} catch (_) {
		return false
	}
}

function getMiniProgramDevelopFlag() {
	try {
		const accountInfo = uni.getAccountInfoSync && uni.getAccountInfoSync()
		return accountInfo &&
			accountInfo.miniProgram &&
			accountInfo.miniProgram.envVersion === 'develop'
	} catch (_) {
		return false
	}
}

export function isDebugMode() {
	const isDevelopment = typeof process !== 'undefined' &&
		process.env &&
		process.env.NODE_ENV === 'development'

	return !!isDevelopment ||
		getConfigDebugFlag() ||
		getAppDebugFlag() ||
		getSystemDebugFlag() ||
		getMiniProgramDevelopFlag()
}

export function shouldBypassAssessmentLocationCheck() {
	return isDebugMode()
}
