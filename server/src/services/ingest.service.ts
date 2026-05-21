import { v4 as uuidv4 } from 'uuid'
import { db } from '../config/db.js'

export interface VulnRecord {
  id: string
  source: string
  external_id: string | null
  cve_id: string | null
  title: string
  severity: string
  cvss_score: number | null
  asset_id: string | null
  asset_name: string | null
  status: string
  sla_due_at: string | null
  discovered_at: string
  resolved_at: string | null
  raw_data: string | null
  created_at: string
  updated_at: string
}

export interface SecurityEvent {
  id: string
  source: string
  event_type: string
  severity: string
  title: string
  description: string | null
  asset_id: string | null
  asset_name: string | null
  mitre_tactic: string | null
  mitre_technique: string | null
  status: string
  occurred_at: string
  ingested_at: string
  raw_data: string | null
}

// ── SLA thresholds (days) per severity ────────────────────────────────────────
const SLA_DAYS: Record<string, number> = {
  critical: 15,
  high: 30,
  medium: 90,
  low: 180,
  informational: 365,
}

function slaDate(severity: string, discoveredAt: Date = new Date()): string {
  const days = SLA_DAYS[severity.toLowerCase()] ?? 90
  const due = new Date(discoveredAt)
  due.setDate(due.getDate() + days)
  return due.toISOString()
}

// ── Upsert vulnerability ──────────────────────────────────────────────────────
export function upsertVuln(params: {
  source: string
  externalId?: string
  cveId?: string
  title: string
  severity: string
  cvssScore?: number
  assetId?: string
  assetName?: string
  discoveredAt?: string
  rawData?: unknown
}): string {
  const id = uuidv4()
  const discoveredAt = params.discoveredAt ?? new Date().toISOString()
  const sla = slaDate(params.severity, new Date(discoveredAt))

  db.prepare(`
    INSERT INTO vulnerabilities
      (id, source, external_id, cve_id, title, severity, cvss_score, asset_id, asset_name, sla_due_at, discovered_at, raw_data)
    VALUES
      (@id, @source, @externalId, @cveId, @title, @severity, @cvssScore, @assetId, @assetName, @slaDate, @discoveredAt, @rawData)
    ON CONFLICT(id) DO NOTHING
  `).run({
    id,
    source: params.source,
    externalId: params.externalId ?? null,
    cveId: params.cveId ?? null,
    title: params.title,
    severity: params.severity.toLowerCase(),
    cvssScore: params.cvssScore ?? null,
    assetId: params.assetId ?? null,
    assetName: params.assetName ?? null,
    slaDate: sla,
    discoveredAt,
    rawData: params.rawData ? JSON.stringify(params.rawData) : null,
  })
  return id
}

// ── Ingest security event ─────────────────────────────────────────────────────
export function ingestEvent(params: {
  source: string
  eventType: string
  severity: string
  title: string
  description?: string
  assetId?: string
  assetName?: string
  mitreTactic?: string
  mitreTechnique?: string
  occurredAt?: string
  rawData?: unknown
}): string {
  const id = uuidv4()
  db.prepare(`
    INSERT INTO security_events
      (id, source, event_type, severity, title, description, asset_id, asset_name, mitre_tactic, mitre_technique, occurred_at, raw_data)
    VALUES
      (@id, @source, @eventType, @severity, @title, @description, @assetId, @assetName, @mitreTactic, @mitreTechnique, @occurredAt, @rawData)
  `).run({
    id,
    source: params.source,
    eventType: params.eventType,
    severity: params.severity.toLowerCase(),
    title: params.title,
    description: params.description ?? null,
    assetId: params.assetId ?? null,
    assetName: params.assetName ?? null,
    mitreTactic: params.mitreTactic ?? null,
    mitreTechnique: params.mitreTechnique ?? null,
    occurredAt: params.occurredAt ?? new Date().toISOString(),
    rawData: params.rawData ? JSON.stringify(params.rawData) : null,
  })
  return id
}

// ── Normalizers ───────────────────────────────────────────────────────────────

export function normalizeTenableVuln(raw: Record<string, unknown>) {
  return {
    source: 'tenable' as const,
    externalId: String(raw['plugin_id'] ?? ''),
    cveId: String(raw['cve'] ?? ''),
    title: String(raw['plugin_name'] ?? 'Unknown'),
    severity: mapTenableSeverity(Number(raw['severity'] ?? 0)),
    cvssScore: raw['cvss3_base_score'] ? Number(raw['cvss3_base_score']) : undefined,
    assetId: raw['asset_id'] ? String(raw['asset_id']) : undefined,
    assetName: raw['asset_hostname'] ? String(raw['asset_hostname']) : undefined,
    discoveredAt: raw['first_seen'] ? String(raw['first_seen']) : undefined,
    rawData: raw,
  }
}

