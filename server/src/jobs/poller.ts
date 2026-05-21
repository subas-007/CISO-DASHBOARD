import cron from 'node-cron'
import { db } from '../config/db.js'
import { syncConnector, type ConnectorSource } from '../services/connector.service.js'

interface IntegrationRow {
  id: string
  name: string
  source: string
  config: string
}

function getActiveConnections(): IntegrationRow[] {
  return db.prepare(`
    SELECT id, name, source, config
    FROM integration_configs
    WHERE enabled = 1 AND source IS NOT NULL
  `).all() as IntegrationRow[]
}

function markSuccess(id: string) {
  db.prepare(`
    UPDATE integration_configs SET last_sync_at = datetime('now'), last_error = NULL WHERE id = ?
  `).run(id)
}

function markError(id: string, message: string) {
  db.prepare(`
    UPDATE integration_configs SET last_error = ?, updated_at = datetime('now') WHERE id = ?
  `).run(message, id)
}

async function syncOne(row: IntegrationRow) {
  const params = JSON.parse(row.config) as Record<string, string>
  try {
    const result = await syncConnector(row.source as ConnectorSource, params)
    markSuccess(row.id)
    console.log(`✅ [poller] ${row.source} (${row.name}) — synced ${result.synced} records`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    markError(row.id, msg)
    console.error(`❌ [poller] ${row.source} (${row.name}) failed: ${msg}`)
  }
}

export function startPollers() {
  // Every 15 minutes — poll all enabled connectors
  cron.schedule('*/15 * * * *', async () => {
    const connections = getActiveConnections()
    if (connections.length === 0) return
    console.log(`[poller] Running sync for ${connections.length} connection(s)`)
    await Promise.allSettled(connections.map(syncOne))
  })

  console.log('✅ Pollers scheduled (every 15 min)')
}
