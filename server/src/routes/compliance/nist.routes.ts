import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js'
import {
  getNistMaturityScores,
  getNistGapReport,
  upsertNistControl,
  NIST_FUNCTIONS,
  type NistFunction,
  type MaturityLevel,
  type ControlStatus,
} from '../../services/compliance/nist.service.js'
import type { TokenPayload } from '../../types/index.js'

const router = Router()

// NIST CSF 2.0 function + subcategory definitions
router.get('/functions', requireAuth, (_req: Request, res: Response) => {
  res.json(NIST_FUNCTIONS)
})

// Maturity scores per function
router.get('/maturity', requireAuth, (_req: Request, res: Response) => {
  const scores = getNistMaturityScores()
  res.json(scores)
})

// Gap report — controls not yet compliant
router.get('/gaps', requireAuth, requireRole('CISO', 'AUDITOR'), (_req: Request, res: Response) => {
  const gaps = getNistGapReport()
  res.json(gaps)
})

// Upsert a single control assessment
const controlSchema = z.object({
  functionName: z.enum(['GOVERN', 'IDENTIFY', 'PROTECT', 'DETECT', 'RESPOND', 'RECOVER']),
  subcategory: z.string().min(2),
  status: z.enum(['compliant', 'partial', 'non_compliant', 'not_applicable']),
  maturityLevel: z.number().int().min(1).max(5),
  score: z.number().min(0).max(100),
  evidence: z.string().optional(),
  finding: z.string().optional(),
})

router.post('/controls', requireAuth, requireRole('CISO', 'AUDITOR'), (req: Request, res: Response) => {
  const data = controlSchema.parse(req.body)
  const actor = req.user as TokenPayload
  upsertNistControl({
    ...data,
    functionName: data.functionName as NistFunction,
    maturityLevel: data.maturityLevel as MaturityLevel,
    status: data.status as ControlStatus,
    assessorId: actor.sub,
  })
  res.status(201).json({ updated: true })
})

// Bulk upsert
router.post('/controls/bulk', requireAuth, requireRole('CISO', 'AUDITOR'), (req: Request, res: Response) => {
  const { controls } = z.object({ controls: z.array(controlSchema) }).parse(req.body)
  const actor = req.user as TokenPayload
  for (const c of controls) {
    upsertNistControl({
      ...c,
      functionName: c.functionName as NistFunction,
      maturityLevel: c.maturityLevel as MaturityLevel,
      status: c.status as ControlStatus,
      assessorId: actor.sub,
    })
  }
  res.status(201).json({ updated: controls.length })
})

export default router
