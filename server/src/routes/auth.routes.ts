import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import type { TokenPayload } from '../types/index.js'
import {
  createUser,
  getUserByEmail,
  getUserById,
  verifyPassword,
} from '../services/user.service.js'
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  blacklistAccessToken,
  verifyAccessToken,
} from '../services/token.service.js'
import {
  generateMfaSecret,
  generateQRCode,
  verifyTotp,
  enableMfa,
  disableMfa,
  setMfaPending,
  isMfaPending,
  clearMfaPending,
} from '../services/mfa.service.js'
import { writeAuditLog } from '../services/audit.service.js'
import { loginRateLimit, mfaRateLimit } from '../middleware/rateLimit.middleware.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router = Router()

const actor = (req: Request): TokenPayload => req.user as TokenPayload

// ── Register ──────────────────────────────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
  role: z.enum(['CISO', 'SOC_ANALYST', 'AUDITOR', 'EXECUTIVE']).optional(),
})

router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() })
    return
  }

  const { email, name, password, role } = parsed.data
  if (getUserByEmail(email)) {
    res.status(409).json({ error: 'Email already registered' })
    return
  }

  const user = await createUser({ email, name, password, role })
  writeAuditLog({ userId: user.id, action: 'USER_REGISTER', ip: req.ip, userAgent: req.headers['user-agent'] })

  res.status(201).json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  })
})

// ── Login ─────────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

router.post('/login', loginRateLimit, async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed' })
    return
  }

  const { email, password } = parsed.data
  const user = getUserByEmail(email)

  if (!user || !(await verifyPassword(user, password))) {
    writeAuditLog({ action: 'LOGIN_FAILED', resource: email, ip: req.ip })
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  if (user.mfa_enabled) {
    await setMfaPending(user.id)
    writeAuditLog({ userId: user.id, action: 'LOGIN_MFA_PENDING', ip: req.ip })

    // Issue a short-lived partial token (no mfa_verified flag means it's not valid for API calls)
    const partialToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      mfa_verified: false,
    })

    res.json({ mfa_required: true, partial_token: partialToken })
    return
  }

  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role, mfa_verified: true })
  const refreshToken = signRefreshToken(user.id, user.role, req.ip ?? null, req.headers['user-agent'] ?? null)

  writeAuditLog({ userId: user.id, action: 'LOGIN_SUCCESS', ip: req.ip, userAgent: req.headers['user-agent'] })

  res.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  })
})

// ── MFA Verify ────────────────────────────────────────────────────────────────
const mfaVerifySchema = z.object({
  partial_token: z.string(),
  totp_code: z.string().length(6),
})

router.post('/mfa/verify', mfaRateLimit, async (req: Request, res: Response) => {
  const parsed = mfaVerifySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed' })
    return
  }

  let payload
  try {
    payload = verifyAccessToken(parsed.data.partial_token)
  } catch {
    res.status(401).json({ error: 'Invalid partial token' })
    return
  }

  if (payload.mfa_verified !== false) {
    res.status(400).json({ error: 'Token is not a partial MFA token' })
    return
  }

  if (!(await isMfaPending(payload.sub))) {
    res.status(401).json({ error: 'MFA challenge expired. Please log in again.' })
    return
  }

  const user = getUserById(payload.sub)
  if (!user?.mfa_secret || !verifyTotp(parsed.data.totp_code, user.mfa_secret)) {
    res.status(401).json({ error: 'Invalid TOTP code' })
    return
  }

  await clearMfaPending(payload.sub)

  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role, mfa_verified: true })
  const refreshToken = signRefreshToken(user.id, user.role, req.ip ?? null, req.headers['user-agent'] ?? null)

  writeAuditLog({ userId: user.id, action: 'MFA_VERIFY_SUCCESS', ip: req.ip })

  res.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  })
})

// ── MFA Setup ─────────────────────────────────────────────────────────────────
router.post('/mfa/setup', requireAuth, async (req: Request, res: Response) => {
  const a = actor(req)
  const user = getUserById(a.sub)!
  const { secret, otpauthUrl } = generateMfaSecret(user.email)
  const qrCode = await generateQRCode(otpauthUrl)

  const { redis } = await import('../config/redis.js')
  await redis.setex(`mfa_setup:${user.id}`, 600, secret)

  res.json({ qr_code: qrCode, secret })
})

router.post('/mfa/confirm', requireAuth, mfaRateLimit, async (req: Request, res: Response) => {
  const a = actor(req)
  const { totp_code } = z.object({ totp_code: z.string().length(6) }).parse(req.body)
  const { redis } = await import('../config/redis.js')
  const secret = await redis.get(`mfa_setup:${a.sub}`)

  if (!secret || !verifyTotp(totp_code, secret)) {
    res.status(401).json({ error: 'Invalid TOTP code' })
    return
  }

  enableMfa(a.sub, secret)
  await redis.del(`mfa_setup:${a.sub}`)
  writeAuditLog({ userId: a.sub, action: 'MFA_ENABLED' })

  res.json({ message: 'MFA enabled successfully' })
})

router.delete('/mfa', requireAuth, async (req: Request, res: Response) => {
  const a = actor(req)
  disableMfa(a.sub)
  writeAuditLog({ userId: a.sub, action: 'MFA_DISABLED', ip: req.ip })
  res.json({ message: 'MFA disabled' })
})

// ── Refresh Token ─────────────────────────────────────────────────────────────
router.post('/refresh', async (req: Request, res: Response) => {
  const { refresh_token } = z.object({ refresh_token: z.string() }).parse(req.body)
  const result = await verifyRefreshToken(refresh_token)

  if (!result) {
    res.status(401).json({ error: 'Invalid or expired refresh token' })
    return
  }

  revokeRefreshToken(result.tokenId)

  const user = getUserById(result.userId)!
  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role, mfa_verified: true })
  const newRefresh = signRefreshToken(user.id, user.role, req.ip ?? null, req.headers['user-agent'] ?? null)

  res.json({ access_token: accessToken, refresh_token: newRefresh })
})

// ── Logout ────────────────────────────────────────────────────────────────────
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  const a = actor(req)
  const token = req.headers.authorization!.slice(7)
  const payload = verifyAccessToken(token)

  const exp = (payload as { exp?: number }).exp
  const ttl = exp ? Math.max(exp - Math.floor(Date.now() / 1000), 1) : 900
  await blacklistAccessToken(payload.jti, ttl)

  writeAuditLog({ userId: a.sub, action: 'LOGOUT', ip: req.ip })
  res.json({ message: 'Logged out successfully' })
})

// ── Me ────────────────────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = getUserById(actor(req).sub)
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    mfa_enabled: user.mfa_enabled,
  })
})

export default router
