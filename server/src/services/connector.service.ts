import axios from 'axios'
import https from 'https'
import { upsertVuln, ingestEvent, normalizeTenableVuln, normalizeQualysVuln, normalizeCrowdStrikeAlert } from './ingest.service.js'

export type ConnectorSource =
  | 'tenable' | 'qualys' | 'crowdstrike' | 'sentinelone'
  | 'splunk' | 'sentinel' | 'qradar'
  | 'snyk' | 'github' | 'wiz'

export interface ParamDef {
  key: string
  label: string
  type: 'text' | 'password' | 'url'
  required: boolean
  placeholder?: string
}

export interface ConnectorSchema {
  source: ConnectorSource
  label: string
  category: 'siem' | 'vuln_scanner' | 'edr' | 'appsec'
  params: ParamDef[]
}

export const CONNECTOR_SCHEMAS: Record<ConnectorSource, ConnectorSchema> = {
  tenable: {
    source: 'tenable', label: 'Tenable.io', category: 'vuln_scanner',
    params: [
      { key: 'url', label: 'Base URL', type: 'url', required: false, placeholder: 'https://cloud.tenable.com' },
      { key: 'accessKey', label: 'Access Key', type: 'text', required: true, placeholder: 'Tenable access key' },
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true, placeholder: 'Tenable secret key' },
    ],
  },
  qualys: {
    source: 'qualys', label: 'Qualys VMDR', category: 'vuln_scanner',
    params: [
      { key: 'url', label: 'API Server', type: 'url', required: false, placeholder: 'https://qualysapi.qualys.com' },
      { key: 'username', label: 'Username', type: 'text', required: true, placeholder: 'Qualys username' },
      { key: 'password', label: 'Password', type: 'password', required: true, placeholder: 'Qualys password' },
    ],
  },
  crowdstrike: {
    source: 'crowdstrike', label: 'CrowdStrike Falcon', category: 'edr',
    params: [
      { key: 'url', label: 'API Base URL', type: 'url', required: false, placeholder: 'https://api.crowdstrike.com' },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true, placeholder: 'OAuth2 Client ID' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true, placeholder: 'OAuth2 Client Secret' },
    ],
  },
  sentinelone: {
    source: 'sentinelone', label: 'SentinelOne', category: 'edr',
    params: [
      { key: 'url', label: 'Console URL', type: 'url', required: true, placeholder: 'https://usea1-012.sentinelone.net' },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true, placeholder: 'SentinelOne API token' },
    ],
  },
  splunk: {
    source: 'splunk', label: 'Splunk Enterprise', category: 'siem',
    params: [
      { key: 'url', label: 'Server URL', type: 'url', required: true, placeholder: 'https://splunk.company.com:8089' },
      { key: 'username', label: 'Username', type: 'text', required: true, placeholder: 'admin' },
      { key: 'password', label: 'Password', type: 'password', required: true, placeholder: 'Splunk password' },
    ],
  },
  sentinel: {
    source: 'sentinel', label: 'Microsoft Sentinel', category: 'siem',
    params: [
      { key: 'workspaceId', label: 'Workspace ID', type: 'text', required: true, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { key: 'primaryKey', label: 'Primary Key', type: 'password', required: true, placeholder: 'Workspace primary key' },
      { key: 'subscriptionId', label: 'Subscription ID', type: 'text', required: false, placeholder: 'Azure subscription ID (optional)' },
    ],
  },
  qradar: {
    source: 'qradar', label: 'IBM QRadar', category: 'siem',
    params: [
      { key: 'url', label: 'Console URL', type: 'url', required: true, placeholder: 'https://qradar.company.com' },
      { key: 'secToken', label: 'SEC Token', type: 'password', required: true, placeholder: 'QRadar API token' },
    ],
  },
  snyk: {
    source: 'snyk', label: 'Snyk Security', category: 'appsec',
    params: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true, placeholder: 'Snyk API token' },
      { key: 'orgId', label: 'Organization ID', type: 'text', required: false, placeholder: 'Snyk org ID (optional)' },
    ],
  },
  github: {
    source: 'github', label: 'GitHub Advanced Security', category: 'appsec',
    params: [
      { key: 'pat', label: 'Personal Access Token', type: 'password', required: true, placeholder: 'ghp_xxxxxxxxxxxx' },
      { key: 'orgName', label: 'Organization Name', type: 'text', required: false, placeholder: 'my-github-org (optional)' },
    ],
  },
  wiz: {
    source: 'wiz', label: 'Wiz Cloud Security', category: 'vuln_scanner',
    params: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true, placeholder: 'Wiz OAuth client ID' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true, placeholder: 'Wiz OAuth client secret' },
      { key: 'url', label: 'API URL', type: 'url', required: false, placeholder: 'https://api.wiz.io' },
    ],
  },
}

