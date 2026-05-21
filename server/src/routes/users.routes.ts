import { Router, type Request, type Response } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'
import { listUsers, getUserById } from '../services/user.service.js'
import { getUserAuditLog } from '../services/audit.service.js'
import type { TokenPayload } from '../types/index.js'

const router = Router()

// List all users — CISO only
router.get('/', requireAuth, requireRole('CISO'), (_req: Request, res: Response) => {
  const users = listUsers().map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    mfa_enabled: u.mfa_enabled,
    created_at: u.created_at,
  }))
  res.json(users)
})

// Get single user
router.get('/:id', requireAuth, (req: Request, res: Response) => {
  const id = String(req.params['id'])
  const actor = req.user as TokenPayload
  if (actor.sub !== id && actor.role !== 'CISO') {
    res.status(403).json({ error: 'Access denied' })
    return
  }
  const user = getUserById(id)
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
    created_at: user.created_at,
  })
})

// Get user audit trail — CISO only
router.get('/:id/audit', requireAuth, requireRole('CISO'), (req: Request, res: Response) => {
  const id = String(req.params['id'])
  const entries = getUserAuditLog(id)
  res.json(entries)
})

export default router
