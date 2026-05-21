import cron from 'node-cron'
import axios from 'axios'
import { db } from '../config/db.js'
import {
  upsertVuln,
  ingestEvent,
  normalizeTenableVuln,
  normalizeQualysVuln,
} from '../services/ingest.service.js'

interface IntegrationConfig {
  id: string
  name: string
  type: string
  enabled: number
  config: string
  last_sync_at: string | null
  last_error: string | null
}

function getIntegrations(type?: string): IntegrationConfig[] {
  if (type) {
    return db.prepare('SELECT * FROM integration_configs WHERE type = ? AND enabled = 1').all(type) as IntegrationConfig[]
  }
  return db.prepare('SELECT * FROM integration_configs WHERE enabled = 1').all() as IntegrationConfig[]
}

function markSyncSuccess(id: string) {
  db.prepare(`UPDATE integration_configs SET last_sync_at = datetime('now'), last_error = NULL WHERE id = ?`).run(id)
}

function markSyncError(id: string, error: string) {
  db.prepare(`UPDATE integration_configs SET last_error = ?, updated_at = datetime('now') WHERE id = ?`).run(error, id)
}

// ── Tenable.io polling ────────────────────────────────────────────────────────
async function pollTenable(integration: IntegrationConfig) {
  const cfg = JSON.parse(integration.config) as { access_key?: string; secret_key?: string; url?: string }
  if (!cfg.access_key || !cfg.secret_key) return

  try {
    const res = await axios.get(
      `${cfg.url ?? 'https://cloud.tenable.com'}/workbenches/vulnerabilities`,
      {
        headers: {
          'X-ApiKeys': `accessKey=${cfg.access_key};secretKey=${cfg.secret_key}`,
          Accept: 'application/json',
        },
        timeout: 30000,
      }
    )

    const vulns: unknown[] = (res.data as { vulnerabilities?: unknown[] }).vulnerabilities ?? []
    for (const v of vulns) {
      upsertVuln(normalizeTenableVuln(v as Record<string, unknown>))
    }

    markSyncSuccess(integration.id)
    console.log(`✅ Tenable poll: ${vulns.length} vulnerabilities ingested`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    markSyncError(integration.id, msg)
    console.error(`❌ Tenable poll failed:`, msg)
  }
}

// ── Qualys polling ────────────────────────────────────────────────────────────
async function pollQualys(integration: IntegrationConfig) {
  const cfg = JSON.parse(integration.config) as { username?: string; password?: string; url?: string }
  if (!cfg.username || !cfg.password) return

  try {
    const res = await axios.post(
      `${cfg.url ?? 'https://qualysapi.qualys.com'}/api/2.0/fo/asset/host/vm/detection/`,
      'action=list&output_format=json',
      {
        auth: { username: cfg.username, password: cfg.password },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'ciso-backend' },
        timeout: 30000,
      }
    )

    const detections: unknown[] =
      (res.data as { DETECTION_LIST?: { DETECTION?: unknown[] } })?.DETECTION_LIST?.DETECTION ?? []
    for (const d of detections) {
      upsertVuln(normalizeQualysVuln(d as Record<string, unknown>))
    }

    markSyncSuccess(integration.id)
    console.log(`✅ Qualys poll: ${detections.length} detections ingested`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    markSyncError(integration.id, msg)
    console.error(`❌ Qualys poll failed:`, msg)
  }
}

// ── CrowdStrike polling ───────────────────────────────────────────────────────
async function pollCrowdStrike(integration: IntegrationConfig) {
  const cfg = JSON.parse(integration.config) as { client_id?: string; client_secret?: string; url?: string }
  if (!cfg.client_id || !cfg.client_secret) return

  try {
    // Get OAuth token
    const tokenRes = await axios.post(
      `${cfg.url ?? 'https://api.crowdstrike.com'}/oauth2/token`,
      `client_id=${cfg.client_id}&client_secret=${cfg.client_secret}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
    )
    const token = (tokenRes.data as { access_token: string }).access_token

    const detectRes = await axios.get(
      `${cfg.url ?? 'https://api.crowdstrike.com'}/detects/queries/detects/v1?limit=100&filter=status:'new'`,
      { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
    )

    const ids: string[] = (detectRes.data as { resources: string[] }).resources ?? []
    if (ids.length === 0) return markSyncSuccess(integration.id)

    const detailRes = await axios.post(
      `${cfg.url ?? 'https://api.crowdstrike.com'}/detects/entities/summaries/GET/v1`,
      { ids },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 }
    )

    const detects: unknown[] = (detailRes.data as { resources: unknown[] }).resources ?? []
    for (const d of detects) {
      ingestEvent({
        source: 'crowdstrike',
        eventType: 'detection',
        severity: String((d as Record<string, unknown>)['max_severity_displayname'] ?? 'medium').toLowerCase(),
        title: String((d as Record<string, unknown>)['display_name'] ?? 'CrowdStrike Detection'),
        assetId: String((d as Record<string, unknown>)['device_id'] ?? ''),
        rawData: d,
      })
    }

    markSyncSuccess(integration.id)
    console.log(`✅ CrowdStrike poll: ${detects.length} detections ingested`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    markSyncError(integration.id, msg)
    console.error(`❌ CrowdStrike poll failed:`, msg)
  }
}

// ── Scheduler ─────────────────────────────────────────────────────────────────
export function startPollers() {
  // Every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    const vulnScanners = getIntegrations('vuln_scanner')
    for (const integration of vulnScanners) {
      if (integration.name.toLowerCase().includes('tenable')) await pollTenable(integration)
      else if (integration.name.toLowerCase().includes('qualys')) await pollQualys(integration)
    }

    const edrSystems = getIntegrations('edr')
    for (const integration of edrSystems) {
      if (integration.name.toLowerCase().includes('crowdstrike')) await pollCrowdStrike(integration)
    }
  })

  console.log('✅ Pollers scheduled (every 15 min)')
}