// Allow self-signed TLS (common in on-prem Splunk / QRadar)
const insecureAgent = new https.Agent({ rejectUnauthorized: false })

function httpError(err: unknown): string {
  const e = err as { response?: { status: number }; message?: string }
  const status = e.response?.status
  const msg = e.message ?? String(err)
  if (status === 401) return 'Authentication failed — check credentials'
  if (status === 403) return 'Access denied — insufficient permissions'
  if (status === 404) return 'Endpoint not found — check the URL'
  if (status === 429) return 'Rate limited — wait before retrying'
  if (msg.includes('ECONNREFUSED')) return 'Connection refused — check URL and firewall rules'
  if (msg.includes('ENOTFOUND')) return 'Hostname not found — check the URL'
  if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) return 'Connection timed out — check network or URL'
  if (msg.includes('certificate')) return 'TLS certificate error — try with an on-prem URL'
  return msg
}

// ── Test: try to reach the source and verify credentials ─────────────────────
export async function testConnector(
  source: ConnectorSource,
  params: Record<string, string>
): Promise<{ ok: boolean; message: string; latencyMs: number }> {
  const start = Date.now()
  try {
    switch (source) {
      case 'tenable': {
        const base = params.url?.replace(/\/$/, '') || 'https://cloud.tenable.com'
        await axios.get(`${base}/workbenches/vulnerabilities`, {
          headers: { 'X-ApiKeys': `accessKey=${params.accessKey};secretKey=${params.secretKey}` },
          params: { num_assets: 0 },
          timeout: 10_000,
        })
        break
      }
      case 'qualys': {
        const base = params.url?.replace(/\/$/, '') || 'https://qualysapi.qualys.com'
        await axios.post(`${base}/api/2.0/fo/about/`, 'output_format=json', {
          auth: { username: params.username, password: params.password },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'ciso-dashboard',
          },
          timeout: 10_000,
        })
        break
      }
      case 'crowdstrike': {
        const base = params.url?.replace(/\/$/, '') || 'https://api.crowdstrike.com'
        const r = await axios.post(
          `${base}/oauth2/token`,
          `client_id=${params.clientId}&client_secret=${params.clientSecret}`,
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10_000 }
        )
        if (!(r.data as { access_token?: string }).access_token) throw new Error('No access_token returned')
        break
      }
      case 'sentinelone': {
        await axios.get(`${params.url?.replace(/\/$/, '')}/web/api/v2.1/system/status`, {
          headers: { Authorization: `ApiToken ${params.apiToken}` },
          timeout: 10_000,
        })
        break
      }
      case 'splunk': {
        await axios.get(`${params.url?.replace(/\/$/, '')}/services/authentication/current-context`, {
          auth: { username: params.username, password: params.password },
          params: { output_mode: 'json' },
          timeout: 10_000,
          httpsAgent: insecureAgent,
        })
        break
      }
      case 'qradar': {
        await axios.get(`${params.url?.replace(/\/$/, '')}/api/system/information`, {
          headers: { SEC: params.secToken, Accept: 'application/json' },
          timeout: 10_000,
          httpsAgent: insecureAgent,
        })
        break
      }
      case 'snyk': {
        await axios.get('https://api.snyk.io/v1/user/me', {
          headers: { Authorization: `token ${params.apiToken}` },
          timeout: 10_000,
        })
        break
      }
      case 'github': {
        await axios.get('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${params.pat}`,
            Accept: 'application/vnd.github+json',
          },
          timeout: 10_000,
        })
        break
      }
      case 'wiz': {
        const base = params.url?.replace(/\/$/, '') || 'https://auth.app.wiz.io'
        const r = await axios.post(
          `${base}/oauth/token`,
          `grant_type=client_credentials&client_id=${params.clientId}&client_secret=${params.clientSecret}&audience=wiz-api`,
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10_000 }
        )
        if (!(r.data as { access_token?: string }).access_token) throw new Error('No access_token returned')
        break
      }
      case 'sentinel': {
        if (!/^[0-9a-f-]{36}$/i.test(params.workspaceId ?? ''))
          throw new Error('Invalid Workspace ID — must be a UUID')
        if ((params.primaryKey ?? '').length < 20)
          throw new Error('Primary Key is too short')
        break
      }
    }
    return { ok: true, message: 'Connection successful', latencyMs: Date.now() - start }
  } catch (err) {
    return { ok: false, message: httpError(err), latencyMs: Date.now() - start }
  }
}

