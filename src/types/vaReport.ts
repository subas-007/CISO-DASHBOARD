import type { Severity } from './security'

export interface VAFinding {
  id: string
  title: string
  severity: Severity
  cvssScore: number
  cveId?: string
  affectedHost: string
  affectedPort?: string
  service?: string
  description: string
  recommendation: string
  pluginId?: string
  firstSeen: string
  source: 'Qualys' | 'Tenable' | 'Nessus' | 'Manual'
  status: 'open' | 'accepted_risk' | 'resolved'
}

export interface VAReport {
  id: string
  scanName: string
  scanner: 'Qualys' | 'Tenable' | 'Nessus'
  scanStarted: string
  scanCompleted: string
  totalHosts: number
  hostsScanned: number
  findings: VAFinding[]
  importedAt: string
}
