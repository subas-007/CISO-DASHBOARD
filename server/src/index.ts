import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { env } from './config/env.js'
import { applyMigrations } from './config/db.js'
import { redis } from './config/redis.js'
import './config/passport.js'

import { apiRateLimit } from './middleware/rateLimit.middleware.js'
import authRoutes from './routes/auth.routes.js'
import oauthRoutes from './routes/oauth.routes.js'
import usersRoutes from './routes/users.routes.js'
import auditRoutes from './routes/audit.routes.js'
import webhookRoutes from './routes/ingest/webhook.routes.js'
import dataRoutes from './routes/ingest/data.routes.js'
import riskRoutes from './routes/risk.routes.js'
import nistRoutes from './routes/compliance/nist.routes.js'
import iso27001Routes from './routes/compliance/iso27001.routes.js'
import workflowRoutes from './routes/compliance/workflow.routes.js'
import { startPollers } from './jobs/poller.js'
import { ingestWorker } from './workers/ingest.worker.js'
import { ensureWorkflowTables } from './services/compliance/auditWorkflow.service.js'

const app = express()

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet())
app.set('trust proxy', 1)

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}))

// ── Parsing ───────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api', apiRateLimit)

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() })
})

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/auth', oauthRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/webhooks', webhookRoutes)
app.use('/api/data', dataRoutes)
app.use('/api/risk', riskRoutes)
app.use('/api/compliance/nist', nistRoutes)
app.use('/api/compliance/iso27001', iso27001Routes)
app.use('/api/compliance/workflows', workflowRoutes)

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: env.NODE_ENV === 'development' ? err.message : 'Internal server error' })
})

// ── Boot ──────────────────────────────────────────────────────────────────────
async function start() {
  applyMigrations()
  ensureWorkflowTables()
  await redis.connect().catch(() => console.warn('⚠️  Redis unavailable — token blacklisting disabled'))

  // Start BullMQ workers and pollers (only when Redis is available)
  void ingestWorker
  startPollers()

  app.listen(env.PORT, () => {
    console.log(`\n🚀 CISO Backend running on http://localhost:${env.PORT}`)
    console.log(`   ENV: ${env.NODE_ENV}`)
    console.log(`   CORS: ${env.CORS_ORIGIN}\n`)
  })
}

start()
