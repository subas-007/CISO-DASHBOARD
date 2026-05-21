import type { Asset, Vulnerability, Incident, ComplianceControl, DependencyAlert, VendorRisk, BugBountyReport, SecurityMetrics } from '../types/security'
import type { Severity, AssetTier, IncidentPhase } from '../types/security'

// Seeded pseudo-random (LCG)
function mkRng(seed: number) {
  let s = seed
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
}

const rng = mkRng(42)
const rInt = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min
const rChoice = <T>(arr: T[]): T => arr[rInt(0, arr.length - 1)]
const rBool = (p = 0.5) => rng() < p

// --- Asset generation (5,000 assets, 4 tiers) ---
interface TierConfig {
  label: string
  count: number
  types: string[]
  internetFacing: number
  critMin: number
  critMax: number
}

const TIER_CONFIG: Record<AssetTier, TierConfig> = {
  T0: { label: 'HSM / Payment Rails', count: 50, types: ['HSM', 'Payment Switch', 'Core Banking DB', 'Settlement Engine'], internetFacing: 0.1, critMin: 9, critMax: 10 },
  T1: { label: 'Core Banking / Internet-Facing', count: 450, types: ['API Gateway', 'Web Server', 'Auth Service', 'Customer DB', 'Mobile Backend'], internetFacing: 0.7, critMin: 7, critMax: 9 },
  T2: { label: 'Internal Services', count: 1500, types: ['Internal API', 'Data Warehouse', 'Analytics', 'Identity Provider', 'Log Aggregator'], internetFacing: 0.05, critMin: 4, critMax: 7 },
  T3: { label: 'Dev / Test Sandbox', count: 3000, types: ['Dev Server', 'Test DB', 'CI Runner', 'Staging Env', 'Build Agent'], internetFacing: 0.01, critMin: 1, critMax: 4 },
}

const REGIONS = ['ap-south-1', 'ap-southeast-1', 'us-east-1', 'eu-west-1', 'on-premise']
const OWNERS = ['infra-team', 'appsec-team', 'platform-team', 'devsecops', 'network-team', 'cloud-team']

export const assets: Asset[] = []
let assetIdx = 0
const tierKeys: AssetTier[] = ['T0', 'T1', 'T2', 'T3']
for (const tier of tierKeys) {
  const cfg = TIER_CONFIG[tier]
  for (let i = 0; i < cfg.count; i++) {
    const type = rChoice(cfg.types)
    assetIdx++
    assets.push({
      id: `asset-${assetIdx}`,
      name: `${type.toLowerCase().replace(/ /g, '-')}-${String(assetIdx).padStart(4, '0')}`,
      tier,
      tierLabel: cfg.label,
      type,
      ip: `10.${rInt(0, 255)}.${rInt(0, 255)}.${rInt(0, 255)}`,
      owner: rChoice(OWNERS),
      criticality: rInt(cfg.critMin, cfg.critMax),
      internetFacing: rBool(cfg.internetFacing),
      region: rChoice(REGIONS),
      openVulns: 0,
      openCritical: 0,
      lastScanned: new Date(Date.now() - rInt(0, 7) * 86400000).toISOString(),
    })
  }
}

// --- Vulnerability generation (~12,000 CVEs) ---
const CVE_TITLES = [
  'Remote Code Execution in OpenSSL', 'SQL Injection via unsanitized input', 'Privilege Escalation in Linux kernel',
  'SSRF via redirect handling', 'XXE in XML parser', 'Insecure Deserialization in Jackson', 'Path Traversal in file upload',
  'Buffer Overflow in libc', 'CSRF token bypass', 'JWT algorithm confusion', 'Log4Shell derivative RCE',
  'Spring4Shell RCE', 'Prototype Pollution in lodash', 'ReDoS in validation library', 'Open Redirect',
  'Weak cipher in TLS config', 'Hardcoded credentials in config', 'Unrestricted file upload', 'IDOR in REST API',
  'Missing rate limiting on auth endpoint',
]

const SLA_DAYS: Record<Severity, number> = { critical: 14, high: 30, medium: 60, low: 90 }

export const vulnerabilities: Vulnerability[] = []
const severities: Severity[] = ['critical', 'high', 'medium', 'low']
const severityWeights = [0.08, 0.22, 0.45, 0.25]

