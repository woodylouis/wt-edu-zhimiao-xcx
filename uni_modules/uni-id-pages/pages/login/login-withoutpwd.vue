<!-- 免密登录页 -->
<template>
	<view class="uni-content">
		<view class="page-decoration decoration-coral"></view>
		<view class="page-decoration decoration-purple"></view>
		<view class="page-decoration decoration-yellow"></view>

		<view class="login-brand">
			<view class="brand-mark">芽</view>
			<text class="brand-name">知苗成长</text>
		</view>

		<view class="login-hero">
			<view class="welcome-copy">
				<text class="welcome-kicker">WELCOME BACK</text>
				<text class="welcome-title">一起发现孩子的</text>
				<text class="welcome-title title-highlight">闪光时刻</text>
				<text class="welcome-subtitle">登录后，让每一次成长都被看见</text>
			</view>

			<view class="hero-mascot">
				<view class="mascot-sun"></view>
				<view class="mascot-spark">+</view>
				<view class="mascot-card">
					<view class="mascot-leaf leaf-left"></view>
					<view class="mascot-leaf leaf-right"></view>
					<view class="mascot-face">
						<view class="face-eye"></view>
						<view class="face-eye"></view>
						<view class="face-smile"></view>
					</view>
				</view>
				<view class="growth-chip">+1</view>
			</view>
		</view>

		<view class="login-card">
			<!-- 快捷登录框，当 url 带参数时有效 -->
			<template v-if="['apple', 'weixin', 'weixinMobile'].includes(type)">
				<view class="card-heading">
					<text class="card-title">{{ quickLoginTitle }}</text>
					<text class="card-subtitle">{{ quickLoginSubtitle }}</text>
				</view>

				<view
					v-if="type !== 'weixinMobile'"
					class="quick-login-button"
					:class="{ 'apple-login': type === 'apple' }"
					hover-class="quick-login-pressed"
					:hover-stay-time="80"
					@click="quickLogin"
				>
					<view class="quick-icon-box">
						<image :src="quickIconSrc" mode="aspectFit" class="quick-icon"></image>
					</view>
					<text class="quick-button-text">
						{{ type === 'apple' ? '通过 Apple 登录' : '通过微信登录' }}
					</text>
					<view class="quick-arrow">→</view>
				</view>

				<button
					v-else
					open-type="getPhoneNumber"
					@getphonenumber="quickLogin"
					class="quick-login-button native-quick-button"
					hover-class="quick-login-pressed"
				>
					<view class="quick-icon-box">
						<image :src="quickIconSrc" mode="aspectFit" class="quick-icon"></image>
					</view>
					<text class="quick-button-text">微信授权手机号登录</text>
					<view class="quick-arrow">→</view>
				</button>

				<view class="account-tip">
					<view class="tip-dot"></view>
					<text>账号仅限授权人员登录与鉴权</text>
				</view>
			</template>

			<template v-else>
				<view class="card-heading">
					<text class="card-title">手机号登录</text>
					<text class="card-subtitle">未注册的账号验证通过后将自动注册</text>
				</view>
				<view class="phone-box">
					<view @click="chooseArea" class="area">+86</view>
					<view class="phone-divider"></view>
					<uni-easyinput
						trim="both"
						:focus="focusPhone"
						@blur="focusPhone = false"
						class="input-box"
						type="number"
						:inputBorder="false"
						v-model="phone"
						maxlength="11"
						placeholder="请输入手机号"
					/>
				</view>
				<uni-id-pages-agreements scope="register" ref="agreements"></uni-id-pages-agreements>
				<button
					class="sms-button"
					hover-class="sms-button-pressed"
					:hover-stay-time="80"
					@click="toSmsPage"
				>
					<text>获取验证码</text>
					<view class="sms-arrow">→</view>
				</button>
			</template>
		</view>

		<view class="security-row">
			<view class="security-item"><view class="security-dot dot-green"></view><text>安全登录</text></view>
			<view class="security-divider"></view>
			<view class="security-item"><view class="security-dot dot-coral"></view><text>隐私保护</text></view>
			<view class="security-divider"></view>
			<view class="security-item"><view class="security-dot dot-purple"></view><text>成长陪伴</text></view>
		</view>

		<!-- 固定定位的快捷登录按钮 -->
		<uni-id-pages-fab-login ref="uniFabLogin"></uni-id-pages-fab-login>
	</view>
</template>

<script>
let currentWebview;
import config from '@/uni_modules/uni-id-pages/config.js'
import mixin from '@/uni_modules/uni-id-pages/pages/common/login-page.mixin.js';

