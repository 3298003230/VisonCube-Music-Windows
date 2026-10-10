export interface StoredAuthSession {
  token: string
  user: { username: string }
  expires_at_ms?: number
}

export const isSessionUsable = (session: StoredAuthSession | null | undefined) => {
  if (!session?.token || !session.user?.username) return false
  if (!session.expires_at_ms || session.expires_at_ms <= 0) return true
  return Date.now() + 60000 < session.expires_at_ms
}
