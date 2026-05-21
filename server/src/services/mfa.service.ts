import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import { db } from '../config/db.js'
import { redis, REDIS_KEYS } from '../config/redis.js'
import { env } from '../config/env.js'

authenticator.options = { window: 1 }

export function generateMfaSecret(email: string): {
  secret: string
  otpauthUrl: string
} {
  const secret = authenticator.generateSecret()
  const otpauthUrl = authenticator.keyuri(email, env.TOTP_APP_NAME, secret)
  return { secret, otpauthUrl }
}

export async function generateQRCode(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl)
}

export function verifyTotp(token: string, secret: string): boolean {
  return authenticator.verify({ token, secret })
}

export function enableMfa(userId: string, secret: string) {
  db.prepare(`
    UPDATE users SET mfa_secret = ?, mfa_enabled = 1, updated_at = datetime('now')
    WHERE id = ?
  `).run(secret, userId)
}

export function disableMfa(userId: string) {
  db.prepare(`
    UPDATE users SET mfa_secret = NULL, mfa_enabled = 0, updated_at = datetime('now')
    WHERE id = ?
  `).run(userId)
}

// Redis-backed MFA challenge — user must verify TOTP within 5 min after password auth
export async function setMfaPending(userId: string) {
  await redis.setex(REDIS_KEYS.mfaPending(userId), 300, '1')
}

export async function isMfaPending(userId: string): Promise<boolean> {
  return (await redis.get(REDIS_KEYS.mfaPending(userId))) === '1'
}

export async function clearMfaPending(userId: string) {
  await redis.del(REDIS_KEYS.mfaPending(userId))
}
