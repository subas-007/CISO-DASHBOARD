import argon2 from 'argon2'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../config/db.js'
import type { User, UserRole } from '../types/index.js'

export async function createUser(params: {
  email: string
  name: string
  password?: string
  role?: UserRole
  oauthProvider?: string
  oauthId?: string
}): Promise<User> {
  const id = uuidv4()
  const password_hash = params.password ? await argon2.hash(params.password) : null
  const role: UserRole = params.role ?? 'EXECUTIVE'

  db.prepare(`
    INSERT INTO users (id, email, name, password_hash, role, oauth_provider, oauth_id)
    VALUES (@id, @email, @name, @password_hash, @role, @oauthProvider, @oauthId)
  `).run({
    id,
    email: params.email,
    name: params.name,
    password_hash,
    role,
    oauthProvider: params.oauthProvider ?? null,
    oauthId: params.oauthId ?? null,
  })

  return getUserById(id)!
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  if (!user.password_hash) return false
  return argon2.verify(user.password_hash, password)
}

export function getUserById(id: string): User | undefined {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as
    | (Omit<User, 'mfa_enabled'> & { mfa_enabled: number })
    | undefined
  return row ? normalize(row) : undefined
}

export function getUserByEmail(email: string): User | undefined {
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
    | (Omit<User, 'mfa_enabled'> & { mfa_enabled: number })
    | undefined
  return row ? normalize(row) : undefined
}

export function getUserByOAuth(provider: string, oauthId: string): User | undefined {
  const row = db
    .prepare('SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?')
    .get(provider, oauthId) as
    | (Omit<User, 'mfa_enabled'> & { mfa_enabled: number })
    | undefined
  return row ? normalize(row) : undefined
}

export function listUsers(): User[] {
  const rows = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as
    Array<Omit<User, 'mfa_enabled'> & { mfa_enabled: number }>
  return rows.map(normalize)
}

function normalize(row: Omit<User, 'mfa_enabled'> & { mfa_enabled: number }): User {
  return { ...row, mfa_enabled: row.mfa_enabled === 1 }
}
