'use strict'

const db = uniCloud.database()
const dbCmd = db.command
const PERSON_COLLECTION = 'wtdb-business-person'
const ACCOUNT_COLLECTION = 'wtdb-business-person-account'
const USER_COLLECTION = 'uni-id-users'
const QUERY_BATCH_SIZE = 500
const ADMIN_APP_ID = '__UNI__B9C18F8'
const MINI_PROGRAM_APP_ID = '__UNI__0FAB82A'

function clean(value, maxLength = 100) {
	return String(value == null ? '' : value).trim().slice(0, maxLength)
}

function compactId(value) {
	if (!value) return ''
	if (typeof value === 'string') return value
	if (value.$oid) return String(value.$oid)
	if (value._id) return compactId(value._id)
	return String(value)
}

function normalizeArray(value) {
	if (!value) return []
	return Array.isArray(value) ? value : [value]
}

function hasIdentityValue(value) {
	if (!value) return false
	if (typeof value === 'string') return Boolean(value.trim())
	if (Array.isArray(value)) return value.some(hasIdentityValue)
	if (typeof value === 'object') return Object.values(value).some(hasIdentityValue)
	return true
}

function accountSource(user = {}) {
	const appIds = normalizeArray(user.dcloud_appid).map(item => String(item || ''))
	const isWechat = appIds.includes(MINI_PROGRAM_APP_ID) || hasIdentityValue(user.wx_openid)
	const isAdmin = appIds.includes(ADMIN_APP_ID) || (!isWechat && Boolean(clean(user.username, 100)))
	if (isWechat && isAdmin) return 'both'
	if (isWechat) return 'wechat'
	if (isAdmin) return 'admin'
	return 'unknown'
}

function fallbackName(user = {}, suppliedName = '') {
	return clean(suppliedName || user.nickname || user.username, 30) || '未设置姓名'
}

function fallbackFor(fallbackNames, userId) {
	if (!fallbackNames) return ''
	if (fallbackNames instanceof Map) return fallbackNames.get(userId) || ''
	return fallbackNames[userId] || ''
}

async function fetchAll(collectionName, where, fields) {
	const result = []
	for (let skip = 0; ; skip += QUERY_BATCH_SIZE) {
		let query = db.collection(collectionName).where(where || {})
		if (fields) query = query.field(fields)
		const res = await query.skip(skip).limit(QUERY_BATCH_SIZE).get()
		const rows = res.data || []
		result.push(...rows)
		if (rows.length < QUERY_BATCH_SIZE) break
	}
	return result
}

async function getUser(userId) {
	const id = compactId(userId)
	if (!id) return null
	const res = await db.collection(USER_COLLECTION)
		.where({ _id: id })
		.field({
			_id: true,
			nickname: true,
			username: true,
			mobile: true,
			dcloud_appid: true,
			wx_openid: true
		})
		.limit(1)
		.get()
	return res.data && res.data[0] || null
}

async function resolveProfiles(userIds, fallbackNames) {
	const ids = [...new Set((userIds || []).map(compactId).filter(Boolean))]
	const result = new Map()
	if (!ids.length) return result

	const [users, links] = await Promise.all([
		fetchAll(USER_COLLECTION, { _id: dbCmd.in(ids) }, {
			_id: true,
			nickname: true,
			username: true,
			mobile: true,
			dcloud_appid: true,
			wx_openid: true
		}),
		fetchAll(ACCOUNT_COLLECTION, { user_id: dbCmd.in(ids) }, {
			_id: true,
			person_id: true,
			user_id: true,
			source: true
		})
	])
	const userMap = new Map(users.map(user => [compactId(user._id), user]))
	const linkMap = new Map(links.map(link => [compactId(link.user_id), link]))
	const directPersonIds = [...new Set(links.map(link => compactId(link.person_id)).filter(Boolean))]
	const mobiles = [...new Set(users.map(user => clean(user.mobile, 30)).filter(Boolean))]
	const [directPersons, mobilePersons] = await Promise.all([
		directPersonIds.length
			? fetchAll(PERSON_COLLECTION, { _id: dbCmd.in(directPersonIds) })
			: [],
		mobiles.length
			? fetchAll(PERSON_COLLECTION, { mobile: dbCmd.in(mobiles) })
			: []
	])
	const personMap = new Map(directPersons.map(person => [compactId(person._id), person]))
	const mobilePersonMap = new Map()
	mobilePersons.forEach(person => {
		const mobile = clean(person.mobile, 30)
		if (mobile && !mobilePersonMap.has(mobile)) mobilePersonMap.set(mobile, person)
	})

	ids.forEach(userId => {
		const user = userMap.get(userId) || {}
		const link = linkMap.get(userId)
		const person = link && personMap.get(compactId(link.person_id)) ||
			mobilePersonMap.get(clean(user.mobile, 30)) || null
		result.set(userId, {
			personId: compactId(person && person._id),
			displayName: clean(person && person.display_name, 30) || fallbackName(user, fallbackFor(fallbackNames, userId)),
			nameConfirmed: Boolean(person && person.name_confirmed),
			mobile: clean(person && person.mobile || user.mobile, 30),
			accountSource: accountSource(user),
			user
		})
	})
	return result
}