function weightedSeverity(): Severity {
  const r = rng()
  let cum = 0
  for (let i = 0; i < severities.length; i++) {
    cum += severityWeights[i]
    if (r < cum) return severities[i]
  }
  return 'low'
}

function effectivePriority(sev: Severity, tier: AssetTier): Severity {
  if (tier === 'T0') {
    const up: Record<Severity, Severity> = { critical: 'critical', high: 'critical', medium: 'high', low: 'medium' }
    return up[sev]
  }
  if (tier === 'T3') {
    const down: Record<Severity, Severity> = { critical: 'high', high: 'medium', medium: 'low', low: 'low' }
    return down[sev]
  }
  return sev
}

let vulnIdx = 0
// Distribute ~12,000 vulns across assets, heavier on T1/T2
const vulnDistribution: Record<AssetTier, number> = { T0: 8, T1: 6, T2: 3, T3: 1 }
for (const asset of assets) {
  const count = rInt(0, vulnDistribution[asset.tier] * 2)
  for (let i = 0; i < count; i++) {
    vulnIdx++
    const sev = weightedSeverity()
    const daysOpen = rInt(1, 120)
    const sla = SLA_DAYS[sev]
    const ep = effectivePriority(sev, asset.tier)
    const cvss = sev === 'critical' ? rInt(90, 100) / 10 : sev === 'high' ? rInt(70, 89) / 10 : sev === 'medium' ? rInt(40, 69) / 10 : rInt(10, 39) / 10
    vulnerabilities.push({
      id: `vuln-${vulnIdx}`,
      cveId: `CVE-202${rInt(3, 5)}-${String(rInt(1000, 99999)).padStart(5, '0')}`,
      assetId: asset.id,
      assetName: asset.name,
      assetTier: asset.tier,
      severity: sev,
      cvssScore: cvss,
      effectivePriority: ep,
      title: rChoice(CVE_TITLES),
      description: 'Vulnerability allowing potential system compromise if left unpatched.',
      daysOpen,
      slaDays: sla,
      slaBreached: daysOpen > sla,
      exploitAvailable: rBool(sev === 'critical' ? 0.6 : 0.2),
      patchAvailable: rBool(0.75),
      firstSeen: new Date(Date.now() - daysOpen * 86400000).toISOString(),
      lastSeen: new Date(Date.now() - rInt(0, 2) * 86400000).toISOString(),
    })
    asset.openVulns++
    if (sev === 'critical') asset.openCritical++
  }
}

// --- Incidents ---
const INCIDENT_TITLES = [
  'Suspicious lateral movement detected on T1 segment',
  'Brute force attack against customer auth endpoint',
  'Anomalous data exfiltration from DW cluster',
  'Malware beacon to C2 infrastructure detected',
  'Insider threat — unusual after-hours access to core DB',
  'Ransomware indicators on dev server cluster',
  'Credential stuffing campaign on mobile API',
  'Unauthorized privilege escalation via sudo exploit',
  'DDoS targeting payment gateway',
  'Phishing campaign targeting finance team',
  'Unpatched RCE attempted on internet-facing API',
  'Suspected supply chain compromise in CI pipeline',
]
const PHASES: IncidentPhase[] = ['triage', 'investigation', 'containment', 'resolved']
const SOURCES = ['SIEM', 'EDR', 'WAF', 'IDS/IPS', 'Cloud Security', 'Threat Intel', 'Bug Bounty']
const ASSIGNEES = ['alice.chen', 'bob.patel', 'carol.kim', 'david.osei', 'eva.martinez']

export const incidents: Incident[] = Array.from({ length: 47 }, (_, i) => {
  const sev = weightedSeverity()
  const phase = rChoice(PHASES)
  const mttd = sev === 'critical' ? rInt(5, 45) : sev === 'high' ? rInt(15, 120) : rInt(30, 480)
  const mttr = phase === 'resolved' ? mttd + rInt(30, 720) : 0
  return {
    id: `inc-${String(i + 1).padStart(3, '0')}`,
    title: rChoice(INCIDENT_TITLES),
    severity: sev,
    phase,
    assignee: rChoice(ASSIGNEES),
    createdAt: new Date(Date.now() - rInt(0, 30) * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - rInt(0, 12) * 3600000).toISOString(),
    mttdMinutes: mttd,
    mttrMinutes: mttr,
    source: rChoice(SOURCES),
    affectedAssets: Array.from({ length: rInt(1, 4) }, () => rChoice(assets).id),
  }
})

