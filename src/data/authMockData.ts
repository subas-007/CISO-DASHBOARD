import type { DashboardUser, ActivityLog } from '../types/auth'

export const mockUsers: DashboardUser[] = [
  { id: 'u1', name: 'Sarah Chen', email: 'sarah.chen@bank.com', role: 'CISO', lastLogin: '2026-05-20T08:30:00Z', createdAt: '2024-01-15', active: true, mfaEnabled: true },
  { id: 'u2', name: 'Marcus Osei', email: 'marcus.osei@bank.com', role: 'SOC_ANALYST', lastLogin: '2026-05-20T07:15:00Z', createdAt: '2024-03-22', active: true, mfaEnabled: true },
  { id: 'u3', name: 'Priya Sharma', email: 'priya.sharma@bank.com', role: 'SOC_ANALYST', lastLogin: '2026-05-19T23:45:00Z', createdAt: '2024-06-01', active: true, mfaEnabled: true },
  { id: 'u4', name: 'David Kim', email: 'david.kim@bank.com', role: 'AUDITOR', lastLogin: '2026-05-18T11:00:00Z', createdAt: '2024-02-10', active: true, mfaEnabled: false },
  { id: 'u5', name: 'Elena Voss', email: 'elena.voss@bank.com', role: 'EXECUTIVE', lastLogin: '2026-05-15T09:00:00Z', createdAt: '2024-01-20', active: true, mfaEnabled: false },
  { id: 'u6', name: 'James Nakamura', email: 'james.nakamura@bank.com', role: 'SOC_ANALYST', lastLogin: '2026-05-20T06:00:00Z', createdAt: '2025-01-10', active: true, mfaEnabled: true },
  { id: 'u7', name: 'Aisha Patel', email: 'aisha.patel@bank.com', role: 'AUDITOR', lastLogin: '2026-05-10T14:30:00Z', createdAt: '2025-03-15', active: false, mfaEnabled: true },
]

const ACTIONS = [
  { action: 'Exported vulnerability report', resource: 'Section C - Vuln Management', severity: 'info' as const },
  { action: 'Modified API key rotation policy', resource: 'API Management', severity: 'warning' as const },
  { action: 'Acknowledged P0 incident INC-003', resource: 'Section B - Threat Command', severity: 'critical' as const },
  { action: 'Reviewed compliance drift report', resource: 'Section A - Executive Scorecard', severity: 'info' as const },
  { action: 'Added new integration: Wiz Cloud Security', resource: 'Integrations', severity: 'info' as const },
  { action: 'Deactivated user account', resource: 'User Management', severity: 'warning' as const },
  { action: 'Reset API key for Splunk integration', resource: 'API Management', severity: 'warning' as const },
  { action: 'Filtered dashboard by Critical severity', resource: 'Dashboard', severity: 'info' as const },
  { action: 'Logged in from new device', resource: 'Auth', severity: 'warning' as const },
  { action: 'Bulk-acknowledged 23 medium CVEs', resource: 'Section C - Vuln Management', severity: 'info' as const },
]

const IPS = ['192.168.1.101', '192.168.1.45', '10.0.0.23', '172.16.0.88', '192.168.2.200']

// Seeded generation for stable data
function mkRng(seed: number) {
  let s = seed
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
}
const rng = mkRng(99)
const rInt = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min
const rChoice = <T>(arr: T[]): T => arr[rInt(0, arr.length - 1)]

export const activityLogs: ActivityLog[] = Array.from({ length: 60 }, (_, i) => {
  const user = rChoice(mockUsers)
  const action = rChoice(ACTIONS)
  return {
    id: `log-${String(i + 1).padStart(3, '0')}`,
    userId: user.id,
    userName: user.name,
    action: action.action,
    resource: action.resource,
    timestamp: new Date(Date.now() - rInt(0, 72) * 3600000).toISOString(),
    ipAddress: rChoice(IPS),
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124',
    severity: action.severity,
  }
}).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
