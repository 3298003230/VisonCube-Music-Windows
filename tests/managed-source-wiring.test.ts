import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { isSessionUsable, type StoredAuthSession } from '../src/common/utils/authSession.ts'

const readSource = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

void test('removing the managed source clears its persistent cache', async() => {
  const [rendererEvent, managedSource, authState] = await Promise.all([
    readSource('../src/main/modules/winMain/rendererEvent/userApi.ts'),
    readSource('../src/main/modules/userApi/managedSource.ts'),
    readSource('../src/renderer/features/auth/state.ts'),
  ])

  assert.match(managedSource, /export const clearManagedSourceCache\s*=/)
  assert.match(managedSource, /rm\(getCacheDir\(\), \{ recursive: true, force: true \}\)/)
  assert.match(rendererEvent, /apiIds\.includes\(MANAGED_USER_API_ID\)/)
  assert.match(rendererEvent, /await clearManagedSourceCache\(\)/)
  assert.match(authState, /await removeUserApi\(\[MANAGED_USER_API_ID\]\)/)
  assert.match(authState, /await setUserApi\(fallback\.id\)/)
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
} = {}) => {
  const windows: FakeWindow[] = []
  const settings = { 'common.windowSizeId': 1, 'common.startInFullscreen': fullScreen, 'common.closeAction': 'ask', 'tray.enable': false }
  const originalSettings = { ...settings }
  let timersScheduled = 0
  const warnings: string[] = []
  class FakeWindow extends EventEmitter {
    bounds = { x: 120, y: 80, width: 1024, height: 640 }
    boundsAtLoad = { ...this.bounds }
    fullscreen = fullScreen
    visible = false
    destroyed = false
    showCount = 0
    webContents = Object.assign(new EventEmitter(), { isDestroyed: () => false, isCrashed: () => false })
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
    log: { warn: (message: string) => warnings.push(message) },
    getProxy: () => undefined, handleOpenDevTools: () => {}, mainSend: () => {},
    WIN_MAIN_RENDERER_EVENT_NAME: { close_request: 'close_request' },
    DATA_KEYS: { authSession: 'authSession' }, STORE_NAMES: { DATA: 'data' }, isSessionUsable,
    getStore: (name: string) => {
      assert.equal(name, 'data')
      if (storeFails) throw new Error('test storage failure')
      return { get: (key: string) => { assert.equal(key, 'authSession'); return storedSession } }
    },
    sendFocus: () => {}, sendTaskbarButtonClick: () => {}, encodePath: (value: string) => value,
    process: { env: { NODE_ENV: 'production' } }, __dirname: '/fixture',
    setTimeout: () => { timersScheduled++; return 1 }, clearTimeout: () => {},
    global: { envParams: { cmdParams: { hidden, dt: true } }, lx: {
      appSetting: settings,
      theme: { shouldUseDarkColors: false, theme: { colors: { '--color-primary-light-1000': '#fff' } } },
      event_app: { ...appEvents, once: events.once.bind(events), update_config: (value: object) => Object.assign(settings, value) },
    } },
  })
  api.createWindow()
  return { api, window: windows[0], settings, originalSettings, warnings, getTimersScheduled: () => timersScheduled }
}

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
