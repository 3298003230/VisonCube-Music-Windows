import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import path from 'node:path'
import zlib from 'node:zlib'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { isSessionUsable, type StoredAuthSession } from '../src/common/utils/authSession.ts'

const readSource = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

// 执行实际音源存储代码；只用内存 Store，避免测试写入用户配置。
const createManagedApiHarness = async(existingApis: object[] = []) => {
  const writes: Array<{ key: string, value: LX.UserApi.UserApiInfoFull[] }> = []
  const source = stripTypeScriptTypes(await readSource('../src/main/modules/userApi/utils.ts'))
    .replace(/^import .*\r?\n/gm, '')
    .replace(/^export /gm, '')
  const api = runInNewContext(source + '\n({ upsertManagedApi, removeManagedApi, getUserApis, getScript })', {
    defaultUserApis: [], STORE_NAMES: { USER_API: 'user_api' }, MANAGED_USER_API_ID: 'managed-test', Buffer, zlib,
    getStore: (name: string) => {
      assert.equal(name, 'user_api')
      return {
        get: (key: string) => { assert.equal(key, 'userApis'); return existingApis },
        set: (key: string, value: LX.UserApi.UserApiInfoFull[]) => {
          writes.push({ key, value: JSON.parse(JSON.stringify(value)) })
        },
      }
    },
  })
  return { api, writes }
}

const managedTestScript = '/*\n * @name Test source\n * @version 1.0\n */\n// fixture only'
const managedTestManifest = { name: 'Managed test source', version: '1.0' }

void test('an unchanged managed source is not persisted again', async() => {
  const { api, writes } = await createManagedApiHarness()
  const first = await api.upsertManagedApi(managedTestScript, managedTestManifest)
  const repeated = await api.upsertManagedApi(managedTestScript, managedTestManifest)
  assert.equal(writes.length, 1)
  assert.equal(repeated, first)
  assert.equal(await api.getScript('managed-test'), managedTestScript)
  await Promise.all([
    api.upsertManagedApi(managedTestScript, managedTestManifest),
    api.upsertManagedApi(managedTestScript, managedTestManifest),
  ])
  assert.equal(writes.length, 1)
  const restored = await createManagedApiHarness(writes[0].value)
  await restored.api.upsertManagedApi(managedTestScript, managedTestManifest)
  assert.equal(restored.writes.length, 0)
})

void test('changed managed source content and metadata are still persisted', async() => {
  const { api, writes } = await createManagedApiHarness()
  await api.upsertManagedApi(managedTestScript, managedTestManifest)
  await api.upsertManagedApi(managedTestScript, { name: 'Renamed source', version: '1.1' })
  assert.equal(writes.length, 2)
  assert.equal(writes[1].value[0].name, 'Renamed source')
  assert.equal(writes[1].value[0].version, '1.1')
  const changedScript = managedTestScript + '\n// new content'
  await api.upsertManagedApi(changedScript, { name: 'Renamed source', version: '1.1' })
  assert.equal(writes.length, 3)
  assert.equal(await api.getScript('managed-test'), changedScript)
  await assert.rejects(api.upsertManagedApi('invalid script', managedTestManifest))
  assert.equal(writes.length, 3)
})

void test('a compression failure retains the previously stored managed source', async t => {
  const { api, writes } = await createManagedApiHarness()
  await api.upsertManagedApi(managedTestScript, managedTestManifest)
  t.mock.method(zlib, 'deflate', (_input: Buffer, callback: (error: Error) => void) => {
    callback(new Error('fixture compression failure'))
  })
  await assert.rejects(api.upsertManagedApi(managedTestScript + '\n// changed', managedTestManifest), /fixture compression failure/)
  assert.equal(writes.length, 1)
  assert.equal(await api.getScript('managed-test'), managedTestScript)
})

void test('removing an absent managed source does not rewrite ordinary sources', async() => {
  const { api, writes } = await createManagedApiHarness([
    { id: 'ordinary', name: 'Imported source', version: '1.0', allowShowUpdateAlert: true, script: 'ordinary fixture' },
  ])
  api.getUserApis()
  api.removeManagedApi()
  assert.equal(writes.length, 0)
  await api.upsertManagedApi(managedTestScript, managedTestManifest)
  api.removeManagedApi()
  assert.equal(writes.length, 2)
  assert.equal(api.getUserApis().length, 1)
  assert.equal(await api.getScript('ordinary'), 'ordinary fixture')
  assert.equal(await api.getScript('managed-test'), '')
  api.removeManagedApi()
  assert.equal(writes.length, 2)
  await api.upsertManagedApi(managedTestScript, managedTestManifest)
  assert.equal(writes.length, 3)
})

