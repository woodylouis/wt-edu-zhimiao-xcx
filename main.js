import App from './App'
import i18n from './lang/i18n'
import uviewPlus from '@/uni_modules/uview-plus'

// #ifndef VUE3
import Vue from 'vue'
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
	i18n,
	...App
})
app.$mount()
// #endif


// #ifdef VUE3
import { createSSRApp } from 'vue'
import customNav from '@/components/customNav'
export function createApp() {
	const app = createSSRApp(App)
	app.use(i18n)
	app.use(uviewPlus)
	app.component('customNav', customNav)
	return { app }
}
// #endif
