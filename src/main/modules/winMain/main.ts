import { BrowserWindow, dialog, screen, session } from 'electron'
import path from 'node:path'
import { createTaskBarButtons, getWindowSizeInfo } from './utils'
import { getPlatform, isLinux, isWin, log } from '@common/utils'
import { getProxy, openDevTools as handleOpenDevTools } from '@main/utils'
import { mainSend } from '@common/mainIpc'
import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames'
import { DATA_KEYS, STORE_NAMES } from '@common/constants'
import { isSessionUsable, type StoredAuthSession } from '@common/utils/authSession'
import getStore from '@main/utils/store'
import { sendFocus, sendTaskbarButtonClick } from './rendererEvent'
import { encodePath } from '@common/utils/electron'

let browserWindow: Electron.BrowserWindow | null = null
let isCloseRendererReady = false
let isClosePromptPending = false
let isReadyToShow = false
let hasShownInitially = false
let windowMode: 'auth' | 'main' | null = null
let normalBounds: Electron.Rectangle | null = null
let wasFullScreen = false

const showInitialWindow = () => {
  if (!browserWindow || !isReadyToShow || hasShownInitially || global.envParams.cmdParams.hidden) return
  hasShownInitially = true
  showWindow()
  setThumbarButtons()
}

export const setAuthWindowMode = (mode: 'auth' | 'main') => {
  if (!isWin || !browserWindow || browserWindow.isDestroyed() || windowMode == mode) return

  if (mode == 'auth') {
    normalBounds = browserWindow.getNormalBounds()
    wasFullScreen = browserWindow.isFullScreen()
    if (wasFullScreen) browserWindow.setFullScreen(false)
    const workArea = screen.getDisplayMatching(normalBounds).workArea
    const width = Math.min(460, workArea.width)
    const height = Math.min(600, workArea.height)
    browserWindow.setBounds({
      x: workArea.x + Math.round((workArea.width - width) / 2),
      y: workArea.y + Math.round((workArea.height - height) / 2),
      width,
      height,
    })
  } else if (normalBounds) {
    browserWindow.setBounds(normalBounds)
    if (wasFullScreen) browserWindow.setFullScreen(true)
    normalBounds = null
    wasFullScreen = false
  }
  windowMode = mode
  showInitialWindow()
}

type CloseAction = 'tray' | 'quit' | 'cancel'

const handleCloseAction = (action: CloseAction) => {
  isClosePromptPending = false
  if (!browserWindow || browserWindow.isDestroyed() || action == 'cancel') return

  if (action == 'quit') {
    global.lx.isSkipTrayQuit = true
    browserWindow.close()
    return
  }

  if (!global.lx.appSetting['tray.enable']) {
    global.lx.event_app.update_config({ 'tray.enable': true })
  }
  browserWindow.hide()
}

const requestCloseAction = () => {
  if (!browserWindow || browserWindow.isDestroyed()) return
  if (!isCloseRendererReady || browserWindow.webContents.isDestroyed() || browserWindow.webContents.isCrashed()) {
    global.lx.isSkipTrayQuit = true
    browserWindow.close()
    return
  }
  if (isClosePromptPending) return

  isClosePromptPending = true
  try {
    mainSend(browserWindow, WIN_MAIN_RENDERER_EVENT_NAME.close_request)
  } catch {
    isClosePromptPending = false
    global.lx.isSkipTrayQuit = true
    browserWindow.close()
  }
}

