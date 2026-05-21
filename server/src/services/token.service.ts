import jwt from 'jsonwebtoken'
import { createHash, randomBytes } from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { env } from '../config/env.js'
import { db } from '../config/db.js'
import { redis, REDIS_KEYS } from '../config/redis.js'
import type { TokenPayload, UserRole } from '../types/index.js'

const ACCESS_TTL_SECONDS = 15 * 60        // 15 min
const REFRESH_TTL_SECONDS = 7 * 24 * 3600 // 7 days

export function signAccessToken(payload: Omit<TokenPayload, 'jti'>): string {
  const jti = uuidv4()
  return jwt.sign({ ...payload, jti }, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TTL_SECONDS,
  })
}

export function signRefreshToken(
  userId: string,
  role: UserRole,
  ip: string | null,
  userAgent: string | null
): string {
  const raw = randomBytes(40).toString('hex')
  const hash = createHash('sha256').update(raw).digest('hex')
  const id = uuidv4()
  const expiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000).toISOString()

  db.prepare(`
    INSERT INTO refresh_tokens (id, user_id, token_hash, user_agent, ip, expires_at)
    VALUES (@id, @userId, @hash, @userAgent, @ip, @expiresAt)
  `).run({ id, userId, hash, userAgent, ip, expiresAt })

  return raw
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload
}

export async function verifyRefreshToken(raw: string): Promise<{
  userId: string
  role: UserRole
  tokenId: string
} | null> {
  const hash = createHash('sha256').update(raw).digest('hex')
  const row = db.prepare(`
    SELECT id, user_id, expires_at, revoked
    FROM refresh_tokens WHERE token_hash = ?
  `).get(hash) as { id: string; user_id: string; expires_at: string; revoked: number } | undefined

  if (!row || row.revoked || new Date(row.expires_at) < new Date()) return null

  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(row.user_id) as
    | { role: UserRole }
    | undefined
  if (!user) return null

  return { userId: row.user_id, role: user.role, tokenId: row.id }
}

export function revokeRefreshToken(tokenId: string) {
  db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?').run(tokenId)
}

export async function blacklistAccessToken(jti: string, expiresInSeconds: number) {
  await redis.setex(REDIS_KEYS.blacklistToken(jti), expiresInSeconds, '1')
}

export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const val = await redis.get(REDIS_KEYS.blacklistToken(jti))
  return val === '1'
}
