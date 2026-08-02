import { computed, ref } from '@common/utils/vueTools'
import * as authApi from './api'
import type { AuthSession, AuthUser, PasswordCredentials, RegisterCredentials } from './models'
import { clearSession, loadSession, saveSession } from './storage'
import { stopMusicCloudSync } from '@renderer/features/musicSync'

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

export const signOut = async() => {
  const session = authSession.value
  authSession.value = null
  stopMusicCloudSync()
  clearSession()
  if (!session || !isSessionUsable(session)) return
  try {
    await authApi.logout(session.token)
  } catch {
    // 本地会话已清除，服务端撤销失败不应阻止用户退出当前设备。
  }
}