const winEvent = () => {
  if (!browserWindow) return

  browserWindow.on('close', event => {
    if (global.lx.isSkipTrayQuit) {
      browserWindow!.setProgressBar(-1)
      global.lx.event_app.main_window_close()
      return
    }

    if (!isWin) return

    const closeAction = global.lx.appSetting['common.closeAction']
    if (closeAction == 'quit') {
      global.lx.isSkipTrayQuit = true
      browserWindow!.setProgressBar(-1)
      global.lx.event_app.main_window_close()
      return
    }
    if (closeAction == 'tray') {
      event.preventDefault()
      if (!global.lx.appSetting['tray.enable']) global.lx.event_app.update_config({ 'tray.enable': true })
      browserWindow!.hide()
      return
    }

    event.preventDefault()
    requestCloseAction()
  })

  browserWindow.on('closed', () => {
    browserWindow = null
    isCloseRendererReady = false
    isClosePromptPending = false
    isReadyToShow = false
    hasShownInitially = false
    windowMode = null
    normalBounds = null
    wasFullScreen = false
  })

  // browserWindow.on('restore', () => {
  //   browserWindow.webContents.send('restore')
  // })
  browserWindow.on('focus', () => {
    sendFocus()
    global.lx.event_app.main_window_focus()
  })

  browserWindow.on('blur', () => {
    global.lx.event_app.main_window_blur()
  })

  browserWindow.once('ready-to-show', () => {
    isReadyToShow = true
    showInitialWindow()
    global.lx.event_app.main_window_ready_to_show()
  })

  global.lx.event_app.once('main_window_inited', () => {
    isCloseRendererReady = true
  })
  browserWindow.webContents.on('render-process-gone', () => {
    isCloseRendererReady = false
    isClosePromptPending = false
  })

  browserWindow.on('show', () => {
    global.lx.event_app.main_window_show()

    // 修复隐藏窗口后再显示时任务栏按钮丢失的问题
    setThumbarButtons()
  })
  browserWindow.on('hide', () => {
    global.lx.event_app.main_window_hide()
  })
}