void test('the password route loads its existing page only when entered', async() => {
  const loaded: string[] = []
  const source = (await readSource('../src/renderer/router.ts'))
    .replace(/^import .*\r?\n/gm, '')
    .replace(/import\(([^)]+)\)/g, 'loadView($1)')
    .replace(/export default router/, '')
  const router = runInNewContext(source + '\nrouter', {
    createRouter: (options: object) => options,
    createWebHashHistory: () => ({}),
    require: () => ({ default: {} }),
    loadView: async(view: string) => { loaded.push(view); return { default: {} } },
  })
  const passwordRoute = router.routes.find((route: { path: string }) => route.path == '/account/password')
  assert.equal(typeof passwordRoute.component, 'function')
  assert.equal(loaded.length, 0)
  await passwordRoute.component()
  assert.deepEqual(loaded, ['./views/Account/Password.vue'])
  assert.equal(passwordRoute.meta.name, 'Account')
})

void test('removing the managed source clears its persistent cache', async() => {
  const [rendererEvent, managedSource] = await Promise.all([
    readSource('../src/main/modules/winMain/rendererEvent/userApi.ts'),
    readSource('../src/main/modules/userApi/managedSource.ts'),
  ])

  assert.match(managedSource, /export const clearManagedSourceCache\s*=/)
  assert.match(managedSource, /rm\(getCacheDir\(\), \{ recursive: true, force: true \}\)/)
  assert.match(rendererEvent, /apiIds\.includes\(MANAGED_USER_API_ID\)/)
  assert.match(rendererEvent, /await clearManagedSourceCache\(\)/)
})

void test('signing out clears authentication and stops sync without deleting or switching sources', async() => {
  const source = stripTypeScriptTypes(await readSource('../src/renderer/features/auth/state.ts'))
    .replace(/^import .*\r?\n/gm, '').replace(/^export /gm, '')
  const validSession = { token: 'test-token', user: { username: 'test-user' } }
  for (const session of [null, validSession, { ...validSession, expires_at_ms: 1 }]) {
    for (const logoutFails of [false, true]) {
      const calls: string[] = []
      const sourceList = [{ id: 'managed-test' }]
      const userApi = { list: sourceList }
      const api = runInNewContext(source + '\n({ restoreSession, signOut, authSession })', {
        ref: (value: unknown) => ({ value }), computed: (getter: () => unknown) => ({ get value() { return getter() } }),
        isSessionUsable, loadSession: async() => session,
        clearSession: () => calls.push('session-clear'), stopMusicCloudSync: () => calls.push('sync-stop'),
        authApi: { logout: async() => { calls.push('logout'); if (logoutFails) throw new Error('fixture logout failure') } },
        MANAGED_USER_API_ID: 'managed-test', userApi, appSetting: { 'common.apiSource': 'managed-test' },
        apiSourceInfo: [{ id: 'fallback' }],
        removeUserApi: async() => { calls.push('source-remove'); return [] },
        setUserApi: async() => { calls.push('source-switch') },
        performance: { mark: () => {} },
      })
      await api.restoreSession()
      calls.length = 0
      await api.signOut()
      assert.equal(api.authSession.value, null)
      assert.equal(userApi.list, sourceList)
      assert.deepEqual(calls, ['sync-stop', 'session-clear', ...(isSessionUsable(session) ? ['logout'] : [])])
      calls.length = 0
      await api.signOut()
      assert.deepEqual(calls, ['sync-stop', 'session-clear'])
    }
  }
})