// --- Compliance ---
export const complianceControls: ComplianceControl[] = [
  // NIST CSF 2.0
  { framework: 'NIST_CSF', domain: 'Govern',   score: 72, target: 85, maturity: 3, lastAssessed: '2026-04-15' },
  { framework: 'NIST_CSF', domain: 'Identify',  score: 81, target: 90, maturity: 3, lastAssessed: '2026-04-15' },
  { framework: 'NIST_CSF', domain: 'Protect',   score: 68, target: 85, maturity: 2, lastAssessed: '2026-04-15' },
  { framework: 'NIST_CSF', domain: 'Detect',    score: 74, target: 90, maturity: 3, lastAssessed: '2026-04-15' },
  { framework: 'NIST_CSF', domain: 'Respond',   score: 61, target: 80, maturity: 2, lastAssessed: '2026-04-15' },
  { framework: 'NIST_CSF', domain: 'Recover',   score: 55, target: 80, maturity: 2, lastAssessed: '2026-04-15' },
  // SOC 2
  { framework: 'SOC2', domain: 'Security',       score: 79, target: 95, maturity: 3, lastAssessed: '2026-03-31' },
  { framework: 'SOC2', domain: 'Availability',   score: 88, target: 95, maturity: 4, lastAssessed: '2026-03-31' },
  { framework: 'SOC2', domain: 'Confidentiality',score: 71, target: 95, maturity: 3, lastAssessed: '2026-03-31' },
  { framework: 'SOC2', domain: 'Integrity',      score: 83, target: 95, maturity: 3, lastAssessed: '2026-03-31' },
  { framework: 'SOC2', domain: 'Privacy',        score: 66, target: 95, maturity: 2, lastAssessed: '2026-03-31' },
  // PCI-DSS v4
  { framework: 'PCI_DSS', domain: 'Network Security', score: 82, target: 95,  maturity: 3, lastAssessed: '2026-04-01' },
  { framework: 'PCI_DSS', domain: 'Cardholder Data',  score: 91, target: 100, maturity: 5, lastAssessed: '2026-04-01' },
  { framework: 'PCI_DSS', domain: 'Vuln Management',  score: 64, target: 90,  maturity: 2, lastAssessed: '2026-04-01' },
  { framework: 'PCI_DSS', domain: 'Access Control',   score: 77, target: 95,  maturity: 3, lastAssessed: '2026-04-01' },
  { framework: 'PCI_DSS', domain: 'Monitoring',       score: 70, target: 90,  maturity: 3, lastAssessed: '2026-04-01' },
  { framework: 'PCI_DSS', domain: 'Security Policy',  score: 85, target: 95,  maturity: 4, lastAssessed: '2026-04-01' },
  // ISO 27001:2022
  { id: 'iso-1',  framework: 'ISO_27001', domain: 'Organizational', controlId: 'A.5.1',  title: 'Policies for Information Security',          status: 'compliant',     score: 88, target: 90, maturity: 4, lastAssessed: '2025-04-15', owner: 'CISO Office',      evidence: ['IS-POL-001 approved', 'Annual review completed', 'Board sign-off documented'] },
  { id: 'iso-2',  framework: 'ISO_27001', domain: 'Organizational', controlId: 'A.5.2',  title: 'Information Security Roles & Responsibilities', status: 'compliant',  score: 82, target: 85, maturity: 3, lastAssessed: '2025-04-10', owner: 'HR / CISO',        evidence: ['RACI matrix published', 'Job descriptions updated'] },
  { id: 'iso-3',  framework: 'ISO_27001', domain: 'Organizational', controlId: 'A.5.15', title: 'Access Control Policy',                       status: 'partial',       score: 71, target: 90, maturity: 3, lastAssessed: '2025-03-28', owner: 'IAM Team',         evidence: ['Policy v2.1 in review', 'PAM tool deployed'] },
  { id: 'iso-4',  framework: 'ISO_27001', domain: 'Organizational', controlId: 'A.5.23', title: 'Information Security for Cloud Services',      status: 'partial',       score: 65, target: 85, maturity: 2, lastAssessed: '2025-03-20', owner: 'Cloud Security',   evidence: ['CSP risk assessments Q1 2025', 'CSPM tool active'] },
  { id: 'iso-5',  framework: 'ISO_27001', domain: 'People',         controlId: 'A.6.3',  title: 'Information Security Awareness & Training',    status: 'compliant',     score: 90, target: 90, maturity: 4, lastAssessed: '2025-04-18', owner: 'HR Security',      evidence: ['100% staff completion Q1', 'Phishing sim pass rate 94%'] },
  { id: 'iso-6',  framework: 'ISO_27001', domain: 'People',         controlId: 'A.6.5',  title: 'Responsibilities After Termination',           status: 'compliant',     score: 85, target: 85, maturity: 4, lastAssessed: '2025-04-05', owner: 'HR',               evidence: ['Offboarding checklist v3', 'Access revocation SLA: 4hr'] },
  { id: 'iso-7',  framework: 'ISO_27001', domain: 'Physical',       controlId: 'A.7.1',  title: 'Physical Security Perimeters',                 status: 'compliant',     score: 92, target: 90, maturity: 5, lastAssessed: '2025-03-15', owner: 'Facilities',       evidence: ['DC audit passed', 'Biometric access logs reviewed'] },
  { id: 'iso-8',  framework: 'ISO_27001', domain: 'Physical',       controlId: 'A.7.4',  title: 'Physical Security Monitoring',                 status: 'compliant',     score: 87, target: 85, maturity: 4, lastAssessed: '2025-03-15', owner: 'Facilities / SOC', evidence: ['CCTV 100% coverage', '24/7 guard roster active'] },
  { id: 'iso-9',  framework: 'ISO_27001', domain: 'Technology',     controlId: 'A.8.2',  title: 'Privileged Access Rights',                     status: 'partial',       score: 68, target: 90, maturity: 2, lastAssessed: '2025-04-01', owner: 'IAM Team',         evidence: ['PAM rollout 60% complete', 'Just-in-time access in pilot'] },
  { id: 'iso-10', framework: 'ISO_27001', domain: 'Technology',     controlId: 'A.8.7',  title: 'Protection Against Malware',                   status: 'compliant',     score: 91, target: 90, maturity: 5, lastAssessed: '2025-04-20', owner: 'Endpoint Security', evidence: ['EDR deployed 99.8% fleet', 'Daily signature updates confirmed'] },
  { id: 'iso-11', framework: 'ISO_27001', domain: 'Technology',     controlId: 'A.8.15', title: 'Logging',                                      status: 'partial',       score: 74, target: 90, maturity: 3, lastAssessed: '2025-03-25', owner: 'SOC',              evidence: ['SIEM centralized logging', 'Log retention: 90 days (target: 365)'] },
  { id: 'iso-12', framework: 'ISO_27001', domain: 'Technology',     controlId: 'A.8.28', title: 'Secure Coding',                                status: 'non_compliant', score: 48, target: 85, maturity: 1, lastAssessed: '2025-02-10', owner: 'AppSec',           evidence: ['SAST tools deployed', 'Developer training backlog: 34 staff'] },
]

