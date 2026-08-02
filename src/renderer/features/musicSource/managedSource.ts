import { ref } from '@common/utils/vueTools'
import { AUTH_REQUEST_TIMEOUT_MS, AUTH_SERVER_URL } from '@renderer/features/auth/config'
import { authSession } from '@renderer/features/auth/state'
import { userApi } from '@renderer/store'
import { installManagedSource as installManagedSourceRemote, hydrateManagedSource as hydrateManagedSourceRemote } from '@renderer/utils/ipc'
import { MANAGED_USER_API_ID } from '@common/musicSource'

export interface MusicSourceManifest {
  schema_version: number
  source_id: string
  name: string
  version: string
  revision: number
  content_url: string
  sha256: string
  max_size: number
  updated_at: string
}

export type ManagedSourcePhase = 'idle' | 'updating' | 'ready' | 'error'
export const managedSourceStatus = ref<{ phase: ManagedSourcePhase, manifest?: MusicSourceManifest, message?: string }>({ phase: 'idle' })

const request = async(url: string, token: string, accept: string) => {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => { controller.abort() }, AUTH_REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      headers: { Accept: accept, Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
    if (!response.ok) {
      let message = `音源请求失败（${response.status}）`
      try {
        const body = await response.json() as { detail?: string }
        if (body.detail) message = body.detail
      } catch {
        // Keep the HTTP status when the server does not return JSON.
      }
      throw new Error(message)
    }
    return response
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export const hydrateManagedSource = async() => {
  const session = authSession.value
  if (!session) return false
  return hydrateManagedSourceRemote(session.user.id)
}

export const updateManagedSource = async() => {
  const session = authSession.value
  if (!session) throw new Error('请先登录账号')
  managedSourceStatus.value = { phase: 'updating' }
  try {
    const manifestResponse = await request(`${AUTH_SERVER_URL}/api/music-source`, session.token, 'application/json')
    const manifest = await manifestResponse.json() as MusicSourceManifest
    if (manifest.schema_version !== 1 || !manifest.source_id || !manifest.content_url || !manifest.sha256 || !manifest.max_size) {
      throw new Error('服务器返回的音源清单无效')
    }
    const contentResponse = await request(manifest.content_url, session.token, 'application/javascript')
    const script = await contentResponse.text()
    userApi.list = await installManagedSourceRemote({ userId: session.user.id, manifest, script }) as LX.UserApi.UserApiInfo[]
    managedSourceStatus.value = { phase: 'ready', manifest }
    return manifest
  } catch (error) {
    const message = error instanceof Error ? error.message : '音源更新失败'
    managedSourceStatus.value = { phase: 'error', message }
    throw error
  }
}

export { MANAGED_USER_API_ID }
