import { Router, type Request, type Response } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'

const router = Router()

const RISK_ENGINE_URL = process.env['RISK_ENGINE_URL'] ?? 'http://localhost:5001'

async function proxyToRiskEngine(path: string, method: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${RISK_ENGINE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Risk engine error ${res.status}: ${text}`)
  }
  return res.json()
}

router.post('/simulate', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await proxyToRiskEngine('/api/risk/simulate', 'POST', req.body)
    res.json(result)
  } catch (err: unknown) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Risk engine unavailable' })
  }
})

router.post('/simulate/batch', requireAuth, requireRole('CISO', 'AUDITOR'), async (req: Request, res: Response) => {
  try {
    const result = await proxyToRiskEngine('/api/risk/simulate/batch', 'POST', req.body)
    res.json(result)
  } catch (err: unknown) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Risk engine unavailable' })
  }
})

router.post('/analyse', requireAuth, requireRole('CISO', 'AUDITOR', 'EXECUTIVE'), async (req: Request, res: Response) => {
  try {
    const result = await proxyToRiskEngine('/api/risk/analyse', 'POST', req.body)
    res.json(result)
  } catch (err: unknown) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Risk engine unavailable' })
  }
})

router.get('/presets', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await proxyToRiskEngine('/api/risk/presets', 'GET')
    res.json(result)
  } catch (err: unknown) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Risk engine unavailable' })
  }
})

export default router
