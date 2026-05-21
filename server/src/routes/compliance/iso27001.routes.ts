import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js'
import {
  ISO_CONTROLS,
  NIST_ISO_CROSSWALK,
  getIsoComplianceScore,
  upsertIsoControl,
} from '../../services/compliance/iso27001.service.js'
import type { TokenPayload } from '../../types/index.js'

const router = Router()

// ISO 27001 control catalogue
router.get('/controls', requireAuth, (_req: Request, res: Response) => {
  res.json(ISO_CONTROLS)
})

// NIST CSF ↔ ISO 27001 crosswalk
router.get('/crosswalk', requireAuth, (_req: Request, res: Response) => {
  res.json(NIST_ISO_CROSSWALK)
})

// Compliance score
router.get('/score', requireAuth, (_req: Request, res: Response) => {
  res.json(getIsoComplianceScore())
})

// Upsert control assessment
const assessSchema = z.object({
  controlId: z.string().regex(/^A\.\d+\.\d+$/),
  status: z.enum(['compliant', 'partial', 'non_compliant', 'not_applicable']),
  score: z.number().min(0).max(100),
  evidence: z.string().optional(),
  finding: z.string().optional(),
})

router.post('/controls', requireAuth, requireRole('CISO', 'AUDITOR'), (req: Request, res: Response) => {
  const data = assessSchema.parse(req.body)
  const actor = req.user as TokenPayload
  upsertIsoControl({ ...data, assessorId: actor.sub })
  res.status(201).json({ updated: true })
})

router.post('/controls/bulk', requireAuth, requireRole('CISO', 'AUDITOR'), (req: Request, res: Response) => {
  const { controls } = z.object({ controls: z.array(assessSchema) }).parse(req.body)
  const actor = req.user as TokenPayload
  for (const c of controls) {
    upsertIsoControl({ ...c, assessorId: actor.sub })
  }
  res.status(201).json({ updated: controls.length })
})

export default router