export default {
	mixins: [mixin],
	data() {
		return {
			type: "",
			phone: "",
			focusPhone: false
		}
	},
	computed: {
		async loginTypes() {
			return config.loginTypes
		},
		isPhone() {
			return /^1\d{10}$/.test(this.phone);
		},
		quickIconSrc() {
			return this.type === 'apple'
				? '/uni_modules/uni-id-pages/static/app-plus/uni-fab-login/apple.png'
				: '/uni_modules/uni-id-pages/static/login/uni-fab-login/weixin.png'
		},
		quickLoginTitle() {
			return this.type === 'apple' ? 'Apple 快捷登录' : '微信快捷登录'
		},
		quickLoginSubtitle() {
			return '一键授权，轻松进入成长空间'
		}
	},
	async onLoad(e) {
		let type = e.type || config.loginTypes[0]
		this.type = type

		if (type != 'univerify') {
			this.focusPhone = true
		}
		this.$nextTick(() => {
			if (['weixin', 'apple'].includes(type)) {
				this.$refs.uniFabLogin.servicesList = this.$refs.uniFabLogin.servicesList.filter(item =>
					item.id != type)
			}
		})
		uni.$on('uni-id-pages-setLoginType', type => {
			this.type = type
		})
	},
	onShow() {
		// #ifdef H5
		document.onkeydown = event => {
			var e = event || window.event;
			if (e && e.keyCode == 13) {
				this.toSmsPage()
			}
		};
		// #endif
	},
	onUnload() {
		uni.$off('uni-id-pages-setLoginType')
	},
	onReady() {
		// #ifdef APP-PLUS
		if (config.loginTypes.includes('univerify') && this.type == "univerify") {
			uni.preLogin({
				provider: 'univerify',
				success: () => {
					const pages = getCurrentPages();
					currentWebview = pages[pages.length - 1].$getAppWebview();
					currentWebview.setStyle({
						"top": "2000px"
					})
					this.$refs.uniFabLogin.login_before('univerify')
				},
				fail: (err) => {
					console.log(err);
					if (config.loginTypes.length > 1) {
						this.$refs.uniFabLogin.login_before(config.loginTypes[1])
					} else {
						uni.showModal({
							content: err.message,
							showCancel: false
						});
					}
				}
			})
		}
		// #endif
	},
	methods: {
		showCurrentWebview() {
			currentWebview.setStyle({
				"top": 0
			})
		},
		quickLogin(e) {
			let options = {}

			if (e.detail?.code) {
				options.phoneNumberCode = e.detail.code
			}

			if (this.type === 'weixinMobile' && !e.detail?.code) return

			this.$refs.uniFabLogin.login_before(this.type, true, options)
		},
		toSmsPage() {
			if (!this.isPhone) {
				this.focusPhone = true
				return uni.showToast({
					title: "手机号码格式不正确",
					icon: 'none',
					duration: 3000
				});
			}
			if (this.needAgreements && !this.agree) {
				return this.$refs.agreements.popup(this.toSmsPage)
			}
			uni.navigateTo({
				url: '/uni_modules/uni-id-pages/pages/login/login-smscode?phoneNumber=' + this.phone
			});
		},
		toPwdLogin() {
			uni.navigateTo({
				url: '../login/password'
			})
		},
		chooseArea() {
			uni.showToast({
				title: '暂不支持其他国家',
				icon: 'none',
				duration: 3000
			});
		}
	}
}
</script>

