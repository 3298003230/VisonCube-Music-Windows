export interface AuthUser {
  id: number
  username: string
  email: string | null
  email_verified_at: string | null
  role: string
}

export interface AuthSession {
  token: string
  token_type: string
  expires_at: string | null
  expires_at_ms: number
  user: AuthUser
}

export interface PasswordCredentials {
  username: string
  password: string
}

export interface RegisterCredentials extends PasswordCredentials {
  email: string
}
