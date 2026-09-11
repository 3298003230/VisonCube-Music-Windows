import { computed, ref } from '@common/utils/vueTools'
import * as authApi from './api'
import type { AuthSession, AuthUser, PasswordCredentials, RegisterCredentials } from './models'
import { clearSession, loadSession, saveSession } from './storage'
import { stopMusicCloudSync, updateMusicCloudSyncSession } from '@renderer/features/musicSync'
import { MANAGED_USER_API_ID } from '@common/musicSource'
import { setUserApi } from '@renderer/core/apiSource'
import { userApi } from '@renderer/store'
import { appSetting } from '@renderer/store/setting'
import { removeUserApi } from '@renderer/utils/ipc'
import apiSourceInfo from '@renderer/utils/musicSdk/api-source-info'

export const authSession = ref<AuthSession | null>(null)
export const authReady = ref(false)
export const authUser = computed<AuthUser | null>(() => authSession.value?.user ?? null)

const isSessionUsable = (session: AuthSession | null) => {
  if (!session?.token || !session.user?.username) return false
  if (!session.expires_at_ms || session.expires_at_ms <= 0) return true
  return Date.now() + 60000 < session.expires_at_ms
}

const persistSession = (session: AuthSession) => {
  authSession.value = session
  saveSession(session)
  updateMusicCloudSyncSession(session)
  return session
}

export const restoreSession = async() => {
  try {
    const session = await loadSession()
    if (session && isSessionUsable(session)) {
      authSession.value = session
    } else if (session) {
      clearSession()
    }
  } catch {
    clearSession()
  } finally {
    authReady.value = true
  }
}

export const login = async(credentials: PasswordCredentials) => persistSession(await authApi.login(credentials))

export const register = async(credentials: RegisterCredentials) => persistSession(await authApi.register(credentials))

export const refreshUser = async() => {
  if (!authSession.value || !isSessionUsable(authSession.value)) throw new authApi.AuthApiError(401, '登录状态已失效，请重新登录')
  const user = await authApi.me(authSession.value.token)
  authSession.value = { ...authSession.value, user }
  saveSession(authSession.value)
  return user
}

export const changePassword = async(oldPassword: string, newPassword: string) => {
  if (!authSession.value || !isSessionUsable(authSession.value)) throw new authApi.AuthApiError(401, '登录状态已失效，请重新登录')
  return persistSession(await authApi.changePassword(authSession.value.token, oldPassword, newPassword))
}

const removeManagedSourceForSignOut = async() => {
  const isManagedSourceActive = appSetting['common.apiSource'] == MANAGED_USER_API_ID
  userApi.list = await removeUserApi([MANAGED_USER_API_ID])
  if (!isManagedSourceActive) return

  const fallback = apiSourceInfo.find(api => !api.disabled)
  if (fallback) await setUserApi(fallback.id)
}

export const signOut = async() => {
  const session = authSession.value
  authSession.value = null
  stopMusicCloudSync()
  try {
    await removeManagedSourceForSignOut()
  } catch {
    // 音源清理失败不能阻止本地会话退出；下次启动仍会按缓存校验处理失效音源。
  }
  clearSession()
  if (!session || !isSessionUsable(session)) return
  try {
    await authApi.logout(session.token)
  } catch {
    // 本地会话已清除，服务端撤销失败不应阻止用户退出当前设备。
  }
}