export const createWindow = () => {
  const startedAt = Date.now()
  let sessionReadMs = 0
  closeWindow()
  isReadyToShow = false
  hasShownInitially = false
  windowMode = null
  normalBounds = null
  wasFullScreen = false
  const windowSizeInfo = getWindowSizeInfo(global.lx.appSetting['common.windowSizeId'])

  const { shouldUseDarkColors, theme } = global.lx.theme
  const ses = session.fromPartition('persist:win-main')
  const proxy = getProxy()
  setSesProxy(ses, proxy?.host, proxy?.port)

  /**
   * Initial window options
   */
  const options: Electron.BrowserWindowConstructorOptions = {
    height: windowSizeInfo.height,
    useContentSize: true,
    width: windowSizeInfo.width,
    frame: false,
    transparent: !global.envParams.cmdParams.dt,
    hasShadow: global.envParams.cmdParams.dt,
    // enableRemoteModule: false,
    // icon: join(global.__static, isWin ? 'icons/256x256.ico' : 'icons/512x512.png'),
    resizable: false,
    maximizable: false,
    fullscreenable: true,
    roundedCorners: global.envParams.cmdParams.dt,
    show: false,
    webPreferences: {
      session: ses,
      nodeIntegrationInWorker: true,
      contextIsolation: false,
      webSecurity: false,
      nodeIntegration: true,
      sandbox: false,
      enableWebSQL: false,
      webgl: false,
      spellcheck: false, // 禁用拼写检查器
    },
  }
  if (global.envParams.cmdParams.dt) options.backgroundColor = theme.colors['--color-primary-light-1000']
  if (global.lx.appSetting['common.startInFullscreen']) {
    options.fullscreen = true
    if (isLinux) options.resizable = true
  }
  browserWindow = new BrowserWindow(options)

  if (isWin) {
    // 用同一份本地会话预先确定首屏尺寸，避免窗口等待渲染层回传；登录状态仍由渲染层恢复。
    let mode: 'auth' | 'main' = 'auth'
    const sessionReadStartedAt = Date.now()
    try {
      const storedSession = getStore(STORE_NAMES.DATA).get<StoredAuthSession | null>(DATA_KEYS.authSession)
      if (isSessionUsable(storedSession)) mode = 'main'
    } catch {
      log.warn('Unable to read the initial window session; the renderer will restore authentication.')
    }
    sessionReadMs = Date.now() - sessionReadStartedAt
    setAuthWindowMode(mode)
  }

  const pageLoadStartedAt = Date.now()
  const winURL = process.env.NODE_ENV !== 'production' ? 'http://localhost:9080' : `file://${path.join(encodePath(__dirname), 'index.html')}`
  void browserWindow.loadURL(winURL + `?os=${getPlatform()}&dt=${global.envParams.cmdParams.dt}&dark=${shouldUseDarkColors}&theme=${encodeURIComponent(JSON.stringify(theme))}`)

  winEvent()
  // 首屏就绪后再记录分段耗时，避免诊断日志本身阻塞页面加载。
  browserWindow.once('ready-to-show', () => {
    log.info(`[Startup] Window ready-to-show: session=${sessionReadMs}ms; prepare=${pageLoadStartedAt - startedAt}ms; page=${Date.now() - pageLoadStartedAt}ms; process=${Math.round(process.uptime() * 1000)}ms`)
    if (!isWin || !browserWindow || browserWindow.webContents.isDestroyed()) return
    // 不等待采样；仅收集固定名称与数值，避免把资源路径或账号数据写入日志。
    void browserWindow.webContents.executeJavaScript(`(() => {
      const navigation = performance.getEntriesByType('navigation')[0]
      const resources = performance.getEntriesByType('resource')
      const markNames = [
        'startup:entry', 'startup:get-setting:start', 'startup:get-setting:end', 'startup:settings-applied',
        'startup:session-restore:start', 'startup:session-restore:end', 'startup:mount:start', 'startup:plugins-ready',
        'startup:components:start', 'startup:components:end', 'startup:mount:end',
        'startup:managed-cache:start', 'startup:managed-cache:end', 'startup:api-load:start', 'startup:api-load:end'
      ]
      const startTime = (name, type) => {
        const entry = performance.getEntriesByName(name, type)[0]
        return entry ? Math.round(entry.startTime) : null
      }
      const resourceEnd = type => resources.reduce((end, entry) => entry.initiatorType === type ? Math.max(end, entry.responseEnd) : end, 0)
      return JSON.stringify({
        snapshotMs: Math.round(performance.now()),
        navigation: navigation ? {
          responseEnd: Math.round(navigation.responseEnd) || null,
          domInteractive: Math.round(navigation.domInteractive) || null,
          domContentLoadedEventEnd: Math.round(navigation.domContentLoadedEventEnd) || null,
          loadEventEnd: Math.round(navigation.loadEventEnd) || null
        } : null,
        scriptResponseEndMs: Math.round(resourceEnd('script')),
        cssResponseEndMs: Math.round(resourceEnd('css')),
        firstPaintMs: startTime('first-paint', 'paint'),
        firstContentfulPaintMs: startTime('first-contentful-paint', 'paint'),
        marks: Object.fromEntries(markNames.map(name => [name, startTime(name, 'mark')]))
      })
    })()`).then(timings => {
      log.info(`[Startup] Renderer timings: ${timings}`)
    }).catch(() => {
      log.warn('[Startup] Renderer timing collection failed.')
    })
  })

  if (global.envParams.cmdParams.odt) handleOpenDevTools(browserWindow.webContents)

  // global.lx.mainWindowClosed = false
  // browserWindow.webContents.openDevTools()
  global.lx.event_app.main_window_created(browserWindow)
}

export const isExistWindow = (): boolean => !!browserWindow
export const isShowWindow = (): boolean => {
  if (!browserWindow) return false
  return browserWindow.isVisible() && (isWin ? true : browserWindow.isFocused())
}

export const closeWindow = () => {
  if (!browserWindow) return
  browserWindow.close()
}

export const resolveCloseAction = (action: CloseAction) => {
  handleCloseAction(action)
}

export const setCloseRendererReady = () => {
  isCloseRendererReady = true
}

const setSesProxy = (ses: Electron.Session, host?: string, port?: string | number) => {
  if (host) {
    void ses.setProxy({
      mode: 'fixed_servers',
      proxyRules: `http://${host}:${port}`,
    })
  } else {
    void ses.setProxy({
      mode: 'direct',
    })
  }
}
export const setProxy = () => {
  if (!browserWindow) return
  const proxy = getProxy()
  setSesProxy(browserWindow.webContents.session, proxy?.host, proxy?.port)
}


export const sendEvent = <T = any>(name: string, params?: T) => {
  if (!browserWindow) return
  mainSend(browserWindow, name, params)
}

