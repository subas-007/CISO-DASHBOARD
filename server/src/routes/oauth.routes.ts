import { Router, type Request, type Response, type NextFunction } from 'express'
import passport from '../config/passport.js'
import { signAccessToken, signRefreshToken } from '../services/token.service.js'
import { writeAuditLog } from '../services/audit.service.js'
import type { User } from '../types/index.js'

const router = Router()

// OAuth2 flow
router.get('/oauth', passport.authenticate('oauth2', { session: false, scope: ['openid', 'email', 'profile'] }))

router.get('/oauth/callback',
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('oauth2', { session: false }, (err: unknown, user: User | false) => {
      if (err || !user) {
        res.redirect(`${process.env.CORS_ORIGIN}/login?error=oauth_failed`)
        return
      }
      const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role, mfa_verified: true })
      const refreshToken = signRefreshToken(user.id, user.role, req.ip ?? null, req.headers['user-agent'] ?? null)
      writeAuditLog({ userId: user.id, action: 'LOGIN_OAUTH', ip: req.ip })
      // Redirect to frontend with tokens in query (swap to httpOnly cookie in prod)
      res.redirect(`${process.env.CORS_ORIGIN}/auth/callback?at=${accessToken}&rt=${refreshToken}`)
    })(req, res, next)
  }
)

// SAML flow
router.post('/saml',
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('saml', { session: false }, (err: unknown, user: User | false) => {
      if (err || !user) {
        res.redirect(`${process.env.CORS_ORIGIN}/login?error=saml_failed`)
        return
      }
      const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role, mfa_verified: true })
      const refreshToken = signRefreshToken(user.id, user.role, req.ip ?? null, req.headers['user-agent'] ?? null)
      writeAuditLog({ userId: user.id, action: 'LOGIN_SAML', ip: req.ip })
      res.redirect(`${process.env.CORS_ORIGIN}/auth/callback?at=${accessToken}&rt=${refreshToken}`)
    })(req, res, next)
  }
)

export default router
