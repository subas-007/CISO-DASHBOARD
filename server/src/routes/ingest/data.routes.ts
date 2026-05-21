import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js'
import {
  listVulns,
  listEvents,
  getVulnStats,
} from '../../services/ingest.service.js'
import { db } from '../../config/db.js'

const router = Router()

// ── Vulnerabilities ───────────────────────────────────────────────────────────
router.get('/vulnerabilities', requireAuth, (req: Request, res: Response) => {
  const query = z.object({
    severity: z.enum(['critical', 'high', 'medium', 'low', 'informational']).optional(),
    status: z.enum(['open', 'in_progress', 'resolved', 'accepted_risk']).optional(),
    source: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(500).default(100),
    offset: z.coerce.number().int().min(0).default(0),
  }).parse(req.query)

  const vulns = listVulns(query)
  res.json({ data: vulns, limit: query.limit, offset: query.offset })
})

router.get('/vulnerabilities/stats', requireAuth, (_req: Request, res: Response) => {
  res.json(getVulnStats())
})

router.patch('/vulnerabilities/:id', requireAuth, requireRole('CISO', 'SOC_ANALYST'), (req: Request, res: Response) => {
  const id = String(req.params['id'])
  const { status } = z.object({
    status: z.enum(['open', 'in_progress', 'resolved', 'accepted_risk']),
  }).parse(req.body)

  const updated = db.prepare(`
    UPDATE vulnerabilities SET status = @status, updated_at = datetime('now')
    ${status === 'resolved' ? ", resolved_at = datetime('now')" : ''}
    WHERE id = @id
  `).run({ status, id })

  if (updated.changes === 0) {
    res.status(404).json({ error: 'Vulnerability not found' })
    return
  }
  res.json({ updated: true })
})

// ── Security Events ───────────────────────────────────────────────────────────
router.get('/events', requireAuth, (req: Request, res: Response) => {
  const query = z.object({
    source: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(500).default(100),
    offset: z.coerce.number().int().min(0).default(0),
  }).parse(req.query)

  const events = listEvents(query)
  res.json({ data: events, limit: query.limit, offset: query.offset })
})

// ── Integration configs ───────────────────────────────────────────────────────
const integrationSchema = z.object({
  name: z.string().min(2),
  type: z.enum(['siem', 'vuln_scanner', 'edr', 'ticketing']),
  config: z.record(z.string(), z.unknown()).default({}),
  enabled: z.boolean().default(true),
})

router.get('/integrations', requireAuth, requireRole('CISO'), (_req, res) => {
  const rows = db.prepare('SELECT id, name, type, enabled, last_sync_at, last_error, created_at FROM integration_configs ORDER BY name').all()
  res.json(rows)
})

router.post('/integrations', requireAuth, requireRole('CISO'), async (req: Request, res: Response) => {
  const { v4: uuidv4 } = await import('uuid')
  const data = integrationSchema.parse(req.body)
  const id = uuidv4()
  db.prepare(`
    INSERT INTO integration_configs (id, name, type, config, enabled)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, data.name, data.type, JSON.stringify(data.config), data.enabled ? 1 : 0)
  res.status(201).json({ id })
})

router.patch('/integrations/:id', requireAuth, requireRole('CISO'), (req: Request, res: Response) => {
  const id = String(req.params['id'])
  const data = integrationSchema.partial().parse(req.body)

  const updates: string[] = ["updated_at = datetime('now')"]
  const bindings: Record<string, unknown> = { id }

  if (data.enabled !== undefined) { updates.push('enabled = @enabled'); bindings['enabled'] = data.enabled ? 1 : 0 }
  if (data.config !== undefined) { updates.push('config = @config'); bindings['config'] = JSON.stringify(data.config) }

  db.prepare(`UPDATE integration_configs SET ${updates.join(', ')} WHERE id = @id`).run(bindings)
  res.json({ updated: true })
})

export default router