<style lang="scss" scoped>
.uni-content {
	position: relative;
	display: flex;
	flex-direction: column;
	min-height: 100vh;
	box-sizing: border-box;
	overflow: hidden;
	padding: 30rpx 42rpx calc(238rpx + env(safe-area-inset-bottom));
	background: linear-gradient(180deg, #fff9e9 0%, #fffdf8 58%, #f4f0ff 100%);
	color: #2f2854;
	font-family: "PingFang SC", "Helvetica Neue", sans-serif;
}

.page-decoration {
	position: absolute;
	border-radius: 50%;
	pointer-events: none;
}

.decoration-coral {
	width: 230rpx;
	height: 230rpx;
	top: 250rpx;
	left: -165rpx;
	background: rgba(255, 125, 107, 0.13);
}

.decoration-purple {
	width: 270rpx;
	height: 270rpx;
	right: -190rpx;
	bottom: 180rpx;
	background: rgba(118, 87, 246, 0.1);
}

.decoration-yellow {
	width: 21rpx;
	height: 21rpx;
	top: 390rpx;
	right: 55rpx;
	background: #ffcf46;
	box-shadow: 30rpx 24rpx 0 rgba(255, 125, 107, 0.62);
}

.login-brand {
	position: relative;
	z-index: 2;
	display: flex;
	align-items: center;
	align-self: flex-start;
}

.brand-mark {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 48rpx;
	height: 48rpx;
	margin-right: 13rpx;
	border: 3rpx solid #2f2854;
	border-radius: 17rpx 17rpx 17rpx 6rpx;
	background: #ffcf46;
	box-shadow: 5rpx 5rpx 0 #2f2854;
	font-size: 24rpx;
	font-weight: 800;
}

.brand-name {
	font-size: 29rpx;
	font-weight: 800;
	letter-spacing: 2rpx;
}

.login-hero {
	position: relative;
	z-index: 2;
	display: flex;
	align-items: center;
	height: 240rpx;
}

.welcome-copy {
	display: flex;
	flex: 1;
	flex-direction: column;
}

.welcome-kicker {
	align-self: flex-start;
	margin-bottom: 13rpx;
	padding: 7rpx 14rpx;
	border-radius: 20rpx;
	background: #eee9ff;
	color: #7657f6;
	font-size: 17rpx;
	font-weight: 800;
	letter-spacing: 2rpx;
	line-height: 1;
}

.welcome-title {
	color: #2f2854;
	font-size: 37rpx;
	font-weight: 800;
	line-height: 1.24;
}

.title-highlight {
	color: #7657f6;
}

.welcome-subtitle {
	margin-top: 13rpx;
	color: #8a839c;
	font-size: 20rpx;
	line-height: 1.45;
}

.hero-mascot {
	position: relative;
	width: 205rpx;
	height: 205rpx;
	flex-shrink: 0;
}

.mascot-sun {
	position: absolute;
	width: 154rpx;
	height: 154rpx;
	top: 27rpx;
	right: 4rpx;
	border: 4rpx solid #2f2854;
	border-radius: 50%;
	background: #ffcf46;
	box-shadow: inset -11rpx -11rpx 0 rgba(255, 145, 63, 0.18);
}

.mascot-card {
	position: absolute;
	top: 45rpx;
	right: 23rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 114rpx;
	height: 122rpx;
	border: 4rpx solid #2f2854;
	border-radius: 38rpx 38rpx 38rpx 13rpx;
	background: #8ee3c2;
	box-shadow: 7rpx 8rpx 0 #2f2854;
	transform: rotate(5deg);
}

.mascot-leaf {
	position: absolute;
	width: 35rpx;
	height: 22rpx;
	top: -19rpx;
	border: 3rpx solid #2f2854;
	background: #4fc294;
}

.leaf-left {
	left: 22rpx;
	border-radius: 32rpx 4rpx 32rpx 4rpx;
	transform: rotate(28deg);
}

.leaf-right {
	right: 19rpx;
	border-radius: 4rpx 32rpx 4rpx 32rpx;
	transform: rotate(-25deg);
}

.mascot-face {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: space-around;
	width: 67rpx;
	height: 60rpx;
	box-sizing: border-box;
	padding: 0 13rpx 12rpx;
	border: 3rpx solid #2f2854;
	border-radius: 50%;
	background: #fffdf8;
}

.face-eye {
	width: 7rpx;
	height: 10rpx;
	border-radius: 50%;
	background: #2f2854;
}

.face-smile {
	position: absolute;
	width: 25rpx;
	height: 12rpx;
	left: 18rpx;
	bottom: 10rpx;
	border-bottom: 4rpx solid #2f2854;
	border-radius: 0 0 20rpx 20rpx;
}

.growth-chip {
	position: absolute;
	right: -1rpx;
	bottom: 18rpx;
	z-index: 4;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 51rpx;
	height: 51rpx;
	border: 3rpx solid #2f2854;
	border-radius: 50%;
	background: #ff7d6b;
	color: #ffffff;
	font-size: 20rpx;
	font-weight: 800;
	transform: rotate(-9deg);
}

.mascot-spark {
	position: absolute;
	top: 15rpx;
	right: 7rpx;
	z-index: 5;
	color: #7657f6;
	font-size: 34rpx;
	font-weight: 800;
	animation: login-sparkle 2s ease-in-out infinite;
}

.login-card {
	position: relative;
	z-index: 3;
	box-sizing: border-box;
	padding: 31rpx;
	border: 4rpx solid #2f2854;
	border-radius: 34rpx;
	background: rgba(255, 255, 255, 0.94);
	box-shadow: 9rpx 10rpx 0 #2f2854;
}

.card-heading {
	display: flex;
	flex-direction: column;
}

.card-title {
	color: #2f2854;
	font-size: 31rpx;
	font-weight: 800;
	line-height: 1.3;
}

.card-subtitle {
	margin-top: 8rpx;
	color: #918a9f;
	font-size: 20rpx;
	line-height: 1.4;
}

.quick-login-button,
.sms-button {
	display: flex;
	align-items: center;
	width: 100%;
	height: 94rpx;
	box-sizing: border-box;
	margin-top: 25rpx;
	padding: 0 18rpx;
	border: 3rpx solid #2f2854;
	border-radius: 25rpx;
	background: #42ce91;
	box-shadow: 6rpx 7rpx 0 #2f2854;
	color: #173d31;
	transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.native-quick-button {
	line-height: normal;
}

.native-quick-button::after,
.sms-button::after {
	border: none;
}

.apple-login {
	background: #252333;
	color: #ffffff;
}

.quick-icon-box {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 58rpx;
	height: 58rpx;
	flex-shrink: 0;
	border: 2rpx solid #2f2854;
	border-radius: 18rpx;
	background: #ffffff;
}

.quick-icon {
	width: 45rpx;
	height: 45rpx;
}

.quick-button-text {
	flex: 1;
	margin-left: 18rpx;
	text-align: left;
	font-size: 27rpx;
	font-weight: 800;
}

.quick-arrow,
.sms-arrow {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36rpx;
	height: 36rpx;
	border-radius: 50%;
	background: #ffffff;
	color: #2f2854;
	font-size: 23rpx;
	font-weight: 800;
}

.quick-login-pressed,
.sms-button-pressed {
	transform: translate(4rpx, 5rpx);
	box-shadow: 2rpx 2rpx 0 #2f2854;
}

.account-tip {
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: 21rpx;
	color: #9690a3;
	font-size: 18rpx;
	line-height: 1.35;
}

.tip-dot {
	width: 10rpx;
	height: 10rpx;
	flex-shrink: 0;
	margin-right: 8rpx;
	border-radius: 50%;
	background: #ff7d6b;
}

.phone-box {
	position: relative;
	display: flex;
	align-items: center;
	height: 94rpx;
	box-sizing: border-box;
	margin-top: 25rpx;
	border: 3rpx solid #2f2854;
	border-radius: 25rpx;
	background: #fff9e9;
	box-shadow: 5rpx 6rpx 0 #ffcf46;
}

.area {
	padding-left: 23rpx;
	color: #2f2854;
	font-size: 26rpx;
	font-weight: 800;
}

.area::after {
	content: "›";
	position: relative;
	display: inline-block;
	margin-left: 6rpx;
	font-size: 26rpx;
	transform: rotate(90deg);
}

.phone-divider {
	width: 2rpx;
	height: 36rpx;
	margin: 0 18rpx;
	background: #d8d0b8;
}

.phone-box ::v-deep .uni-easyinput__content,
.input-box {
	box-sizing: border-box;
	flex: 1;
	height: 82rpx;
	min-height: 82rpx;
	border-radius: 20rpx;
	background: transparent !important;
}

.phone-box ::v-deep .uni-easyinput__content-input {
	padding-left: 0 !important;
	color: #2f2854;
	font-size: 26rpx;
}

.login-card ::v-deep .root {
	margin-top: 20rpx;
	color: #918a9f;
}

.login-card ::v-deep .agreement {
	color: #7657f6;
	font-weight: 600;
}

.login-card ::v-deep .uni-checkbox-input.uni-checkbox-input-checked {
	border-color: #7657f6;
	background: #7657f6;
}

.sms-button {
	justify-content: center;
	margin-bottom: 0;
	background: #7657f6;
	color: #ffffff;
	font-size: 27rpx;
	font-weight: 800;
	line-height: normal;
}

.sms-arrow {
	margin-left: 14rpx;
	color: #7657f6;
}

.security-row {
	position: relative;
	z-index: 2;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: 31rpx;
}

.security-item {
	display: flex;
	align-items: center;
	color: #8d869c;
	font-size: 19rpx;
}

.security-dot {
	width: 9rpx;
	height: 9rpx;
	margin-right: 7rpx;
	border-radius: 50%;
}

.dot-green {
	background: #3ec99a;
}

.dot-coral {
	background: #ff7d6b;
}

.dot-purple {
	background: #7657f6;
}

.security-divider {
	width: 1rpx;
	height: 17rpx;
	margin: 0 18rpx;
	background: #d9d3e5;
}

@keyframes login-sparkle {
	0%,
	100% {
		transform: scale(0.85) rotate(0deg);
		opacity: 0.65;
	}

	50% {
		transform: scale(1.16) rotate(13deg);
		opacity: 1;
	}
}

@media screen and (min-width: 690px) {
	.uni-content {
		width: 520px;
		min-height: 720px;
		margin: 40px auto;
		border: 3px solid #2f2854;
		border-radius: 36px;
		box-shadow: 12px 14px 0 #ffcf46;
	}
}

@media screen and (max-height: 700px) {
	.uni-content {
		padding-top: 22rpx;
		padding-bottom: calc(210rpx + env(safe-area-inset-bottom));
	}

	.login-hero {
		height: 210rpx;
	}

	.hero-mascot {
		transform: scale(0.9);
		transform-origin: right center;
	}

	.login-card {
		padding: 26rpx;
	}
}
</style>