// ── Sync: pull data from the source into the DB ───────────────────────────────
export async function syncConnector(
  source: ConnectorSource,
  params: Record<string, string>
): Promise<{ synced: number }> {
  switch (source) {
    case 'tenable': {
      const base = params.url?.replace(/\/$/, '') || 'https://cloud.tenable.com'
      const res = await axios.get(`${base}/workbenches/vulnerabilities`, {
        headers: { 'X-ApiKeys': `accessKey=${params.accessKey};secretKey=${params.secretKey}` },
        timeout: 30_000,
      })
      const vulns: unknown[] = (res.data as { vulnerabilities?: unknown[] }).vulnerabilities ?? []
      for (const v of vulns) upsertVuln(normalizeTenableVuln(v as Record<string, unknown>))
      return { synced: vulns.length }
    }
    case 'qualys': {
      const base = params.url?.replace(/\/$/, '') || 'https://qualysapi.qualys.com'
      const res = await axios.post(
        `${base}/api/2.0/fo/asset/host/vm/detection/`,
        'action=list&output_format=json',
        {
          auth: { username: params.username, password: params.password },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'ciso-dashboard',
          },
          timeout: 30_000,
        }
      )
      const detections: unknown[] =
        (res.data as { DETECTION_LIST?: { DETECTION?: unknown[] } })?.DETECTION_LIST?.DETECTION ?? []
      for (const d of detections) upsertVuln(normalizeQualysVuln(d as Record<string, unknown>))
      return { synced: detections.length }
    }
    case 'crowdstrike': {
      const base = params.url?.replace(/\/$/, '') || 'https://api.crowdstrike.com'
      const tr = await axios.post(
        `${base}/oauth2/token`,
        `client_id=${params.clientId}&client_secret=${params.clientSecret}`,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15_000 }
      )
      const token = (tr.data as { access_token: string }).access_token
      const ir = await axios.get(`${base}/detects/queries/detects/v1`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 100, filter: "status:'new'" },
        timeout: 30_000,
      })
      const ids: string[] = (ir.data as { resources: string[] }).resources ?? []
      if (!ids.length) return { synced: 0 }
      const dr = await axios.post(
        `${base}/detects/entities/summaries/GET/v1`,
        { ids },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 30_000 }
      )
      const detects: unknown[] = (dr.data as { resources: unknown[] }).resources ?? []
      for (const d of detects) ingestEvent(normalizeCrowdStrikeAlert(d as Record<string, unknown>))
      return { synced: detects.length }
    }
    case 'snyk': {
      const orgParam = params.orgId ? `org=${params.orgId}&` : ''
      const res = await axios.get(`https://api.snyk.io/v1/reporting/issues/?${orgParam}version=2024-10-15`, {
        headers: { Authorization: `token ${params.apiToken}` },
        timeout: 30_000,
      })
      const issues: unknown[] = (res.data as { results?: unknown[] }).results ?? []
      for (const issue of issues) {
        const i = issue as Record<string, unknown>
        upsertVuln({
          source: 'snyk',
          externalId: String(i['id'] ?? ''),
          cveId: undefined,
          title: String((i['issue'] as Record<string, unknown>)?.['title'] ?? 'Snyk Finding'),
          severity: String((i['issue'] as Record<string, unknown>)?.['severity'] ?? 'medium') as 'critical' | 'high' | 'medium' | 'low' | 'informational',
          cvssScore: undefined,
          assetId: String((i['project'] as Record<string, unknown>)?.['id'] ?? ''),
          assetName: String((i['project'] as Record<string, unknown>)?.['name'] ?? ''),
          rawData: issue,
        })
      }
      return { synced: issues.length }
    }
    case 'github': {
      const org = params.orgName
      if (!org) return { synced: 0 }
      const res = await axios.get(`https://api.github.com/orgs/${org}/dependabot/alerts`, {
        headers: { Authorization: `Bearer ${params.pat}`, Accept: 'application/vnd.github+json' },
        params: { state: 'open', per_page: 100 },
        timeout: 30_000,
      })
      const alerts: unknown[] = (res.data as unknown[]) ?? []
      for (const alert of alerts) {
        const a = alert as Record<string, unknown>
        const adv = (a['security_advisory'] as Record<string, unknown>) ?? {}
        upsertVuln({
          source: 'github',
          externalId: String(a['number'] ?? ''),
          cveId: (adv['cve_id'] as string | null) ?? undefined,
          title: String(adv['summary'] ?? 'GitHub Dependabot Alert'),
          severity: String(adv['severity'] ?? 'medium') as 'critical' | 'high' | 'medium' | 'low' | 'informational',
          cvssScore: (adv['cvss'] as { score?: number })?.score,
          assetId: String((a['repository'] as Record<string, unknown>)?.['full_name'] ?? ''),
          assetName: String((a['repository'] as Record<string, unknown>)?.['name'] ?? ''),
          rawData: alert,
        })
      }
      return { synced: alerts.length }
    }
    default:
      return { synced: 0 }
  }
}
