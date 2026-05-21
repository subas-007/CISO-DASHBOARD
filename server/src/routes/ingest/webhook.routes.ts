import { Router, type Request, type Response } from 'express'
import crypto from 'crypto'
import { ingestQueue } from '../../config/queues.js'

const router = Router()

// Shared HMAC signature verifier for webhook authenticity
function verifyHmac(secret: string, body: Buffer, signature: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}

// Raw body capture middleware (must precede express.json for these routes)
function rawBody(req: Request, _res: Response, next: () => void) {
  const chunks: Buffer[] = []
  req.on('data', (chunk: Buffer) => chunks.push(chunk))
  req.on('end', () => {
    ;(req as Request & { rawBody: Buffer }).rawBody = Buffer.concat(chunks)
    next()
  })
}

// ── Tenable webhook ───────────────────────────────────────────────────────────
router.post('/tenable', rawBody, async (req: Request, res: Response) => {
  const sig = req.headers['x-tenable-signature']
  const secret = process.env['TENABLE_WEBHOOK_SECRET']
  if (secret && sig && !verifyHmac(secret, (req as Request & { rawBody: Buffer }).rawBody, String(sig))) {
    res.status(401).json({ error: 'Invalid signature' })
    return
  }

  const body = JSON.parse((req as Request & { rawBody: Buffer }).rawBody.toString())
  await ingestQueue.add('webhook', { type: 'webhook', source: 'tenable', payload: body })
  res.status(202).json({ queued: true })
})

// ── Qualys webhook ────────────────────────────────────────────────────────────
router.post('/qualys', rawBody, async (req: Request, res: Response) => {
  const body = JSON.parse((req as Request & { rawBody: Buffer }).rawBody.toString())
  await ingestQueue.add('webhook', { type: 'webhook', source: 'qualys', payload: body })
  res.status(202).json({ queued: true })
})

// ── CrowdStrike webhook ───────────────────────────────────────────────────────
router.post('/crowdstrike', rawBody, async (req: Request, res: Response) => {
  const sig = req.headers['x-cs-signature']
  const secret = process.env['CROWDSTRIKE_WEBHOOK_SECRET']
  if (secret && sig && !verifyHmac(secret, (req as Request & { rawBody: Buffer }).rawBody, String(sig))) {
    res.status(401).json({ error: 'Invalid signature' })
    return
  }

  const body = JSON.parse((req as Request & { rawBody: Buffer }).rawBody.toString())
  await ingestQueue.add('webhook', { type: 'webhook', source: 'crowdstrike', payload: body })
  res.status(202).json({ queued: true })
})

// ── QRadar webhook ────────────────────────────────────────────────────────────
router.post('/qradar', rawBody, async (req: Request, res: Response) => {
  const body = JSON.parse((req as Request & { rawBody: Buffer }).rawBody.toString())
  await ingestQueue.add('webhook', { type: 'webhook', source: 'qradar', payload: body })
  res.status(202).json({ queued: true })
})

// ── Microsoft Sentinel webhook ────────────────────────────────────────────────
router.post('/sentinel', rawBody, async (req: Request, res: Response) => {
  const body = JSON.parse((req as Request & { rawBody: Buffer }).rawBody.toString())
  await ingestQueue.add('webhook', { type: 'webhook', source: 'sentinel', payload: body })
  res.status(202).json({ queued: true })
})

export default router
