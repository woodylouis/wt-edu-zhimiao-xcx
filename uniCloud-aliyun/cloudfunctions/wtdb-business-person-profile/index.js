'use strict'

const uniID = require('uni-id-common')
const businessPerson = require('business-person')

exports.main = async (event = {}, context) => {
	try {
		const uniIdInstance = uniID.createInstance({ context })
		const payload = await uniIdInstance.checkToken(event.uniIdToken)
		if (payload.code) return payload

		const action = event.action || 'get'
		let profile
		if (action === 'get') {
			profile = await businessPerson.resolveProfile(payload.uid)
		} else if (action === 'update') {
			const displayName = businessPerson.clean(event.displayName || event.display_name, 30)
			if (!displayName) return { code: 400, msg: '请填写业务姓名' }
			profile = await businessPerson.ensurePersonForUser(payload.uid, {
				displayName,
				nameSource: 'mini_program_profile'
			})
		} else {
			return { code: 400, msg: '未知操作' }
		}

		return {
			code: 200,
			msg: 'success',
			data: {
				personId: profile.personId || '',
				displayName: profile.displayName || '',
				nameConfirmed: Boolean(profile.nameConfirmed)
			}
		}
	} catch (error) {
		console.error('业务人员档案操作失败:', error)
		return { code: 500, msg: error.message || '业务人员档案操作失败' }
	}
}