function mapTenableSeverity(level: number): string {
  if (level >= 4) return 'critical'
  if (level === 3) return 'high'
  if (level === 2) return 'medium'
  if (level === 1) return 'low'
  return 'informational'
}

export function normalizeQualysVuln(raw: Record<string, unknown>) {
  const severityNum = Number(raw['severity'] ?? 1)
  return {
    source: 'qualys' as const,
    externalId: String(raw['qid'] ?? ''),
    cveId: raw['cveids'] ? String(raw['cveids']).split(',')[0]?.trim() : undefined,
    title: String(raw['title'] ?? 'Unknown'),
    severity: mapQualysSeverity(severityNum),
    cvssScore: raw['cvss_base'] ? Number(raw['cvss_base']) : undefined,
    assetId: raw['ip'] ? String(raw['ip']) : undefined,
    assetName: raw['dnsname'] ? String(raw['dnsname']) : undefined,
    rawData: raw,
  }
}

function mapQualysSeverity(level: number): string {
  if (level === 5) return 'critical'
  if (level === 4) return 'high'
  if (level === 3) return 'medium'
  if (level === 2) return 'low'
  return 'informational'
}

export function normalizeCrowdStrikeAlert(raw: Record<string, unknown>) {
  return {
    source: 'crowdstrike' as const,
    eventType: String(raw['type'] ?? 'detection'),
    severity: String(raw['severity'] ?? 'medium').toLowerCase(),
    title: String(raw['display_name'] ?? 'CrowdStrike Alert'),
    description: raw['description'] ? String(raw['description']) : undefined,
    assetId: raw['device_id'] ? String(raw['device_id']) : undefined,
    assetName: raw['hostname'] ? String(raw['hostname']) : undefined,
    mitreTactic: raw['tactic'] ? String(raw['tactic']) : undefined,
    mitreTechnique: raw['technique'] ? String(raw['technique']) : undefined,
    occurredAt: raw['created_timestamp'] ? String(raw['created_timestamp']) : undefined,
    rawData: raw,
  }
}

export function normalizeQRadarEvent(raw: Record<string, unknown>) {
  return {
    source: 'qradar' as const,
    eventType: String(raw['category'] ?? 'alert'),
    severity: mapQRadarMagnitude(Number(raw['magnitude'] ?? 3)),
    title: String(raw['description'] ?? 'QRadar Offense'),
    description: raw['offense_type'] ? String(raw['offense_type']) : undefined,
    assetId: Array.isArray(raw['source_address_ids']) && raw['source_address_ids'].length > 0
      ? String((raw['source_address_ids'] as unknown[])[0])
      : undefined,
    mitreTactic: raw['category_id'] ? `CAT-${raw['category_id']}` : undefined,
    occurredAt: raw['start_time']
      ? new Date(Number(raw['start_time'])).toISOString()
      : undefined,
    rawData: raw,
  }
}

function mapQRadarMagnitude(magnitude: number): string {
  if (magnitude >= 8) return 'critical'
  if (magnitude >= 6) return 'high'
  if (magnitude >= 4) return 'medium'
  return 'low'
}

// ── Query helpers ─────────────────────────────────────────────────────────────

export function getVulnStats() {
  return db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
      SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high,
      SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium,
      SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) as low,
      SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
      SUM(CASE WHEN sla_due_at < datetime('now') AND status = 'open' THEN 1 ELSE 0 END) as sla_breached
    FROM vulnerabilities
  `).get()
}

export function listVulns(params: {
  severity?: string
  status?: string
  source?: string
  limit?: number
  offset?: number
}) {
  const conditions: string[] = []
  const bindings: Record<string, unknown> = {}

  if (params.severity) { conditions.push('severity = @severity'); bindings['severity'] = params.severity }
  if (params.status) { conditions.push('status = @status'); bindings['status'] = params.status }
  if (params.source) { conditions.push('source = @source'); bindings['source'] = params.source }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  bindings['limit'] = params.limit ?? 100
  bindings['offset'] = params.offset ?? 0

  return db.prepare(`
    SELECT * FROM vulnerabilities ${where}
    ORDER BY
      CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END,
      discovered_at DESC
    LIMIT @limit OFFSET @offset
  `).all(bindings)
}

export function listEvents(params: { source?: string; limit?: number; offset?: number }) {
  const conditions: string[] = []
  const bindings: Record<string, unknown> = {}

  if (params.source) { conditions.push('source = @source'); bindings['source'] = params.source }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  bindings['limit'] = params.limit ?? 100
  bindings['offset'] = params.offset ?? 0

  return db.prepare(`
    SELECT * FROM security_events ${where}
    ORDER BY occurred_at DESC
    LIMIT @limit OFFSET @offset
  `).all(bindings)
}