export const showSelectDialog = async(options: Electron.OpenDialogOptions) => {
  if (!browserWindow) throw new Error('main window is undefined')
  return dialog.showOpenDialog(browserWindow, options)
}
export const showDialog = ({ type, message, detail }: Electron.MessageBoxSyncOptions) => {
  if (!browserWindow) return
  dialog.showMessageBoxSync(browserWindow, {
    type,
    message,
    detail,
  })
}
export const showSaveDialog = async(options: Electron.SaveDialogOptions) => {
  if (!browserWindow) throw new Error('main window is undefined')
  return dialog.showSaveDialog(browserWindow, options)
}
export const minimize = () => {
  if (!browserWindow) return
  browserWindow.minimize()
}
export const maximize = () => {
  if (!browserWindow) return
  browserWindow.maximize()
}
export const unmaximize = () => {
  if (!browserWindow) return
  browserWindow.unmaximize()
}
export const toggleHide = () => {
  if (!browserWindow) return
  browserWindow.isVisible()
    ? browserWindow.hide()
    : browserWindow.show()
}
export const toggleMinimize = () => {
  if (!browserWindow) return
  if (browserWindow.isVisible()) {
    if (browserWindow.isMinimized()) browserWindow.restore()
    else browserWindow.minimize()
  } else browserWindow.show()
}
export const showWindow = () => {
  if (!browserWindow) return
  if (browserWindow.isVisible()) {
    if (browserWindow.isMinimized()) browserWindow.restore()
    else browserWindow.focus()
  } else browserWindow.show()
}
export const hideWindow = () => {
  if (!browserWindow) return
  browserWindow.hide()
}
export const setWindowBounds = (options: Partial<Electron.Rectangle>) => {
  if (!browserWindow) return
  browserWindow.setBounds(options)
}
export const setProgressBar = (progress: number, options?: Electron.ProgressBarOptions) => {
  if (!browserWindow) return
  browserWindow.setProgressBar(progress, options)
}
export const setIgnoreMouseEvents = (ignore: boolean, options?: Electron.IgnoreMouseEventsOptions) => {
  if (!browserWindow) return
  browserWindow.setIgnoreMouseEvents(ignore, options)
}
export const toggleDevTools = () => {
  if (!browserWindow) return
  if (browserWindow.webContents.isDevToolsOpened()) {
    browserWindow.webContents.closeDevTools()
  } else {
    handleOpenDevTools(browserWindow.webContents)
  }
}

export const setFullScreen = (isFullscreen: boolean): boolean => {
  if (!browserWindow) return false
  if (isLinux) { // linux 需要先设置为可调整窗口大小才能全屏
    if (isFullscreen) {
      browserWindow.setResizable(isFullscreen)
      browserWindow.setFullScreen(isFullscreen)
    } else {
      browserWindow.setFullScreen(isFullscreen)
      browserWindow.setResizable(isFullscreen)
    }
  } else {
    browserWindow.setFullScreen(isFullscreen)
  }
  return isFullscreen
}

const taskBarButtonFlags: LX.TaskBarButtonFlags = {
  empty: true,
  collect: false,
  play: false,
  next: true,
  prev: true,
}
export const setThumbarButtons = ({ empty, collect, play, next, prev }: LX.TaskBarButtonFlags = taskBarButtonFlags) => {
  if (!isWin || !browserWindow) return
  taskBarButtonFlags.empty = empty
  taskBarButtonFlags.collect = collect
  taskBarButtonFlags.play = play
  taskBarButtonFlags.next = next
  taskBarButtonFlags.prev = prev
  browserWindow.setThumbarButtons(createTaskBarButtons(taskBarButtonFlags, action => {
    sendTaskbarButtonClick(action)
  }))
}

export const setThumbnailClip = (region: Electron.Rectangle) => {
  if (!browserWindow) return
  browserWindow.setThumbnailClip(region)
}


export const clearCache = async() => {
  if (!browserWindow) throw new Error('main window is undefined')
  await browserWindow.webContents.session.clearCache()
}

export const getCacheSize = async() => {
  if (!browserWindow) throw new Error('main window is undefined')
  return browserWindow.webContents.session.getCacheSize()
}

export const getWebContents = (): Electron.WebContents => {
  if (!browserWindow) throw new Error('main window is undefined')
  return browserWindow.webContents
}
