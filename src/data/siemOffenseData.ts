import type { Severity } from '../types/security'

export interface SIEMOffense {
  id: string
  source: 'Splunk' | 'QRadar'
  offenseId: string
  ruleName: string
  description: string
  severity: Severity
  magnitude: number        // QRadar-style 1–10
  sourceIp: string
  destinationIp: string
  username?: string
  category: string
  eventCount: number
  firstEventTime: string
  lastEventTime: string
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED'
  assignedTo?: string
}

const RULES = [
  'Brute Force Authentication Against Single Host',
  'Multiple Failed Logins Followed By Success',
  'Privilege Escalation Detected',
  'Lateral Movement — Internal Scan Detected',
  'Anomalous Data Transfer to External IP',
  'Malware C2 Communication Detected',
  'Ransomware File Extension Activity',
  'Unauthorized Access to Sensitive Database',
  'Suspicious PowerShell Execution',
  'DLP — Large File Transfer Over Port 443',
  'Impossible Travel — Same Account Two Geo Locations',
  'Account Enumeration via LDAP',
  'Admin Account Used Outside Business Hours',
  'Honeypot Interaction Detected',
  'Log Source Going Silent — Possible Tampering',
]

const CATEGORIES = ['Authentication', 'Network Activity', 'Endpoint Activity', 'Data Exfiltration', 'Malware', 'Policy Violation', 'Threat Intelligence']

function seededRng(seed: number) {
  let s = seed
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
}

const rng = seededRng(77)
const ri = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min
const rc = <T>(arr: T[]): T => arr[ri(0, arr.length - 1)]

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low']
const SEVERITY_WEIGHTS = [0.1, 0.25, 0.4, 0.25]

function weightedSev(): Severity {
  const r = rng(); let cum = 0
  for (let i = 0; i < SEVERITIES.length; i++) { cum += SEVERITY_WEIGHTS[i]; if (r < cum) return SEVERITIES[i] }
  return 'low'
}

const SOURCES: ('Splunk' | 'QRadar')[] = ['Splunk', 'QRadar']

export const siemOffenses: SIEMOffense[] = Array.from({ length: 48 }, (_, i) => {
  const sev = weightedSev()
  const mag = sev === 'critical' ? ri(8, 10) : sev === 'high' ? ri(6, 8) : sev === 'medium' ? ri(3, 6) : ri(1, 3)
  return {
    id: `off-${String(i + 1).padStart(3, '0')}`,
    source: rc(SOURCES),
    offenseId: String(10000 + i),
    ruleName: rc(RULES),
    description: `Triggered by ${ri(2, 150)} events matching correlation rule threshold.`,
    severity: sev,
    magnitude: mag,
    sourceIp: `${ri(10, 192)}.${ri(0, 255)}.${ri(0, 255)}.${ri(1, 254)}`,
    destinationIp: `10.${ri(0, 10)}.${ri(0, 255)}.${ri(1, 254)}`,
    username: rng() > 0.4 ? `${rc(['jsmith', 'alee', 'bkumar', 'cmartinez', 'dchen'])}@bank.com` : undefined,
    category: rc(CATEGORIES),
    eventCount: ri(3, 5000),
    firstEventTime: new Date(Date.now() - ri(1, 72) * 3600000).toISOString(),
    lastEventTime: new Date(Date.now() - ri(0, 30) * 60000).toISOString(),
    status: rc(['OPEN', 'OPEN', 'IN_PROGRESS', 'CLOSED'] as const),
    assignedTo: rng() > 0.5 ? rc(['alice.chen', 'bob.patel', 'carol.kim']) : undefined,
  }
}).sort((a, b) => new Date(b.lastEventTime).getTime() - new Date(a.lastEventTime).getTime())
