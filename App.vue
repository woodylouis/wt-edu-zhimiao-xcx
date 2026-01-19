<script>
import initApp from '@/common/appInit.js';
import openApp from '@/common/openApp.js';
// #ifdef H5
openApp() //创建在h5端全局悬浮引导用户下载app的功能
// #endif
import checkIsAgree from '@/pages/uni-agree/utils/uni-agree.js';
import uniIdPageInit from '@/uni_modules/uni-id-pages/init.js';
import { ALPHABET_AGE_MAP } from '@/lib/types/local_storage.js';

export default {
	globalData: {
		searchText: '',
		appVersion: {},
		config: {},
		$i18n: {},
		$t: {},
		newlyCreatedStudentIds: [], // 刚刚创建的学生ID列表
	},
	onLaunch: function () {
		console.log('App Launch')
		this.globalData.$i18n = this.$i18n
		this.globalData.$t = str => this.$t(str)
		initApp();
		uniIdPageInit()
		// #ifdef MP-WEIXIN
		this.checkMiniProgramUpdate();
		this.fetchAbllsStandardByAge();
		// #endif

		// #ifdef APP
		//checkIsAgree(); APP端暂时先用原生默认生成的。目前，自定义方式启动vue界面时，原生层已经请求了部分权限这并不符合国家的法规
		// #endif

		// #ifdef H5
		// checkIsAgree(); // 默认不开启。目前全球，仅欧盟国家有网页端同意隐私权限的需要。如果需要可以自己去掉注视后生效
		// #endif

		// #ifdef APP-PLUS
		//idfa有需要的用户在应用首次启动时自己获取存储到storage中
		/*var idfa = '';
		var manager = plus.ios.invoke('ASIdentifierManager', 'sharedManager');
		if(plus.ios.invoke(manager, 'isAdvertisingTrackingEnabled')){
			var identifier = plus.ios.invoke(manager, 'advertisingIdentifier');
			idfa = plus.ios.invoke(identifier, 'UUIDString');
			plus.ios.deleteObject(identifier);
		}
		plus.ios.deleteObject(manager);
		console.log('idfa = '+idfa);*/
		// #endif
	},
	onShow: function () {
		console.log('App Show')
	},
	onHide: function () {
		console.log('App Hide')
	},
	methods: {
		checkMiniProgramUpdate() {
			if (uni.canIUse('getUpdateManager')) {
				const updateManager = uni.getUpdateManager();

				updateManager.onCheckForUpdate((res) => {
					console.log('版本信息', res);
					console.log('是否有新版本：', res.hasUpdate);
				});

				updateManager.onUpdateReady(() => {
					uni.showModal({
						title: '更新提示',
						content: '发现新版本，是否立即重启应用？',
						success: (res) => {
							if (res.confirm) {
								updateManager.applyUpdate();
							}
						}
					});
				});

				updateManager.onUpdateFailed(() => {
					uni.showToast({
						title: '新版本下载失败',
						icon: 'none'
					});
				});
			}
		},
		async fetchAbllsStandardByAge() {
			const res = await uniCloud.callFunction({
				name: 'wtdb-ablls-standard-by-age',
			});
			if (res.result && res.result.code == 200) {
				const rawData = res.result.data
				console.log("fetchAbllsStandardByAge res", rawData)
				const alphabetAgeMap = {}
				rawData.forEach(item => {
					const letter = item.alphabet
					alphabetAgeMap[letter] = {
						2: item.age2,
						3: item.age3,
						4: item.age4,
						5: item.age5,
						6: item.age6,
						7: item.age7
					}
				})

				// 存入缓存
				uni.setStorageSync(ALPHABET_AGE_MAP, alphabetAgeMap)

				console.log('缓存已写入成功')
			}
		}
	}
}
</script>

<style lang="scss">
/*每个页面公共css */
@import "@/uni_modules/uview-plus/index.scss";
</style>
