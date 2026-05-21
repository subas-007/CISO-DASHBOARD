import { useState, useCallback } from 'react'
import type { ServiceNowConfig, OpsgenieConfig, NormalizedIncident } from '../types/incidentIntegration'

const CONFIGS_KEY = 'ciso_incident_configs'
const DATA_KEY = 'ciso_incident_data'

interface StoredConfigs {
  serviceNow?: ServiceNowConfig
  opsgenie?: OpsgenieConfig
}

function loadConfigs(): StoredConfigs {
  try {
    return JSON.parse(localStorage.getItem(CONFIGS_KEY) ?? '{}')
  } catch { return {} }
}

function loadIncidents(): NormalizedIncident[] {
  try {
    const stored = JSON.parse(localStorage.getItem(DATA_KEY) ?? 'null')
    if (Array.isArray(stored)) return stored
  } catch { /* ignore */ }
  return []
}

const SNOW_TITLES = [
  'Suspicious Login Activity Detected', 'Unauthorized Data Access Attempt',
  'Malware Alert — Endpoint Compromised', 'Phishing Email Report — Executive Target',
  'DLP Policy Violation — Sensitive Data Transfer', 'Privilege Escalation Attempt via Service Account',
  'Critical System Patch Overdue', 'Security Configuration Drift Detected',
  'VPN Credential Stuffing Campaign',
]

const OG_TITLES = [
  'PagerDuty Integration Alert — High CPU Security Service',
  'Database Anomaly Detection — Core Banking',
  'API Rate Limiting Bypass Attempt', 'Certificate Expiration — Payment Gateway',
  'Container Escape Attempt — Kubernetes Cluster', 'SAML Authentication Anomaly',
  'Firewall Rule Misconfiguration Detected', 'Insider Threat Alert — Bulk Download',
  'Cloud Storage Bucket Public Access',
]

const ASSIGNEES = ['alice.chen', 'bob.patel', 'carol.kim', 'david.osei', 'eva.martinez']
const SEVS: NormalizedIncident['severity'][] = ['critical', 'high', 'medium', 'low']
const STATUSES: NormalizedIncident['status'][] = ['open', 'in_progress', 'resolved', 'closed']

function seededRng(seed: number) {
  let s = seed
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
}

function generateSimulatedIncidents(hasSN: boolean, hasOG: boolean): NormalizedIncident[] {
  const rng = seededRng(99)
  const ri = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min
  const rc = <T>(arr: T[]): T => arr[ri(0, arr.length - 1)]

  const incidents: NormalizedIncident[] = []

  if (hasSN) {
    for (let i = 0; i < ri(6, 9); i++) {
      const sev = SEVS[ri(0, 3)]
      const status = STATUSES[ri(0, 3)]
      incidents.push({
        id: `sn-inc-${String(i + 1).padStart(3, '0')}`,
        externalId: `INC${String(1000000 + i).padStart(7, '0')}`,
        source: 'ServiceNow',
        title: rc(SNOW_TITLES),
        description: 'Security incident imported from ServiceNow ITSM platform.',
        severity: sev,
        status,
        assignee: rc(ASSIGNEES),
        createdAt: new Date(Date.now() - ri(0, 30) * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - ri(0, 12) * 3600000).toISOString(),
        resolvedAt: status === 'resolved' || status === 'closed' ? new Date(Date.now() - ri(0, 5) * 86400000).toISOString() : undefined,
        tags: ['servicenow', sev, 'security'],
        url: 'https://company.service-now.com/nav_to.do?uri=incident.do',
      })
    }
  }

  if (hasOG) {
    for (let i = 0; i < ri(6, 9); i++) {
      const sev = SEVS[ri(0, 3)]
      const status = STATUSES[ri(0, 3)]
      incidents.push({
        id: `og-inc-${String(i + 1).padStart(3, '0')}`,
        externalId: `og-${Date.now()}-${i}`,
        source: 'Opsgenie',
        title: rc(OG_TITLES),
        description: 'Alert imported from Opsgenie incident management platform.',
        severity: sev,
        status,
        assignee: rc(ASSIGNEES),
        createdAt: new Date(Date.now() - ri(0, 14) * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - ri(0, 6) * 3600000).toISOString(),
        resolvedAt: status === 'resolved' || status === 'closed' ? new Date(Date.now() - ri(0, 3) * 86400000).toISOString() : undefined,
        tags: ['opsgenie', sev, 'security'],
      })
    }
  }

  return incidents
}

export function useIncidentIntegrations() {
  const [configs, setConfigs] = useState<StoredConfigs>(loadConfigs)
  const [incidents, setIncidents] = useState<NormalizedIncident[]>(loadIncidents)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)

  const saveServiceNowConfig = useCallback((config: ServiceNowConfig) => {
    const updated = { ...loadConfigs(), serviceNow: config }
    localStorage.setItem(CONFIGS_KEY, JSON.stringify(updated))
    setConfigs(updated)
  }, [])

  const saveOpsgenieConfig = useCallback((config: OpsgenieConfig) => {
    const updated = { ...loadConfigs(), opsgenie: config }
    localStorage.setItem(CONFIGS_KEY, JSON.stringify(updated))
    setConfigs(updated)
  }, [])

  const syncIncidents = useCallback(async () => {
    const cfg = loadConfigs()
    const hasSN = !!cfg.serviceNow?.instanceUrl
    const hasOG = !!cfg.opsgenie?.apiKey

    if (!hasSN && !hasOG) return

    setIsSyncing(true)
    await new Promise(r => setTimeout(r, 1500))

    const newIncidents = generateSimulatedIncidents(hasSN, hasOG)
    localStorage.setItem(DATA_KEY, JSON.stringify(newIncidents))
    setIncidents(newIncidents)
    const now = new Date().toISOString()
    setLastSynced(now)
    setIsSyncing(false)
  }, [])

  const createIncident = useCallback(async (data: Partial<NormalizedIncident>) => {
    await new Promise(r => setTimeout(r, 500))
    const newInc: NormalizedIncident = {
      id: `manual-${Date.now()}`,
      externalId: `MAN-${Date.now()}`,
      source: 'Manual',
      title: data.title ?? 'Untitled Incident',
      description: data.description ?? '',
      severity: data.severity ?? 'medium',
      status: 'open',
      assignee: data.assignee ?? 'unassigned',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['manual'],
      ...data,
    }
    setIncidents(prev => {
      const updated = [newInc, ...prev]
      localStorage.setItem(DATA_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const updateIncidentStatus = useCallback((id: string, status: NormalizedIncident['status']) => {
    setIncidents(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, status, updatedAt: new Date().toISOString() } : i)
      localStorage.setItem(DATA_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const isConfigured = !!configs.serviceNow?.instanceUrl || !!configs.opsgenie?.apiKey

  return {
    serviceNowConfig: configs.serviceNow ?? null,
    opsgenieConfig: configs.opsgenie ?? null,
    incidents,
    isSyncing,
    lastSynced,
    isConfigured,
    saveServiceNowConfig,
    saveOpsgenieConfig,
    syncIncidents,
    createIncident,
    updateIncidentStatus,
  }
}
