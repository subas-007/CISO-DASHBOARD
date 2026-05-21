import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js'
import {
  createWorkflow,
  advanceWorkflow,
  revertWorkflow,
  getWorkflow,
  listWorkflows,
  getWorkflowHistory,
  type WorkflowStage,
} from '../../services/compliance/auditWorkflow.service.js'
import type { TokenPayload } from '../../types/index.js'

const router = Router()

// List workflows
router.get('/', requireAuth, requireRole('CISO', 'AUDITOR', 'EXECUTIVE'), (req: Request, res: Response) => {
  const stage = req.query['stage'] as WorkflowStage | undefined
  res.json(listWorkflows(stage))
})

// Create workflow
router.post('/', requireAuth, requireRole('CISO', 'AUDITOR'), (req: Request, res: Response) => {
  const data = z.object({
    reportId: z.string().min(1),
    reportName: z.string().min(2),
    notes: z.string().optional(),
  }).parse(req.body)

  const actor = req.user as TokenPayload
  const workflow = createWorkflow({ ...data, createdBy: actor.sub })
  res.status(201).json(workflow)
})

// Get workflow + history
router.get('/:id', requireAuth, requireRole('CISO', 'AUDITOR', 'EXECUTIVE'), (req: Request, res: Response) => {
  const id = String(req.params['id'])
  const workflow = getWorkflow(id)
  if (!workflow) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }
  const history = getWorkflowHistory(id)
  res.json({ workflow, history })
})

// Advance stage
router.post('/:id/advance', requireAuth, requireRole('CISO', 'AUDITOR', 'EXECUTIVE'), (req: Request, res: Response) => {
  const id = String(req.params['id'])
  const { comment } = z.object({ comment: z.string().optional() }).parse(req.body)
  const actor = req.user as TokenPayload

  const workflow = getWorkflow(id)
  if (!workflow) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }

  // Board approval requires CISO or EXECUTIVE role
  if (workflow.stage === 'CISO_APPROVED' && !['CISO', 'EXECUTIVE'].includes(actor.role)) {
    res.status(403).json({ error: 'Board approval requires CISO or EXECUTIVE role' })
    return
  }

  // CISO approval requires CISO role
  if (workflow.stage === 'UNDER_REVIEW' && actor.role !== 'CISO') {
    res.status(403).json({ error: 'CISO approval requires CISO role' })
    return
  }

  const updated = advanceWorkflow({ workflowId: id, actorId: actor.sub, comment })
  res.json(updated)
})

// Revert stage — CISO only
router.post('/:id/revert', requireAuth, requireRole('CISO'), (req: Request, res: Response) => {
  const id = String(req.params['id'])
  const { comment } = z.object({ comment: z.string().optional() }).parse(req.body)
  const actor = req.user as TokenPayload

  const updated = revertWorkflow({ workflowId: id, actorId: actor.sub, comment })
  if (!updated) {
    res.status(404).json({ error: 'Workflow not found' })
    return
  }
  res.json(updated)
})

export default router