async function resolveProfile(userId, suppliedFallback = '') {
	const id = compactId(userId)
	const profiles = await resolveProfiles([id], { [id]: suppliedFallback })
	return profiles.get(id) || {
		personId: '',
		displayName: clean(suppliedFallback, 30) || '未设置姓名',
		nameConfirmed: false,
		mobile: '',
		accountSource: 'unknown',
		user: null
	}
}

async function findLinkedPersonForUsers(users) {
	const userIds = users.map(user => compactId(user._id)).filter(Boolean)
	if (!userIds.length) return null
	const links = await fetchAll(ACCOUNT_COLLECTION, { user_id: dbCmd.in(userIds) }, { person_id: true })
	const personId = links.map(link => compactId(link.person_id)).find(Boolean)
	if (!personId) return null
	const res = await db.collection(PERSON_COLLECTION).doc(personId).get()
	return res.data && res.data[0] || null
}

async function ensureAccountLink(personId, user) {
	const userId = compactId(user && user._id)
	if (!personId || !userId) return
	const existing = await db.collection(ACCOUNT_COLLECTION).where({ user_id: userId }).limit(1).get()
	if (existing.data && existing.data[0]) return
	try {
		await db.collection(ACCOUNT_COLLECTION).add({
			person_id: personId,
			user_id: userId,
			source: accountSource(user),
			create_time: Date.now(),
			update_time: Date.now()
		})
	} catch (error) {
		const retry = await db.collection(ACCOUNT_COLLECTION).where({ user_id: userId }).limit(1).get()
		if (!retry.data || !retry.data[0]) throw error
	}
}

async function ensurePersonForUser(userId, options = {}) {
	const id = compactId(userId)
	if (!id) throw new Error('缺少用户ID')
	const user = await getUser(id)
	if (!user) throw new Error('用户账号不存在')
	const requestedName = clean(options.displayName, 30)
	const actorId = compactId(options.updatedBy || id)
	const mobile = clean(user.mobile, 30)
	let relatedUsers = [user]
	if (mobile) {
		relatedUsers = await fetchAll(USER_COLLECTION, { mobile }, {
			_id: true,
			nickname: true,
			username: true,
			mobile: true,
			dcloud_appid: true,
			wx_openid: true
		})
		if (!relatedUsers.length) relatedUsers = [user]
	}

	let person = await findLinkedPersonForUsers(relatedUsers)
	if (!person && mobile) {
		const personRes = await db.collection(PERSON_COLLECTION).where({ mobile }).limit(1).get()
		person = personRes.data && personRes.data[0] || null
	}
	const now = Date.now()
	if (!person) {
		const addRes = await db.collection(PERSON_COLLECTION).add({
			display_name: fallbackName(user, requestedName),
			mobile,
			name_confirmed: Boolean(requestedName),
			name_source: requestedName ? clean(options.nameSource || 'user_confirmed', 30) : 'legacy_fallback',
			created_by: actorId,
			updated_by: actorId,
			create_time: now,
			update_time: now
		})
		person = {
			_id: addRes.id,
			display_name: fallbackName(user, requestedName),
			mobile,
			name_confirmed: Boolean(requestedName)
		}
	} else if (requestedName && (person.display_name !== requestedName || !person.name_confirmed)) {
		await db.collection(PERSON_COLLECTION).doc(compactId(person._id)).update({
			display_name: requestedName,
			name_confirmed: true,
			name_source: clean(options.nameSource || 'user_confirmed', 30),
			updated_by: actorId,
			update_time: now
		})
		person.display_name = requestedName
		person.name_confirmed = true
	}

	const personId = compactId(person._id)
	for (const relatedUser of relatedUsers) {
		await ensureAccountLink(personId, relatedUser)
	}
	return {
		personId,
		displayName: clean(person.display_name, 30) || fallbackName(user, requestedName),
		nameConfirmed: Boolean(person.name_confirmed),
		mobile,
		accountSource: accountSource(user),
		user
	}
}

async function findUserIdsByDisplayName(keyword) {
	const value = clean(keyword, 50)
	if (!value) return []
	const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const persons = await fetchAll(PERSON_COLLECTION, { display_name: new RegExp(escaped, 'i') }, { _id: true })
	const personIds = persons.map(person => compactId(person._id)).filter(Boolean)
	if (!personIds.length) return []
	const links = await fetchAll(ACCOUNT_COLLECTION, { person_id: dbCmd.in(personIds) }, { user_id: true })
	return [...new Set(links.map(link => compactId(link.user_id)).filter(Boolean))]
}

module.exports = {
	PERSON_COLLECTION,
	ACCOUNT_COLLECTION,
	clean,
	compactId,
	resolveProfile,
	resolveProfiles,
	ensurePersonForUser,
	findUserIdsByDisplayName
}
