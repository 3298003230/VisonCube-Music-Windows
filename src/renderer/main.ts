import '@common/error'
import { createApp } from 'vue'

import './core/globalData'

import '@renderer/event'

// Components
import mountComponents from './components'

// Plugins
import initPlugins from './plugins'
import { i18nPlugin } from './plugins/i18n'

import App from './App.vue'
import router from './router'
// import store from './store'


import { getSetting, updateSetting } from './utils/ipc'
import { langList } from '@root/lang'
import type { I18n } from '@root/lang/i18n'

import { initSetting } from './store/setting'
import { restoreSession } from './features/auth/state'
// import { bubbleCursor } from './utils/cursor-effects/bubbleCursor'

import './worker'
import { saveViewPrevState } from './utils/data'

// sync(store, router)

performance.mark('startup:entry')

router.afterEach((to) => {
  if (to.path != '/songList/detail') {
    saveViewPrevState({
      url: to.path,
      query: { ...to.query },
    })
  }
})

performance.mark('startup:get-setting:start')
void getSetting().then(setting => {
  performance.mark('startup:get-setting:end')
  // window.lx.appSetting = setting
  // Set language automatically
  if (!setting['common.langId'] || !window.i18n.availableLocales.includes(setting['common.langId'])) {
    let langId: I18n['locale'] | null = null
    const locale = window.navigator.language.toLocaleLowerCase() as I18n['locale']
    if (window.i18n.availableLocales.includes(locale)) {
      langId = locale
    } else {
      for (const lang of langList) {
        if (lang.alternate == locale) {
          langId = lang.locale
          break
        }
      }
      langId ??= 'en-us'
    }
    setting['common.langId'] = langId
    void updateSetting({ 'common.langId': langId })
    console.log('Set lang', setting['common.langId'])
  }
  window.setLang(setting['common.langId'])
  window.i18n.setLanguage(setting['common.langId'])

  if (!setting['common.startInFullscreen'] && (document.body.clientHeight > window.screen.availHeight || document.body.clientWidth > window.screen.availWidth) && setting['common.windowSizeId'] > 1) {
    void updateSetting({ 'common.windowSizeId': 1 })
  }

  // store.commit('setSetting', setting)
  initSetting(setting)
  performance.mark('startup:settings-applied')

  void restoreSession()

  performance.mark('startup:mount:start')
  const app = createApp(App)
  app
    .use(router)
    // .use(store)
    .use(i18nPlugin)
  initPlugins(app)
  performance.mark('startup:plugins-ready')
  performance.mark('startup:components:start')
  mountComponents(app)
  performance.mark('startup:components:end')
  app.mount('#root')
  performance.mark('startup:mount:end')
})

// bubbleCursor()
