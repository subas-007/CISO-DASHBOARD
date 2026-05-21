export type Severity = 'critical' | 'high' | 'medium' | 'low'
export type AssetTier = 'T0' | 'T1' | 'T2' | 'T3'
export type IncidentPhase = 'triage' | 'investigation' | 'containment' | 'resolved'
export type ComplianceFramework = 'NIST_CSF' | 'SOC2' | 'PCI_DSS' | 'ISO_27001'

export interface Asset {
  id: string
  name: string
  tier: AssetTier
  tierLabel: string
  type: string
  ip: string
  owner: string
  criticality: number  // 1-10
  internetFacing: boolean
  region: string
  openVulns: number
  openCritical: number
  lastScanned: string
}

export interface Vulnerability {
  id: string
  cveId: string
  assetId: string
  assetName: string
  assetTier: AssetTier
  severity: Severity
  cvssScore: number
  effectivePriority: Severity  // adjusted for asset criticality
  title: string
  description: string
  daysOpen: number
  slaDays: number
  slaBreached: boolean
  exploitAvailable: boolean
  patchAvailable: boolean
  firstSeen: string
  lastSeen: string
}

export interface Incident {
  id: string
  title: string
  severity: Severity
  phase: IncidentPhase
  assignee: string
  createdAt: string
  updatedAt: string
  mttdMinutes: number
  mttrMinutes: number
  source: string
  affectedAssets: string[]
}

export interface ComplianceControl {
  id?: string
  framework: ComplianceFramework
  domain: string
  controlId?: string
  title?: string
  status?: 'compliant' | 'partial' | 'non_compliant' | 'not_assessed'
  score: number   // 0-100
  target: number
  maturity: 1 | 2 | 3 | 4 | 5  // 1=Initial 2=Developing 3=Defined 4=Managed 5=Optimizing
  lastAssessed: string
  owner?: string
  evidence?: string[]
}

export interface DependencyAlert {
  id: string
  packageName: string
  severity: Severity
  cveId: string
  repo: string
  fixAvailable: boolean
  introducedAt: string
}

export interface VendorRisk {
  id: string
  name: string
  category: string
  riskScore: number  // 0-100
  tier: 'critical' | 'important' | 'standard'
  lastAssessment: string
  findings: number
}

export interface BugBountyReport {
  id: string
  title: string
  severity: Severity
  platform: 'HackerOne' | 'Bugcrowd' | 'Internal'
  status: 'triaging' | 'accepted' | 'in_progress' | 'resolved'
  submittedAt: string
  bounty?: number
}

export interface SecurityMetrics {
  postureScore: number
  fairAleUsd: number
  fairAleNpr: number
  aleeTrend: number  // % change vs last month
  mttdMinutes: number
  mttdTrend: number
  mttrMinutes: number
  mttrTrend: number
  activeIncidents: number
  openVulnerabilities: number
  slaBreachCount: number
  criticalAssets: number
}

export interface ActiveFilter {
  severity?: Severity
  assetTier?: AssetTier
  framework?: ComplianceFramework
  phase?: IncidentPhase
  slaBreached?: boolean
}
