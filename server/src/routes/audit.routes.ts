import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'
import { getAuditLog } from '../services/audit.service.js'

const router = Router()

router.get('/', requireAuth, requireRole('CISO', 'AUDITOR'), (req: Request, res: Response) => {
  const { limit, offset } = z.object({
    limit: z.coerce.number().int().min(1).max(500).default(100),
    offset: z.coerce.number().int().min(0).default(0),
  }).parse(req.query)

  const entries = getAuditLog(limit, offset)
  res.json({ entries, limit, offset })
})

export default router
