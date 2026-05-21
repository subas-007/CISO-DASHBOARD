import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, isTokenBlacklisted } from '../services/token.service.js'
import type { TokenPayload, UserRole } from '../types/index.js'

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' })
    return
  }

  const token = header.slice(7)
  try {
    const payload = verifyAccessToken(token)

    if (await isTokenBlacklisted(payload.jti)) {
      res.status(401).json({ error: 'Token has been revoked' })
      return
    }

    if (payload.mfa_verified === false) {
      res.status(403).json({ error: 'MFA verification required', code: 'MFA_REQUIRED' })
      return
    }

    req.user = payload
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as TokenPayload | undefined
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' })
      return
    }
    if (!roles.includes(user.role)) {
      res.status(403).json({ error: `Requires role: ${roles.join(' or ')}` })
      return
    }
    next()
  }
}
