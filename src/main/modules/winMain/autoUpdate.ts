import { net } from 'electron'
import { autoUpdater } from 'electron-updater'
import { MUSIC_WINDOWS_RELEASE_API_URL } from '@common/visoncubeConfig'
import { log } from '@common/utils'
import { mainOn } from '@common/mainIpc'
import { isExistWindow, sendEvent } from './index'
import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames'

autoUpdater.logger = log
autoUpdater.autoDownload = false
// autoUpdater.forceDevUpdateConfig = true
// autoUpdater.autoDownload = false

// let isFirstCheckedUpdate = true

log.info('App starting...')


// -------------------------------------------------------------------
// Open a window that displays the version
//
// THIS SECTION IS NOT REQUIRED
//
// This isn't required for auto-updates to work, but it's easier
// for the app to show a window than to have to click "About" to see
// that updates are working.
// -------------------------------------------------------------------
// let win

function sendStatusToWindow(text: string) {
  log.info(text)
  // ipcMain.send('message', text)
}


// -------------------------------------------------------------------
// Auto updates
//
// For details about these events, see the Wiki:
// https://github.com/electron-userland/electron-builder/wiki/Auto-Update#events
//
// The app doesn't need to listen to any events except `update-downloaded`
//
// Uncomment any of the below events to listen for them.  Also,
// look in the previous section to see them being used.
// -------------------------------------------------------------------
// autoUpdater.on('checking-for-update', () => {
// })
// autoUpdater.on('update-available', (ev, info) => {
// })
// autoUpdater.on('update-not-available', (ev, info) => {
// })
// autoUpdater.on('error', (ev, err) => {
// })
// autoUpdater.on('download-progress', (ev, progressObj) => {
// })
// autoUpdater.on('update-downloaded', (ev, info) => {
//   // Wait 5 seconds, then quit and install
//   // In your application, you don't need to wait 5 seconds.
//   // You could call autoUpdater.quitAndInstall(); immediately
//   // setTimeout(function() {
//   // autoUpdater.quitAndInstall()
//   // }, 5000)

// })

interface WaitEvent {
  type: string
  info: any
}

// let waitEvent: WaitEvent[] = []
const handleSendEvent = (action: WaitEvent) => {
  if (isExistWindow()) {
    setTimeout(() => { // 延迟发送事件，过早发送可能渲染进程还没启动完成
      sendEvent(action.type, action.info)
    }, 1000)
  }
}

export default () => {
  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('Checking for update...')
  })
  autoUpdater.on('update-available', info => {
    sendStatusToWindow('Update available.')
    handleSendEvent({ type: WIN_MAIN_RENDERER_EVENT_NAME.update_available, info })
  })
  autoUpdater.on('update-not-available', info => {
    sendStatusToWindow('Update not available.')
    handleSendEvent({ type: WIN_MAIN_RENDERER_EVENT_NAME.update_not_available, info })
  })
  autoUpdater.on('error', err => {
    sendStatusToWindow('Error in auto-updater.')
    handleSendEvent({ type: WIN_MAIN_RENDERER_EVENT_NAME.update_error, info: err.message })
  })
  autoUpdater.on('download-progress', progressObj => {
    let log_message = `Download speed: ${progressObj.bytesPerSecond}`
    log_message = `${log_message} - Downloaded ${progressObj.percent}%`
    log_message = `${log_message} (progressObj.transferred/${progressObj.total})`
    sendStatusToWindow(log_message)
    handleSendEvent({ type: WIN_MAIN_RENDERER_EVENT_NAME.update_progress, info: progressObj })
  })
  autoUpdater.on('update-downloaded', info => {
    sendStatusToWindow('Update downloaded.')
    handleSendEvent({ type: WIN_MAIN_RENDERER_EVENT_NAME.update_downloaded, info })
  })

  mainOn(WIN_MAIN_RENDERER_EVENT_NAME.update_check, () => {
    void checkUpdate()
  })

  mainOn(WIN_MAIN_RENDERER_EVENT_NAME.update_download_update, () => {
    if (!autoUpdater.isUpdaterActive()) return
    void autoUpdater.downloadUpdate()
  })

  mainOn(WIN_MAIN_RENDERER_EVENT_NAME.quit_update, () => {
    global.lx.isSkipTrayQuit = true

    setTimeout(() => {
      autoUpdater.quitAndInstall(true, true)
    }, 1000)
  })
}

const checkUpdate = async() => {
  // if (!isFirstCheckedUpdate) {
  //   if (waitEvent.length) {
  //     waitEvent.forEach((event, index) => {
  //       setTimeout(() => { // 延迟发送事件，过早发送可能渲染进程还没启动完成
  //         sendEvent(event.type, event.info)
  //       }, 2000 * (index + 1))
  //     })
  //     waitEvent = []
  //   }
  //   return
  // }
  // isFirstCheckedUpdate = false

  try {
    const response = await net.fetch(MUSIC_WINDOWS_RELEASE_API_URL)
    if (!response.ok) throw new Error('Failed to fetch release information')
    const release = await response.json() as { feed_url?: unknown }
    if (typeof release.feed_url != 'string' || !release.feed_url) {
      throw new Error('Release feed is not configured')
    }

    const feedUrl = new URL(release.feed_url)
    if (!['http:', 'https:'].includes(feedUrl.protocol)) {
      throw new Error('Release feed protocol is invalid')
    }

    autoUpdater.setFeedURL({ provider: 'generic', url: feedUrl.toString() })
    await autoUpdater.checkForUpdates()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to check for updates'
    handleSendEvent({ type: WIN_MAIN_RENDERER_EVENT_NAME.update_error, info: message })
  }
}
