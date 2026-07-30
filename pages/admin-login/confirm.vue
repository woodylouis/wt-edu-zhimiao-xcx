<template>
	<view class="page">
		<view class="decor decor-yellow"></view>
		<view class="decor decor-purple"></view>

		<view class="brand">
			<view class="brand-mark">智</view>
			<view>
				<text class="brand-name">知苗成长</text>
				<text class="brand-caption">后台安全登录确认</text>
			</view>
		</view>

		<view class="card">
			<view class="shield" :class="`shield--${status}`">
				<text>{{ status === 'success' ? '✓' : status === 'error' ? '!' : '锁' }}</text>
			</view>
			<text class="title">{{ title }}</text>
			<text class="description">{{ description }}</text>

			<view v-if="status === 'ready'" class="identity-box">
				<text class="identity-heading">已匹配手机号 {{ accountIdentifier || '当前微信账号' }}</text>
				<view v-for="identity in identities" :key="identity.key" class="identity-row">
					<view class="identity-icon">{{ identity.type === 'school' ? '校' : identity.type === 'system' ? '超' : '业' }}</view>
					<view class="identity-copy">
						<text class="identity-name">{{ identity.displayName || displayName || '未设置昵称' }}</text>
						<text class="identity-label">{{ identity.label }}</text>
						<text class="identity-description">{{ identity.description }}</text>
					</view>
				</view>
				<text class="identity-tip">确认后，请回到电脑端选择本次要进入的身份；进入后台后仍可切换。</text>
			</view>

			<button
				v-if="status === 'ready'"
				class="primary-button"
				:loading="confirming"
				:disabled="confirming"
				@click="confirmLogin"
			>
				确认登录电脑端
			</button>
			<button v-else-if="status === 'unauthenticated'" class="primary-button" @click="goLogin">
				先用微信登录小程序
			</button>
			<button v-else-if="status === 'error'" class="secondary-button" @click="inspectSession">
				重新核验
			</button>

			<view class="safety-note">
				<view class="safety-dot"></view>
				<text>请只确认由你本人在电脑上发起的登录</text>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				sessionId: '',
				status: 'loading',
				displayName: '',
				accountIdentifier: '',
				identities: [],
				confirming: false,
				inspecting: false,
				errorMessage: ''
			}
		},
		computed: {
			title() {
				if (this.status === 'ready') return '确认登录管理后台'
				if (this.status === 'unauthenticated') return '请先登录知苗成长'
				if (this.status === 'success') return '已确认登录'
				if (this.status === 'error') return '暂时无法确认'
				return '正在核验登录请求'
			},
			description() {
				if (this.status === 'ready') return '电脑端正在等待你的确认'
				if (this.status === 'unauthenticated') return '登录后会自动返回此页面继续确认'
				if (this.status === 'success') return '请回到电脑端继续选择身份'
				if (this.status === 'error') return this.errorMessage || '二维码可能已经失效'
				return '请稍候，不要关闭此页面'
			}
		},
		onLoad(options = {}) {
			this.sessionId = String(options.scene || options.sessionId || '').trim().toLowerCase()
			if (!this.sessionId) {
				this.status = 'error'
				this.errorMessage = '没有找到扫码登录会话，请回到电脑端重新扫码'
				return
			}
			this.inspectSession()
		},
		onShow() {
			if (this.sessionId && ['loading', 'unauthenticated'].includes(this.status)) {
				this.inspectSession()
			}
		},
		methods: {
			hasValidLogin() {
				const token = uni.getStorageSync('uni_id_token')
				const expired = Number(uni.getStorageSync('uni_id_token_expired')) || 0
				return !!token && expired > Date.now()
			},
			async callScanLogin(action) {
				const { result } = await uniCloud.callFunction({
					name: 'wtdb-admin-scan-login',
					data: {
						action,
						sessionId: this.sessionId,
						uniIdToken: uni.getStorageSync('uni_id_token')
					}
				})
				if (!result || result.code !== 200) {
					const error = new Error((result && (result.msg || result.message)) || '登录确认服务暂不可用')
					error.code = result && result.code
					throw error
				}
				return result.data || {}
			},
			async inspectSession() {
				if (this.inspecting || !this.sessionId) return
				if (!this.hasValidLogin()) {
					this.status = 'unauthenticated'
					return
				}
				this.inspecting = true
				this.status = 'loading'
				try {
					const data = await this.callScanLogin('inspect')
					this.displayName = data.displayName || ''
					this.accountIdentifier = data.accountIdentifier || ''
					this.identities = data.identities || []
					this.status = 'ready'
				} catch (error) {
					if (error.code === 401) {
						uni.removeStorageSync('uni_id_token')
						uni.setStorageSync('uni_id_token_expired', 0)
						this.status = 'unauthenticated'
					} else {
						this.status = 'error'
						this.errorMessage = error.message || '登录请求核验失败'
					}
				} finally {
					this.inspecting = false
				}
			},
			goLogin() {
				const returnUrl = `/pages/admin-login/confirm?sessionId=${encodeURIComponent(this.sessionId)}`
				uni.navigateTo({
					url: `/uni_modules/uni-id-pages/pages/login/login-withoutpwd?type=weixin&uniIdRedirectUrl=${encodeURIComponent(returnUrl)}`
				})
			},
			async confirmLogin() {
				if (this.confirming) return
				this.confirming = true
				try {
					await this.callScanLogin('confirm')
					this.status = 'success'
					uni.showToast({ title: '已确认，请返回电脑端', icon: 'success' })
				} catch (error) {
					this.status = 'error'
					this.errorMessage = error.message || '确认失败，请重新扫码'
				} finally {
					this.confirming = false
				}
			}
		}
	}
