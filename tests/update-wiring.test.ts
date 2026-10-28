import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

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
  const [windowIndex, eventListener, constants, app, deeplink, mediaSession] = await Promise.all([
    readSource('../src/main/modules/winMain/index.ts'),
    readSource('../src/renderer/core/useApp/useEventListener.ts'),
    readSource('../src/common/constants.ts'),
    readSource('../src/main/app.ts'),
    readSource('../src/renderer/core/useApp/useDeeplink/index.ts'),
    readSource('../src/renderer/core/useApp/usePlayer/useMediaSessionInfo.ts'),
  ])

  assert.match(windowIndex, /case HOTKEY_COMMON\.close\.action:\s+closeWindow\(\)/)
  assert.doesNotMatch(windowIndex, /case HOTKEY_COMMON\.close\.action:\s+quitApp\(\)/)
  assert.match(eventListener, /key_event\.on\(HOTKEY_COMMON\.close\.action, closeWindow\)/)
  assert.doesNotMatch(eventListener, /key_event\.on\(HOTKEY_COMMON\.close\.action, quitApp\)/)
  assert.match(constants, /visoncubemusic/)
  assert.match(app, /const protocols = \['visoncubemusic', 'lxmusic'\]/)
  assert.match(deeplink, /\^\(\?:lxmusic\|visoncubemusic\)/)
  assert.match(mediaSession, /let metadataGeneration = 0/)
  assert.match(mediaSession, /generation != metadataGeneration \|\| musicInfo\.id != musicId \|\| musicInfo\.pic != picUrl/)
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
