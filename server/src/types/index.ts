export type UserRole = 'CISO' | 'SOC_ANALYST' | 'AUDITOR' | 'EXECUTIVE'

export interface User {
  id: string
  email: string
  name: string
  password_hash: string | null
  role: UserRole
  mfa_secret: string | null
  mfa_enabled: boolean
  oauth_provider: string | null
  oauth_id: string | null
  created_at: string
  updated_at: string
}

export interface RefreshToken {
  id: string
  user_id: string
  token_hash: string
  user_agent: string | null
  ip: string | null
  expires_at: string
  revoked: boolean
  created_at: string
}

export interface TokenPayload {
  sub: string
  email: string
  role: UserRole
  jti: string
  mfa_verified?: boolean
}

export interface AuthedRequest extends Request {
  user: TokenPayload
}