// --- Dependency Alerts ---
const PACKAGES = ['log4j-core', 'spring-webmvc', 'lodash', 'axios', 'openssl', 'jackson-databind', 'commons-text', 'netty', 'shiro', 'struts2']
const REPOS = ['core-banking-api', 'mobile-backend', 'payment-service', 'auth-service', 'reporting-dashboard', 'admin-portal']
export const dependencyAlerts: DependencyAlert[] = Array.from({ length: 84 }, (_, i) => ({
  id: `dep-${i + 1}`,
  packageName: rChoice(PACKAGES),
  severity: weightedSeverity(),
  cveId: `CVE-202${rInt(3, 5)}-${String(rInt(1000, 99999)).padStart(5, '0')}`,
  repo: rChoice(REPOS),
  fixAvailable: rBool(0.7),
  introducedAt: new Date(Date.now() - rInt(7, 90) * 86400000).toISOString(),
}))

// --- Vendor Risk ---
export const vendorRisks: VendorRisk[] = [
  { id: 'v1', name: 'AWS (Cloud Infrastructure)', category: 'Cloud Provider', riskScore: 22, tier: 'critical', lastAssessment: '2026-03-01', findings: 2 },
  { id: 'v2', name: 'Temenos T24 Core Banking', category: 'Core Banking', riskScore: 48, tier: 'critical', lastAssessment: '2026-02-15', findings: 7 },
  { id: 'v3', name: 'Visa Payment Network', category: 'Payment Rail', riskScore: 31, tier: 'critical', lastAssessment: '2026-04-01', findings: 3 },
  { id: 'v4', name: 'Okta Identity', category: 'IAM', riskScore: 55, tier: 'important', lastAssessment: '2026-01-20', findings: 9 },
  { id: 'v5', name: 'Crowdstrike EDR', category: 'Security Tool', riskScore: 18, tier: 'important', lastAssessment: '2026-03-15', findings: 1 },
  { id: 'v6', name: 'Splunk SIEM', category: 'Security Tool', riskScore: 25, tier: 'important', lastAssessment: '2026-02-28', findings: 3 },
  { id: 'v7', name: 'Twilio SMS', category: 'Communication', riskScore: 42, tier: 'standard', lastAssessment: '2025-12-01', findings: 5 },
  { id: 'v8', name: 'SendGrid Email', category: 'Communication', riskScore: 38, tier: 'standard', lastAssessment: '2025-11-15', findings: 4 },
]