</script>

<style lang="scss" scoped>
	.page { position: relative; min-height: 100vh; box-sizing: border-box; padding: 64rpx 34rpx; overflow: hidden; background: #fff8e9; }
	.decor { position: absolute; border-radius: 50%; }
	.decor-yellow { top: -100rpx; right: -80rpx; width: 300rpx; height: 300rpx; background: #ffd84d; }
	.decor-purple { bottom: -150rpx; left: -100rpx; width: 360rpx; height: 360rpx; background: rgba(108, 76, 255, .18); }
	.brand { position: relative; z-index: 1; display: flex; align-items: center; max-width: 680rpx; margin: 0 auto 42rpx; }
	.brand-mark { display: flex; align-items: center; justify-content: center; width: 88rpx; height: 88rpx; margin-right: 22rpx; border: 5rpx solid #28233c; border-radius: 26rpx; color: #28233c; background: #ffd84d; box-shadow: 8rpx 8rpx 0 #ff795d; font-size: 38rpx; font-weight: 900; transform: rotate(-4deg); }
	.brand-name, .brand-caption, .title, .description, .identity-heading, .identity-name, .identity-label, .identity-description, .identity-tip { display: block; }
	.brand-name { color: #28233c; font-size: 38rpx; font-weight: 900; }
	.brand-caption { margin-top: 6rpx; color: #847d8c; font-size: 22rpx; }
	.card { position: relative; z-index: 1; display: flex; align-items: center; max-width: 680rpx; box-sizing: border-box; margin: 0 auto; padding: 52rpx 38rpx 38rpx; border: 5rpx solid #fff; border-radius: 42rpx; flex-direction: column; background: rgba(255, 255, 255, .97); box-shadow: 0 30rpx 80rpx rgba(67, 49, 96, .15); }
	.shield { display: flex; align-items: center; justify-content: center; width: 108rpx; height: 108rpx; border-radius: 34rpx; color: #fff; background: #6c4cff; box-shadow: 0 12rpx 0 #ded6ff; font-size: 44rpx; font-weight: 900; }
	.shield--success { background: #2cbe60; box-shadow: 0 12rpx 0 #c9f0d6; }
	.shield--error { background: #ef765e; box-shadow: 0 12rpx 0 #f9d1c8; }
	.title { margin-top: 36rpx; color: #28233c; font-size: 42rpx; font-weight: 900; text-align: center; }
	.description { margin-top: 14rpx; color: #817a89; font-size: 26rpx; line-height: 1.7; text-align: center; }
	.identity-box { width: 100%; box-sizing: border-box; margin-top: 34rpx; padding: 28rpx; border-radius: 28rpx; background: #f8f5ff; }
	.identity-heading { margin-bottom: 18rpx; color: #4b405d; font-size: 25rpx; font-weight: 800; }
	.identity-row { display: flex; align-items: center; margin-top: 14rpx; padding: 18rpx; border: 2rpx solid #ebe5f3; border-radius: 20rpx; background: #fff; }
	.identity-icon { display: flex; align-items: center; justify-content: center; width: 66rpx; height: 66rpx; flex: 0 0 66rpx; border-radius: 20rpx; color: #5f45ce; background: #eee9ff; font-size: 24rpx; font-weight: 900; }
	.identity-copy { min-width: 0; margin-left: 18rpx; }
	.identity-name { color: #28233c; font-size: 28rpx; font-weight: 900; }
	.identity-label { margin-top: 4rpx; color: #5f566a; font-size: 23rpx; font-weight: 800; }
	.identity-description { margin-top: 6rpx; color: #948d9c; font-size: 20rpx; line-height: 1.5; }
	.identity-tip { margin-top: 20rpx; color: #756d7e; font-size: 21rpx; line-height: 1.7; }
	.primary-button, .secondary-button { width: 100%; height: 94rpx; margin: 36rpx 0 0; border: 4rpx solid #28233c; border-radius: 26rpx; font-size: 28rpx; font-weight: 900; line-height: 88rpx; }
	.primary-button { color: #fff; background: #6c4cff; box-shadow: 0 10rpx 0 #ffd84d; }
	.secondary-button { color: #5b42c7; background: #fff; box-shadow: 0 10rpx 0 #e4dcff; }
	.primary-button::after, .secondary-button::after { display: none; }
	.safety-note { display: flex; align-items: center; margin-top: 38rpx; color: #9b95a1; font-size: 21rpx; }
	.safety-dot { width: 12rpx; height: 12rpx; margin-right: 12rpx; border-radius: 50%; background: #49dcb1; box-shadow: 0 0 0 8rpx rgba(73, 220, 177, .14); }
</style>
