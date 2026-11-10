import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { runInNewContext } from 'node:vm'

const readSource = (path: string) => readFile(new URL(path, import.meta.url), 'utf8')

void test('Windows updates use a validated dynamic feed and surface unavailable downloads', async() => {
  const source = await readSource('../src/main/modules/winMain/autoUpdate.ts')

  assert.match(source, /net\.fetch\(MUSIC_WINDOWS_RELEASE_API_URL\)/)
  assert.match(source, /typeof release\.feed_url != 'string'/)
  assert.match(source, /feedUrl\.protocol != 'https:'/)
  assert.match(source, /autoUpdater\.setFeedURL\(\{ provider: 'generic', url: feedUrl\.toString\(\) \}\)/)
  assert.match(source, /Automatic updates are unavailable for this installation\./)
  assert.match(source, /void autoUpdater\.downloadUpdate\(\)\.catch\(\(\) => \{\}\)/)
})

void test('the close shortcut and both Music protocols use the shared window and deeplink paths', async() => {
  const [windowIndex, eventListener, constants, app, deeplink] = await Promise.all([
    readSource('../src/main/modules/winMain/index.ts'),
    readSource('../src/renderer/core/useApp/useEventListener.ts'),
    readSource('../src/common/constants.ts'),
    readSource('../src/main/app.ts'),
    readSource('../src/renderer/core/useApp/useDeeplink/index.ts'),
  ])

  assert.match(windowIndex, /case HOTKEY_COMMON\.close\.action:\s+closeWindow\(\)/)
  assert.doesNotMatch(windowIndex, /case HOTKEY_COMMON\.close\.action:\s+quitApp\(\)/)
  assert.match(eventListener, /key_event\.on\(HOTKEY_COMMON\.close\.action, closeWindow\)/)
  assert.doesNotMatch(eventListener, /key_event\.on\(HOTKEY_COMMON\.close\.action, quitApp\)/)
  assert.match(constants, /visoncubemusic/)
  assert.match(app, /const protocols = \['visoncubemusic', 'lxmusic'\]/)
  assert.match(deeplink, /\^\(\?:lxmusic\|visoncubemusic\)/)
})

void test('stable upstream playlist fixes and IEC size units remain wired', async() => {
  const [common, publishUtils, kg, tx] = await Promise.all([
    readSource('../src/common/utils/common.ts'),
    readSource('../publish/utils/index.js'),
    readSource('../src/renderer/utils/musicSdk/kg/songList.js'),
    readSource('../src/renderer/utils/musicSdk/tx/songList.js'),
  ])

  for (const source of [common, publishUtils]) {
    assert.match(source, /KiB/)
    assert.match(source, /MiB/)
    assert.match(source, /GiB/)
    assert.match(source, /TiB/)
  }
  assert.match(kg, /getListDetailByGcidChain/)
  assert.match(tx, /name: '推荐'/)
  assert.match(tx, /getRecommendList\(page\)/)
})

const loadPlaybackSource = async(relativePath: string, context: Record<string, unknown>, entry: string) => {
  const source = stripTypeScriptTypes(await readSource(relativePath))
    .replace(/^import [\s\S]*? from '[^']+'\r?\n/gm, '')
    .replace(/^export default /gm, 'const setup = ')
    .replace(/^export /gm, '')
  return runInNewContext(source + '\n' + entry, context)
}

void test('the system media card follows the latest track while artwork and registration are pending', async() => {
  const appEvent = new EventEmitter()
  const images: Array<{ onload?: () => void }> = []
  const positions: Array<MediaPositionState | undefined> = []
  const session = {
    metadata: null as MediaMetadata | null,
    playbackState: 'none',
    setActionHandler: () => {},
    setPositionState: (position?: MediaPositionState) => positions.push(position),
  }
  let resolveRegistration!: () => void
  let registration = new Promise<void>(resolve => { resolveRegistration = resolve })
  let playbackRate = 1
  let changeTrackId!: (id: string | null) => void
  const musicInfo = { id: 'a' as string | null, name: 'Track A', singer: 'Artist A', album: 'Album A', pic: 'https://example.test/cover' }
  const setup = await loadPlaybackSource('../src/renderer/core/useApp/usePlayer/useMediaSessionInfo.ts', {
    Audio: class { play = () => registration },
    Image: class {
      onload?: () => void
      constructor() { images.push(this) }
    },
    MediaMetadata: class {
      artwork: MediaImage[] = []
      constructor(metadata: MediaMetadataInit) { Object.assign(this, metadata) }
    },
    navigator: { mediaSession: session },
    window: { app_event: appEvent },
    musicInfo,
    onBeforeUnmount: () => {},
    watch: (_get: () => string | null, listener: typeof changeTrackId) => { changeTrackId = listener },
    require: () => 'silence.mp3',
    playProgress: { maxPlayTime: 0, nowPlayTime: 0 },
    getDuration: () => 90,
    getCurrentTime: () => 91,
    getPlaybackRate: () => playbackRate,
  }, 'setup')
  setup()

  appEvent.emit('musicToggled')
  assert.equal(session.metadata?.title, 'Track A')
  Object.assign(musicInfo, { id: 'b', name: 'Track B', singer: 'Artist B', album: 'Album B' })
  appEvent.emit('musicToggled')
  assert.equal(session.metadata?.title, 'Track B')
  assert.equal(session.metadata?.artist, 'Artist B')
  assert.equal(session.metadata?.album, 'Album B')
  assert.equal(positions.at(-1), undefined)

  images[0].onload!()
  assert.equal(session.metadata?.artwork.length, 0)
  images[1].onload!()
  assert.equal(session.metadata?.artwork[0].src, musicInfo.pic)

  appEvent.emit('playerLoadeddata')
  assert.equal(positions.at(-1)?.position, 90)
  playbackRate = 0
  appEvent.emit('playerPlaying')
  assert.equal(positions.at(-1), undefined)
  playbackRate = 1
  session.metadata = null
  appEvent.emit('play')
  resolveRegistration()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(session.playbackState, 'playing')
  assert.equal(session.metadata?.title, 'Track B')

  registration = Promise.reject(new Error('registration unavailable'))
  appEvent.emit('playerEmptied')
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(session.playbackState, 'playing')
  assert.equal(images.length, 2)

  appEvent.emit('pause')
  assert.equal(session.playbackState, 'paused')
  musicInfo.id = null
  changeTrackId(null)
  assert.equal(session.metadata, null)
})

