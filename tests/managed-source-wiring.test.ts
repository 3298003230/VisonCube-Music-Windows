import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

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
  const [app, mainWindow, mainIpc, rendererIpc, eventNames, account] = await Promise.all([
    readSource('../src/renderer/App.vue'),
    readSource('../src/main/modules/winMain/main.ts'),
    readSource('../src/main/modules/winMain/rendererEvent/app.ts'),
    readSource('../src/renderer/utils/ipc.ts'),
    readSource('../src/common/ipcNames.ts'),
    readSource('../src/renderer/views/Account/index.vue'),
  ])

  assert.match(app, /if \(ready\) setAuthWindowMode\(loggedIn \? 'main' : 'auth'\)/)
  assert.match(mainWindow, /const width = Math\.min\(460, workArea\.width\)/)
  assert.match(mainWindow, /browserWindow\.setBounds\(normalBounds\)/)
  assert.match(mainWindow, /initialShowTimeout = setTimeout\(showInitialWindow, 5000\)/)
  assert.match(mainIpc, /WIN_MAIN_RENDERER_EVENT_NAME\.auth_window_mode/)
  assert.match(rendererIpc, /WIN_MAIN_RENDERER_EVENT_NAME\.auth_window_mode/)
  assert.match(eventNames, /auth_window_mode: 'auth_window_mode'/)
  assert.match(account, /-webkit-app-region: drag/)
  assert.doesNotMatch(mainWindow, /update_config\(\{ 'common\.windowSizeId'/)
})