void test('managed source update reloads the active script and waits for initialization', async() => {
  const [apiSource, statusListener, updateButton, managedSource] = await Promise.all([
    readSource('../src/renderer/core/apiSource.ts'),
    readSource('../src/renderer/core/useApp/useInitUserApi.ts'),
    readSource('../src/renderer/views/Setting/components/ManagedSourceUpdate.vue'),
    readSource('../src/renderer/features/musicSource/managedSource.ts'),
  ])

  assert.match(apiSource, /prevId == apiId && !reload/)
  assert.match(apiSource, /if \(reload\) \{\s*initTimeoutId = window\.setTimeout/)
  assert.match(apiSource, /initTimeoutId = window\.setTimeout\([\s\S]*?30_000\)/)
  assert.match(statusListener, /apiInfo\.id !== getActiveUserApiId\(\)/)
  assert.match(statusListener, /apiInfo\.id == MANAGED_USER_API_ID && managedSourceStatus\.value\.phase == 'updating'/)
  assert.match(updateButton, /setUserApi\(MANAGED_USER_API_ID, true\)/)
  assert.match(updateButton, /await window\.lx\.apiInitPromise\[0\]/)
  assert.match(updateButton, /managedSourceStatus\.value = \{ phase: 'ready', manifest \}/)
  assert.match(managedSource, /if \(!isCurrentSession\(\)\) throw/)
})

void test('authentication window mode is wired without changing saved window size', async() => {
  const [app, mainWindow, mainIpc, rendererIpc, eventNames, account, authState] = await Promise.all([
    readSource('../src/renderer/App.vue'),
    readSource('../src/main/modules/winMain/main.ts'),
    readSource('../src/main/modules/winMain/rendererEvent/app.ts'),
    readSource('../src/renderer/utils/ipc.ts'),
    readSource('../src/common/ipcNames.ts'),
    readSource('../src/renderer/views/Account/index.vue'),
    readSource('../src/renderer/features/auth/state.ts'),
  ])

  assert.match(app, /if \(ready\) setAuthWindowMode\(loggedIn \? 'main' : 'auth'\)/)
  assert.match(mainWindow, /const width = Math\.min\(460, workArea\.width\)/)
  assert.match(mainWindow, /browserWindow\.setBounds\(normalBounds\)/)
  assert.match(authState, /import \{ isSessionUsable \} from '@common\/utils\/authSession'/)
  assert.match(mainIpc, /WIN_MAIN_RENDERER_EVENT_NAME\.auth_window_mode/)
  assert.match(rendererIpc, /WIN_MAIN_RENDERER_EVENT_NAME\.auth_window_mode/)
  assert.match(eventNames, /auth_window_mode: 'auth_window_mode'/)
  assert.match(account, /-webkit-app-region: drag/)
  assert.doesNotMatch(mainWindow, /update_config\(\{ 'common\.windowSizeId'/)
})

void test('local session validity retains legacy sessions and the expiry safety margin', t => {
  t.mock.method(Date, 'now', () => 1_000_000)
  const session = { token: 'test-token', user: { username: 'test-user' } }
  assert.equal(isSessionUsable(null), false)
  assert.equal(isSessionUsable(undefined), false)
  assert.equal(isSessionUsable({ ...session, token: '' }), false)
  assert.equal(isSessionUsable({ ...session, user: { username: '' } }), false)
  assert.equal(isSessionUsable(session), true)
  assert.equal(isSessionUsable({ ...session, expires_at_ms: 0 }), true)
  assert.equal(isSessionUsable({ ...session, expires_at_ms: -1 }), true)
  assert.equal(isSessionUsable({ ...session, expires_at_ms: 999_999 }), false)
  assert.equal(isSessionUsable({ ...session, expires_at_ms: 1_060_000 }), false)
  assert.equal(isSessionUsable({ ...session, expires_at_ms: 1_060_001 }), true)
})

// 执行真实主窗口模块，只替换 Electron/IPC 等外部依赖，不复制待验证的显示逻辑。
const createWindowHarness = async({
  storedSession = null as StoredAuthSession | null,
  hidden = false,
  fullScreen = false,
  workArea = { x: 0, y: 0, width: 1920, height: 1080 },
  isWindows = true,
  storeFails = false,
  collectTiming = async(_script: string) => '{}',
} = {}) => {
  const windows: FakeWindow[] = []
  const settings = { 'common.windowSizeId': 1, 'common.startInFullscreen': fullScreen, 'common.closeAction': 'ask', 'tray.enable': false }
  const originalSettings = { ...settings }
  let timersScheduled = 0
  const warnings: string[] = []
  const diagnostics: string[] = []
  const timingRequests: Array<{ script: string, visible: boolean }> = []
  class FakeWindow extends EventEmitter {
    bounds = { x: 120, y: 80, width: 1024, height: 640 }
    boundsAtLoad = { ...this.bounds }
    fullscreen = fullScreen
    visible = false
    destroyed = false
    showCount = 0
    webContents = Object.assign(new EventEmitter(), {
      isDestroyed: () => this.destroyed, isCrashed: () => false,
      executeJavaScript: (script: string) => {
        timingRequests.push({ script, visible: this.visible })
        return collectTiming(script)
      },
    })
    constructor() {
      super()
      windows.push(this)
    }
    getNormalBounds() { return { ...this.bounds } }
    isFullScreen() { return this.fullscreen }
    setFullScreen(value: boolean) { this.fullscreen = value }
    setBounds(value: typeof this.bounds) { this.bounds = { ...value } }
    isDestroyed() { return this.destroyed }
    loadURL() { this.boundsAtLoad = { ...this.bounds }; return Promise.resolve() }
    isVisible() { return this.visible }
    isMinimized() { return false }
    focus() {}
    show() { this.visible = true; this.showCount++; this.emit('show') }
    hide() { this.visible = false; this.emit('hide') }
    setThumbarButtons() {}
    setProgressBar() {}
    close() {
      let cancelled = false
      this.emit('close', { preventDefault: () => { cancelled = true } })
      if (!cancelled) { this.destroyed = true; this.visible = false; this.emit('closed') }
    }
  }
  const events = new EventEmitter()
  const appEvents = Object.fromEntries(['created', 'ready_to_show', 'show', 'hide', 'focus', 'blur', 'close'].map(name => [`main_window_${name}`, () => {}]))
  const source = stripTypeScriptTypes(await readSource('../src/main/modules/winMain/main.ts'))
    .replace(/^import .*\r?\n/gm, '')
    .replace(/^export /gm, '')
  const api = runInNewContext(source + '\n({ createWindow, setAuthWindowMode, showWindow, setCloseRendererReady, resolveCloseAction })', {
    BrowserWindow: FakeWindow, dialog: {}, screen: { getDisplayMatching: () => ({ workArea }) },
    session: { fromPartition: () => ({ setProxy: async() => {} }) }, path,
    getWindowSizeInfo: () => ({ width: 1024, height: 640 }), createTaskBarButtons: () => [],
    getPlatform: () => isWindows ? 'windows' : 'mac', isLinux: false, isWin: isWindows,
    log: { warn: (message: string) => warnings.push(message), info: (message: string) => diagnostics.push(message) },
    getProxy: () => undefined, handleOpenDevTools: () => {}, mainSend: () => {},
    WIN_MAIN_RENDERER_EVENT_NAME: { close_request: 'close_request' },
    DATA_KEYS: { authSession: 'authSession' }, STORE_NAMES: { DATA: 'data' }, isSessionUsable,
    getStore: (name: string) => {
      assert.equal(name, 'data')
      if (storeFails) throw new Error('test storage failure')
      return { get: (key: string) => { assert.equal(key, 'authSession'); return storedSession } }
    },
    sendFocus: () => {}, sendTaskbarButtonClick: () => {}, encodePath: (value: string) => value,
    process: { env: { NODE_ENV: 'production' }, uptime: () => 0.5 }, __dirname: '/fixture',
    setTimeout: () => { timersScheduled++; return 1 }, clearTimeout: () => {},
    global: { envParams: { cmdParams: { hidden, dt: true } }, lx: {
      appSetting: settings,
      theme: { shouldUseDarkColors: false, theme: { colors: { '--color-primary-light-1000': '#fff' } } },
      event_app: { ...appEvents, once: events.once.bind(events), update_config: (value: object) => Object.assign(settings, value) },
    } },
  })
  api.createWindow()
  return { api, window: windows[0], settings, originalSettings, warnings, diagnostics, timingRequests, getTimersScheduled: () => timersScheduled }
}

void test('renderer timing collection starts after showing and only includes fixed numeric fields', async() => {
  const performance = {
    now: () => 500,
    getEntriesByType: (type: string) => ({
      navigation: [{ responseEnd: 10, domInteractive: 300, domContentLoadedEventEnd: 310, loadEventEnd: 0, name: 'private-file-path' }],
      resource: [{ initiatorType: 'script', responseEnd: 250, name: 'private-script-url' }, { initiatorType: 'css', responseEnd: 40 }],
    })[type] ?? [],
    getEntriesByName: (name: string) => ['startup:entry', 'first-paint'].includes(name) ? [{ startTime: 260 }] : [],
  }
  const { window, diagnostics, timingRequests, getTimersScheduled } = await createWindowHarness({
    collectTiming: async(script: string) => runInNewContext(script, { performance }),
  })
  assert.equal(timingRequests.length, 0)
  window.emit('ready-to-show')
  assert.equal(timingRequests.length, 1)
  assert.equal(timingRequests[0].visible, true)
  await Promise.resolve()
  const summary = JSON.parse(diagnostics[1].replace('[Startup] Renderer timings: ', ''))
  assert.equal(summary.snapshotMs, 500)
  assert.equal(summary.navigation.responseEnd, 10)
  assert.equal(summary.navigation.loadEventEnd, null)
  assert.equal(summary.scriptResponseEndMs, 250)
  assert.equal(summary.cssResponseEndMs, 40)
  assert.equal(summary.marks['startup:entry'], 260)
  assert.equal(summary.marks['startup:managed-cache:end'], null)
  assert.equal(summary.firstPaintMs, 260)
  assert.doesNotMatch(diagnostics.join('\n'), /private-|token|username/)
  assert.equal(getTimersScheduled(), 0)
  window.emit('ready-to-show')
  assert.equal(timingRequests.length, 1)
})

void test('pending or failed renderer timing collection cannot delay showing or expose errors', async() => {
  const collectors = [
    async() => new Promise<string>(() => {}),
    async() => { throw new Error('private-diagnostic-failure') },
  ]
  for (const [index, collectTiming] of collectors.entries()) {
    const { window, warnings, getTimersScheduled } = await createWindowHarness({ collectTiming })
    window.emit('ready-to-show')
    assert.equal(window.visible, true)
    await Promise.resolve()
    await Promise.resolve()
    assert.deepEqual(warnings, index ? ['[Startup] Renderer timing collection failed.'] : [])
    assert.doesNotMatch(warnings.join('\n'), /private-diagnostic-failure/)
    assert.equal(getTimersScheduled(), 0)
  }
})

void test('renderer timing handles missing entries and skips destroyed or non-Windows renderers', async() => {
  const { window, diagnostics } = await createWindowHarness({
    collectTiming: async(script: string) => runInNewContext(script, {
      performance: { now: () => 0, getEntriesByType: () => [], getEntriesByName: () => [] },
    }),
  })
  window.emit('ready-to-show')
  await Promise.resolve()
  const summary = JSON.parse(diagnostics[1].replace('[Startup] Renderer timings: ', ''))
  assert.equal(summary.navigation, null)
  assert.equal(summary.scriptResponseEndMs, 0)
  assert.equal(summary.cssResponseEndMs, 0)
  assert.equal(summary.firstPaintMs, null)
  assert.ok(Object.values(summary.marks).every(value => value === null))
  for (const options of [{ isWindows: false }, {}]) {
    const harness = await createWindowHarness(options)
    if (options.isWindows !== false) harness.window.destroyed = true
    harness.window.emit('ready-to-show')
    assert.equal(harness.timingRequests.length, 0)
  }
})

void test('renderer entry marks preserve settings and mount order without awaiting session restoration', async() => {
  const calls: string[] = []
  let resolveSetting!: (value: object) => void
  const source = stripTypeScriptTypes(await readSource('../src/renderer/main.ts')).replace(/^import .*\r?\n/gm, '')
  const app = { use() { return app }, mount: (root: string) => { assert.equal(root, '#root'); calls.push('mount') } }
  runInNewContext(source, {
    performance: { mark: (name: string) => calls.push(name) },
    router: { afterEach: () => {} }, getSetting: async() => new Promise(resolve => { resolveSetting = resolve }),
    initSetting: () => calls.push('settings'), restoreSession: async() => new Promise(() => {}),
    createApp: () => app, App: {}, i18nPlugin: {},
    initPlugins: () => calls.push('plugins'), mountComponents: () => calls.push('components'),
    window: { i18n: { availableLocales: ['en-us'], setLanguage() {} }, setLang() {}, screen: { availHeight: 1080, availWidth: 1920 } },
    document: { body: { clientHeight: 600, clientWidth: 1024 } },
  })
  assert.deepEqual(calls, ['startup:entry', 'startup:get-setting:start'])
  resolveSetting({ 'common.langId': 'en-us' })
  // getSetting 的原有 Promise 回调完成后即可挂载，无需等待会话 Promise。
  for (let i = 0; i < 4; i++) await Promise.resolve()
  assert.deepEqual(calls, [
    'startup:entry', 'startup:get-setting:start', 'startup:get-setting:end', 'settings', 'startup:settings-applied',
    'startup:mount:start', 'plugins', 'startup:plugins-ready', 'startup:components:start', 'components', 'startup:components:end', 'mount', 'startup:mount:end',
  ])
})

void test('managed source timing retains hydration order and error propagation', async() => {
  const source = stripTypeScriptTypes(await readSource('../src/renderer/core/useApp/useInitUserApi.ts'))
    .replace(/^import .*\r?\n/gm, '').replace('export default', 'const useInitUserApi =')
  for (const failure of ['', 'cache', 'api']) {
    const calls: string[] = []
    const error = new Error('fixture failure')
    const initialize = runInNewContext(source + '\nuseInitUserApi()', {
      performance: { mark: (name: string) => calls.push(name) },
      useI18n: () => () => '', onUserApiStatus: () => () => {}, onShowUserApiUpdateAlert: () => () => {}, onBeforeUnmount: () => {},
      hydrateManagedSource: async() => { calls.push('cache'); if (failure == 'cache') throw error },
      setUserApi: async(id: string) => { assert.equal(id, 'managed-test'); calls.push('api'); if (failure == 'api') throw error },
      appSetting: { 'common.apiSource': 'managed-test' }, userApi: {},
      getUserApiList: async() => { calls.push('list'); return [] },
    })
    if (failure) await assert.rejects(initialize(), err => err === error)
    else await initialize()
    assert.deepEqual(calls, [
      'startup:managed-cache:start', 'cache', 'startup:managed-cache:end',
      ...(failure == 'cache' ? [] : ['startup:api-load:start', 'api', 'startup:api-load:end', ...(failure ? [] : ['list'])]),
    ])
  }
})

void test('session restoration marks retain empty, invalid and failed storage handling', async() => {
  const source = stripTypeScriptTypes(await readSource('../src/renderer/features/auth/state.ts'))
    .replace(/^import .*\r?\n/gm, '').replace(/^export /gm, '')
  for (const state of ['empty', 'invalid', 'failed']) {
    const calls: string[] = []
    const api = runInNewContext(source + '\n({ restoreSession, authReady, authSession })', {
      ref: (value: unknown) => ({ value }), computed: () => ({}), isSessionUsable,
      performance: { mark: (name: string) => calls.push(name) },
      loadSession: async() => {
        if (state == 'failed') throw new Error('private-storage-error')
        return state == 'invalid' ? { token: '' } : null
      },
      clearSession: () => calls.push('clear'),
    })
    await api.restoreSession()
    assert.equal(api.authReady.value, true)
    assert.equal(api.authSession.value, null)
    assert.deepEqual(calls, ['startup:session-restore:start', ...(state == 'empty' ? [] : ['clear']), 'startup:session-restore:end'])
  }
})

void test('startup diagnostics record timings without session contents or new waits', async() => {
  const { window, diagnostics, getTimersScheduled } = await createWindowHarness({
    storedSession: { token: 'private-test-token', user: { username: 'private-test-user' } },
  })
  assert.equal(diagnostics.length, 0)
  window.emit('ready-to-show')
  assert.equal(window.visible, true)
  assert.equal(diagnostics.length, 1)
  assert.match(diagnostics[0], /^\[Startup\] Window ready-to-show: session=\d+ms; prepare=\d+ms; page=\d+ms; process=500ms$/)
  assert.doesNotMatch(diagnostics.join('\n'), /private-test|token|username/)
  assert.equal(getTimersScheduled(), 0)
})

void test('first window shows at ready-to-show without any renderer authentication reply', async() => {
  for (const storedSession of [null, { token: 'test', user: { username: 'test' }, expires_at_ms: 1 }]) {
    const { window, getTimersScheduled } = await createWindowHarness({ storedSession })
    assert.equal(window.visible, false)
    window.emit('ready-to-show')
    assert.equal(window.visible, true)
    assert.deepEqual(window.boundsAtLoad, { x: 730, y: 240, width: 460, height: 600 })
    assert.equal(getTimersScheduled(), 0)
  }
})

void test('usable local session retains the main window and fullscreen at first paint', async() => {
  for (const fullScreen of [false, true]) {
    const { window } = await createWindowHarness({ storedSession: { token: 'test', user: { username: 'test' } }, fullScreen })
    assert.deepEqual(window.boundsAtLoad, { x: 120, y: 80, width: 1024, height: 640 })
    assert.equal(window.fullscreen, fullScreen)
    window.emit('ready-to-show')
    assert.equal(window.visible, true)
  }
})

void test('a local session read failure falls back to authentication without blocking the window', async() => {
  const { api, window, warnings } = await createWindowHarness({ storeFails: true })
  assert.deepEqual(window.boundsAtLoad, { x: 730, y: 240, width: 460, height: 600 })
  window.emit('ready-to-show')
  assert.equal(window.visible, true)
  assert.equal(warnings.length, 1)
  assert.doesNotMatch(warnings[0], /test storage failure/)
  api.setAuthWindowMode('main')
  assert.deepEqual(window.bounds, { x: 120, y: 80, width: 1024, height: 640 })
})

void test('login and logout restore bounds and fullscreen without persisting size changes', async() => {
  const { api, window, settings, originalSettings } = await createWindowHarness({ fullScreen: true })
  assert.equal(window.fullscreen, false)
  // 提早到达或重复的渲染回调均不能提前显示窗口或覆盖正常尺寸。
  api.setAuthWindowMode('auth')
  assert.equal(window.visible, false)
  window.emit('ready-to-show')
  for (let i = 0; i < 2; i++) {
    api.setAuthWindowMode('main')
    api.setAuthWindowMode('main')
    assert.deepEqual(window.bounds, { x: 120, y: 80, width: 1024, height: 640 })
    assert.equal(window.fullscreen, true)
    api.setAuthWindowMode('auth')
    api.setAuthWindowMode('auth')
    assert.deepEqual(window.bounds, { x: 730, y: 240, width: 460, height: 600 })
    assert.equal(window.fullscreen, false)
  }
  assert.deepEqual(settings, originalSettings)
  assert.equal(window.showCount, 1)
})

void test('hidden startup remains hidden and tray/quit handling still works', async() => {
  const { api, window, settings } = await createWindowHarness({ hidden: true })
  window.emit('ready-to-show')
  api.setAuthWindowMode('main')
  assert.equal(window.visible, false)
  api.showWindow()
  assert.equal(window.visible, true)
  api.setCloseRendererReady()
  window.close()
  api.resolveCloseAction('cancel')
  assert.equal(window.visible, true)
  window.close()
  api.resolveCloseAction('tray')
  assert.equal(window.visible, false)
  assert.equal(window.destroyed, false)
  assert.equal(settings['tray.enable'], true)
  api.showWindow()
  assert.equal(window.visible, true)
  api.resolveCloseAction('quit')
  assert.equal(window.destroyed, true)
  api.setAuthWindowMode('auth')
  assert.equal(window.visible, false)
})

void test('authentication bounds fit small displays and late callbacks do not show twice', async() => {
  const { api, window } = await createWindowHarness({ workArea: { x: -400, y: 30, width: 400, height: 500 } })
  assert.deepEqual(window.boundsAtLoad, { x: -400, y: 30, width: 400, height: 500 })
  window.emit('ready-to-show')
  api.setAuthWindowMode('auth')
  window.emit('ready-to-show')
  assert.equal(window.showCount, 1)
})

void test('non-Windows windows keep their normal bounds and show when ready', async() => {
  const { window } = await createWindowHarness({ isWindows: false })
  assert.deepEqual(window.boundsAtLoad, { x: 120, y: 80, width: 1024, height: 640 })
  window.emit('ready-to-show')
  assert.equal(window.visible, true)
})
