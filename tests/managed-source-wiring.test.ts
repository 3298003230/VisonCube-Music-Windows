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