// --- Bug Bounty ---
export const bugBountyReports: BugBountyReport[] = [
  { id: 'bb-001', title: 'IDOR allowing access to other users accounts', severity: 'critical', platform: 'HackerOne', status: 'in_progress', submittedAt: '2026-05-10', bounty: 5000 },
  { id: 'bb-002', title: 'Stored XSS in transaction notes field', severity: 'high', platform: 'HackerOne', status: 'accepted', submittedAt: '2026-05-12', bounty: 1500 },
  { id: 'bb-003', title: 'JWT secret leaked in client-side JS bundle', severity: 'critical', platform: 'Internal', status: 'triaging', submittedAt: '2026-05-15' },
  { id: 'bb-004', title: 'Rate limiting bypass on OTP endpoint', severity: 'high', platform: 'HackerOne', status: 'in_progress', submittedAt: '2026-05-08', bounty: 2000 },
  { id: 'bb-005', title: 'Insecure direct object reference in statements API', severity: 'medium', platform: 'Bugcrowd', status: 'resolved', submittedAt: '2026-04-28', bounty: 800 },
  { id: 'bb-006', title: 'SSRF via PDF generation endpoint', severity: 'high', platform: 'HackerOne', status: 'accepted', submittedAt: '2026-05-03', bounty: 1800 },
  { id: 'bb-007', title: 'Open redirect leading to credential phishing', severity: 'medium', platform: 'Bugcrowd', status: 'triaging', submittedAt: '2026-05-18' },
]

// --- Computed Metrics ---
const critCount = vulnerabilities.filter(v => v.effectivePriority === 'critical').length
const slaBreached = vulnerabilities.filter(v => v.slaBreached).length
const avgMttd = Math.round(incidents.filter(i => i.mttdMinutes > 0).reduce((a, b) => a + b.mttdMinutes, 0) / incidents.filter(i => i.mttdMinutes > 0).length)
const resolvedInc = incidents.filter(i => i.phase === 'resolved' && i.mttrMinutes > 0)
const avgMttr = resolvedInc.length ? Math.round(resolvedInc.reduce((a, b) => a + b.mttrMinutes, 0) / resolvedInc.length) : 0
const avgScore = Math.round(complianceControls.reduce((a, b) => a + b.score, 0) / complianceControls.length)
const postureScore = Math.round((avgScore * 0.4) + ((1 - slaBreached / vulnerabilities.length) * 100 * 0.3) + ((1 - critCount / vulnerabilities.length * 5) * 100 * 0.3))

export const securityMetrics: SecurityMetrics = {
  postureScore: Math.min(100, Math.max(0, postureScore)),
  fairAleUsd: 4_200_000,
  fairAleNpr: 556_800_000,
  aleeTrend: -8.3,
  mttdMinutes: avgMttd,
  mttdTrend: -12.4,
  mttrMinutes: avgMttr,
  mttrTrend: -6.8,
  activeIncidents: incidents.filter(i => i.phase !== 'resolved').length,
  openVulnerabilities: vulnerabilities.length,
  slaBreachCount: slaBreached,
  criticalAssets: assets.filter(a => a.tier === 'T0' || a.tier === 'T1').length,
}