void test('desktop lyrics use the supplied timestamp and discard pending playback on pause or track change', async() => {
  const appEvent = new EventEmitter()
  let time = 28.5
  let nextTimerId = 0
  const timers = new Map<number, () => void>()
  const messages: LX.DesktopLyric.LyricActions[] = []
  const isPlay = { value: true }
  const musicInfo = { id: 'a', lrc: '[00:28.500]line' }
  const port = { postMessage: (message: LX.DesktopLyric.LyricActions) => { messages.push(message) } }
  const main = await loadPlaybackSource('../src/renderer/core/lyric.ts', {
    Lyric: class {
      setLyric() {}
      setOffset() {}
      pause() {}
      play() {}
    },
    setTimeout: (callback: () => void) => { timers.set(++nextTimerId, callback); return nextTimerId },
    clearTimeout: (id: number) => { timers.delete(id) },
    onNewDesktopLyricProcess: (listener: (info: unknown) => void) => listener({ event: { ports: [port] } }),
    getPlayerCurrentTime: () => time,
    appSetting: {},
    lyric: { line: 0, offset: 0 },
    setTempOffset: () => {},
    setText: () => {},
    musicInfo,
    isPlay,
    console: { log: () => {} },
  }, '({ init, play, setLyric, setLyricOffset, pause, stop, sendInfo, setPlaybackRate })')
  const setup = await loadPlaybackSource('../src/renderer/core/useApp/usePlayer/useLyric.ts', {
    ...main,
    window: { app_event: appEvent },
    appSetting: {},
    debounce: (handler: () => void) => handler,
    onBeforeUnmount: () => {},
    watch: () => {},
  }, 'setup')
  setup()
  main.sendInfo()
  const playing = messages.at(-1)!

  const desktopPlayback: Array<number | false> = []
  const desktop = await loadPlaybackSource('../src/renderer-lyric/core/mainWindowChannel.ts', {
    setMusicInfo: () => {},
    setIsPlay: () => {},
    lyrics: {},
    setLyric: () => {},
    play: (position: number) => desktopPlayback.push(position),
    pause: () => desktopPlayback.push(false),
    stop: () => desktopPlayback.push(false),
    setImmediate: (callback: () => void) => callback(),
  }, 'handleDesktopLyricMessage')
  desktop(playing)
  assert.deepEqual(desktopPlayback, [28500])

  appEvent.emit('lyricUpdated')
  main.setLyricOffset(20)
  assert.equal(timers.size, 1)
  appEvent.emit('pause')
  assert.equal(timers.size, 0)

  appEvent.emit('lyricUpdated')
  assert.equal(timers.size, 1)
  musicInfo.id = 'b'
  appEvent.emit('musicToggled')
  assert.equal(timers.size, 0)
  const stopped = messages.at(-1)!
  assert.equal(stopped.action, 'set_info')
  assert.equal(stopped.data.id, 'b')
  assert.equal(stopped.data.played_time, 0)
  desktop(stopped)
  assert.deepEqual(desktopPlayback, [28500, false])

  appEvent.emit('lyricUpdated')
  time = 0.25
  const resume = Array.from(timers.values())[0]
  resume()
  desktop(messages.at(-1)!)
  assert.deepEqual(desktopPlayback, [28500, false, 250])
})

void test('one-line and two-line lyrics wait for the actual line time and retain legacy milliseconds', async() => {
  let now = 0
  let timer: { callback: () => void, at: number } | undefined
  const LinePlayer = await loadPlaybackSource('../src/common/utils/lyric-font-player/line-player.js', {
    getNow: () => now,
    TimeoutTools: class {
      start(callback: () => void, delay: number) { timer = { callback, at: now + delay } }
      clear() { timer = undefined }
    },
  }, 'setup')
  const output: string[] = []
  const player = new LinePlayer({ onPlay: (_line: number, text: string) => output.push(text) })
  const advance = (expectedTime: number) => {
    const pending = timer
    assert.equal(pending?.at, expectedTime)
    assert.ok(pending)
    now = pending.at
    timer = undefined
    pending.callback()
  }

  player.setLyric('[00:01.5]first\n[00:03.050]last', ['[00:01.005]translation'])
  assert.equal(player.lines[0].extendedLyrics[0], 'translation')
  player.play(0)
  assert.deepEqual(output, [''])
  advance(1005)
  assert.deepEqual(output, ['', 'first'])
  advance(3050)
  assert.deepEqual(output, ['', 'first', 'last'])
  assert.equal(timer, undefined)

  player.setLyric('[00:02.7]single')
  player.play(0)
  assert.equal(output.at(-1), '')
  advance(5057)
  assert.equal(output.at(-1), 'single')
  assert.equal(timer, undefined)
})
