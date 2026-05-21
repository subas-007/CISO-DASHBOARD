import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'
import { db } from '../config/db.js'
import {
  CONNECTOR_SCHEMAS,
  testConnector,
  syncConnector,
  type ConnectorSource,
} from '../services/connector.service.js'

const router = Router()

// ── GET /api/integrations/schemas ─────────────────────────────────────────────
// Returns what parameters each connector needs (no auth — used by UI to render forms)
router.get('/schemas', (_req: Request, res: Response) => {
  res.json(CONNECTOR_SCHEMAS)
})

// ── GET /api/integrations ─────────────────────────────────────────────────────
// List all saved connections (no credentials returned)
router.get('/', requireAuth, (_req: Request, res: Response) => {
  const rows = db.prepare(`
    SELECT id, name, source, enabled, last_sync_at, last_error, created_at, updated_at
    FROM integration_configs
    ORDER BY created_at DESC
  `).all()
  res.json(rows)
})

// ── POST /api/integrations/connect ───────────────────────────────────────────
// Test a connection and save it only if successful
const connectSchema = z.object({
  source: z.string(),
  name: z.string().min(2),
  params: z.record(z.string()),
})

router.post('/connect', requireAuth, requireRole('CISO'), async (req: Request, res: Response) => {
  const { source, name, params } = connectSchema.parse(req.body)

  // Test the connection first
  const testResult = await testConnector(source as ConnectorSource, params)

  if (!testResult.ok) {
    res.status(400).json({ ok: false, message: testResult.message, latencyMs: testResult.latencyMs })
    return
  }

  // Connection OK — save to DB
  const id = uuidv4()
  db.prepare(`
    INSERT INTO integration_configs (id, name, type, source, config, enabled, last_sync_at)
    VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
    ON CONFLICT(name) DO UPDATE SET
      source = excluded.source,
      type   = excluded.type,
      config = excluded.config,
      enabled = 1,
      last_error = NULL,
      last_sync_at = datetime('now'),
      updated_at = datetime('now')
  `).run(id, name, source, source, JSON.stringify(params))

  const saved = db.prepare('SELECT id FROM integration_configs WHERE name = ?').get(name) as { id: string }
  res.status(201).json({ ok: true, id: saved.id, message: testResult.message, latencyMs: testResult.latencyMs })
})

// ── POST /api/integrations/:id/test ──────────────────────────────────────────
// Re-test an existing saved connection
router.post('/:id/test', requireAuth, requireRole('CISO'), async (req: Request, res: Response) => {
  const id = String(req.params['id'])
  const row = db.prepare('SELECT source, config FROM integration_configs WHERE id = ?').get(id) as
    | { source: string; config: string }
    | undefined

  if (!row) { res.status(404).json({ error: 'Integration not found' }); return }

  const params = JSON.parse(row.config) as Record<string, string>
  const result = await testConnector(row.source as ConnectorSource, params)

  if (result.ok) {
    db.prepare(`UPDATE integration_configs SET last_error = NULL, updated_at = datetime('now') WHERE id = ?`).run(id)
  } else {
    db.prepare(`UPDATE integration_configs SET last_error = ?, updated_at = datetime('now') WHERE id = ?`).run(result.message, id)
  }

  res.json(result)
})

// ── POST /api/integrations/:id/sync ──────────────────────────────────────────
// Pull data from a saved connection right now
router.post('/:id/sync', requireAuth, requireRole('CISO', 'SOC_ANALYST'), async (req: Request, res: Response) => {
  const id = String(req.params['id'])
  const row = db.prepare('SELECT source, config FROM integration_configs WHERE id = ?').get(id) as
    | { source: string; config: string }
    | undefined

  if (!row) { res.status(404).json({ error: 'Integration not found' }); return }

  const params = JSON.parse(row.config) as Record<string, string>

  try {
    const result = await syncConnector(row.source as ConnectorSource, params)
    db.prepare(`
      UPDATE integration_configs SET last_sync_at = datetime('now'), last_error = NULL WHERE id = ?
    `).run(id)
    res.json({ ok: true, ...result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    db.prepare(`UPDATE integration_configs SET last_error = ? WHERE id = ?`).run(msg, id)
    res.status(502).json({ ok: false, error: msg })
  }
})

// ── PATCH /api/integrations/:id ───────────────────────────────────────────────
// Enable / disable without reconnecting
router.patch('/:id', requireAuth, requireRole('CISO'), (req: Request, res: Response) => {
  const id = String(req.params['id'])
  const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body)
  db.prepare(`UPDATE integration_configs SET enabled = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(enabled ? 1 : 0, id)
  res.json({ ok: true })
})

// ── DELETE /api/integrations/:id ─────────────────────────────────────────────
// Disconnect and remove
router.delete('/:id', requireAuth, requireRole('CISO'), (req: Request, res: Response) => {
  const id = String(req.params['id'])
  db.prepare('DELETE FROM integration_configs WHERE id = ?').run(id)
  res.json({ ok: true })
})

export default router
