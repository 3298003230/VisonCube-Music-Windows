import { getData, saveData } from '@renderer/utils/ipc'
import { AUTH_STORAGE_KEY } from './config'
import type { AuthSession } from './models'

export const loadSession = async() => {
  return await getData<AuthSession>(AUTH_STORAGE_KEY)
}

export const saveSession = (session: AuthSession) => {
  saveData(AUTH_STORAGE_KEY, session)
}

export const clearSession = () => {
  saveData(AUTH_STORAGE_KEY, null)
}
