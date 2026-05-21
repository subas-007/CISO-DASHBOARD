export type IntegrationStatus = 'connected' | 'degraded' | 'disconnected' | 'syncing'
export type IntegrationCategory = 'SIEM' | 'VULN_SCANNER' | 'EDR' | 'APPSEC'

export interface Integration {
  id: string
  name: string
  vendor: string
  category: IntegrationCategory
  status: IntegrationStatus
  lastSync: string
  nextSync: string
  eventsPerHour: number
  errorRate: number  // percentage
  apiEndpoint: string
  version: string
  assetsManaged: number
  alertsIngested: number
  description: string
}

export interface APIKey {
  id: string
  integrationId: string
  integrationName: string
  label: string
  prefix: string  // first 8 chars, rest masked
  createdAt: string
  lastUsed: string
  expiresAt: string
  rotationDueDays: number  // days until required rotation
  scopes: string[]
}

export interface Webhook {
  id: string
  name: string
  source: string
  endpoint: string
  secret: string  // masked
  events: string[]
  active: boolean
  lastReceived: string
  totalReceived: number
  failureRate: number
}

export const integrations: Integration[] = [
  {
    id: 'int-1', name: 'Splunk Enterprise Security', vendor: 'Splunk', category: 'SIEM',
    status: 'connected', lastSync: '2026-05-20T12:25:00Z', nextSync: '2026-05-20T12:55:00Z',
    eventsPerHour: 84320, errorRate: 0.3, apiEndpoint: 'https://splunk.internal:8089',
    version: '9.2.1', assetsManaged: 5000, alertsIngested: 1240,
    description: 'Primary SIEM ingesting all security events, firewall logs, and EDR telemetry.',
  },
  {
    id: 'int-2', name: 'Microsoft Sentinel', vendor: 'Microsoft', category: 'SIEM',
    status: 'connected', lastSync: '2026-05-20T12:20:00Z', nextSync: '2026-05-20T12:50:00Z',
    eventsPerHour: 42100, errorRate: 0.1, apiEndpoint: 'https://management.azure.com',
    version: 'Cloud', assetsManaged: 2300, alertsIngested: 418,
    description: 'Cloud-native SIEM for Azure workloads and Microsoft 365 signals.',
  },
  {
    id: 'int-3', name: 'Qualys VMDR', vendor: 'Qualys', category: 'VULN_SCANNER',
    status: 'connected', lastSync: '2026-05-20T08:00:00Z', nextSync: '2026-05-21T08:00:00Z',
    eventsPerHour: 0, errorRate: 0.0, apiEndpoint: 'https://qualysapi.qualys.com',
    version: '10.x', assetsManaged: 4890, alertsIngested: 12400,
    description: 'Enterprise vulnerability scanning and patch management across all asset tiers.',
  },
  {
    id: 'int-4', name: 'Wiz Cloud Security', vendor: 'Wiz', category: 'VULN_SCANNER',
    status: 'syncing', lastSync: '2026-05-20T11:00:00Z', nextSync: '2026-05-20T13:00:00Z',
    eventsPerHour: 210, errorRate: 1.2, apiEndpoint: 'https://api.wiz.io',
    version: 'Cloud', assetsManaged: 1200, alertsIngested: 3200,
    description: 'Cloud-native vulnerability and misconfiguration detection for AWS/Azure workloads.',
  },
  {
    id: 'int-5', name: 'CrowdStrike Falcon', vendor: 'CrowdStrike', category: 'EDR',
    status: 'connected', lastSync: '2026-05-20T12:28:00Z', nextSync: '2026-05-20T12:58:00Z',
    eventsPerHour: 156000, errorRate: 0.05, apiEndpoint: 'https://api.crowdstrike.com',
    version: 'Falcon 7.x', assetsManaged: 4750, alertsIngested: 892,
    description: 'Primary EDR platform providing endpoint telemetry and threat detection across all managed devices.',
  },
  {
    id: 'int-6', name: 'SentinelOne Singularity', vendor: 'SentinelOne', category: 'EDR',
    status: 'degraded', lastSync: '2026-05-20T10:15:00Z', nextSync: '2026-05-20T13:15:00Z',
    eventsPerHour: 8200, errorRate: 4.7, apiEndpoint: 'https://usea1-012.sentinelone.net',
    version: '23.x', assetsManaged: 340, alertsIngested: 156,
    description: 'Secondary EDR covering OT/ICS systems and legacy Windows endpoints.',
  },
  {
    id: 'int-7', name: 'Snyk Security', vendor: 'Snyk', category: 'APPSEC',
    status: 'connected', lastSync: '2026-05-20T11:30:00Z', nextSync: '2026-05-20T14:30:00Z',
    eventsPerHour: 45, errorRate: 0.0, apiEndpoint: 'https://api.snyk.io',
    version: 'Cloud', assetsManaged: 42, alertsIngested: 84,
    description: 'Software composition analysis (SCA) and SAST scanning across 42 application repositories.',
  },
  {
    id: 'int-8', name: 'GitHub Advanced Security', vendor: 'GitHub', category: 'APPSEC',
    status: 'connected', lastSync: '2026-05-20T12:00:00Z', nextSync: '2026-05-20T15:00:00Z',
    eventsPerHour: 12, errorRate: 0.0, apiEndpoint: 'https://api.github.com',
    version: 'Cloud', assetsManaged: 38, alertsIngested: 28,
    description: 'Dependabot alerts, secret scanning, and code scanning for GitHub-hosted repos.',
  },
]

export const apiKeys: APIKey[] = [
  { id: 'key-1', integrationId: 'int-1', integrationName: 'Splunk Enterprise Security', label: 'Production Read Token', prefix: 'splk_pr_', createdAt: '2025-11-01', lastUsed: '2026-05-20T12:25:00Z', expiresAt: '2026-11-01', rotationDueDays: 165, scopes: ['search', 'alerts:read', 'assets:read'] },
  { id: 'key-2', integrationId: 'int-2', integrationName: 'Microsoft Sentinel', label: 'Workspace API Key', prefix: 'msSent_', createdAt: '2026-01-15', lastUsed: '2026-05-20T12:20:00Z', expiresAt: '2026-07-15', rotationDueDays: 56, scopes: ['SecurityEvents.Read', 'Incidents.ReadWrite'] },
  { id: 'key-3', integrationId: 'int-3', integrationName: 'Qualys VMDR', label: 'API V2 Token', prefix: 'qlys_v2_', createdAt: '2025-08-01', lastUsed: '2026-05-20T08:00:00Z', expiresAt: '2026-08-01', rotationDueDays: 73, scopes: ['vuln:read', 'asset:read', 'report:create'] },
  { id: 'key-4', integrationId: 'int-5', integrationName: 'CrowdStrike Falcon', label: 'SIEM Connector Key', prefix: 'cs_api_p', createdAt: '2026-02-10', lastUsed: '2026-05-20T12:28:00Z', expiresAt: '2026-08-10', rotationDueDays: 82, scopes: ['detections:read', 'hosts:read', 'incidents:read'] },
  { id: 'key-5', integrationId: 'int-7', integrationName: 'Snyk Security', label: 'CI/CD Pipeline Token', prefix: 'snyk_ci_', createdAt: '2025-12-01', lastUsed: '2026-05-20T11:30:00Z', expiresAt: '2026-06-01', rotationDueDays: 12, scopes: ['org:read', 'project:read', 'vuln:read'] },
  { id: 'key-6', integrationId: 'int-4', integrationName: 'Wiz Cloud Security', label: 'GraphQL API Key', prefix: 'wiz_gql_', createdAt: '2026-03-20', lastUsed: '2026-05-20T11:00:00Z', expiresAt: '2027-03-20', rotationDueDays: 304, scopes: ['issues:read', 'assets:read', 'controls:read'] },
]

export const webhooks: Webhook[] = [
  { id: 'wh-1', name: 'HackerOne Critical Reports', source: 'HackerOne', endpoint: '/api/webhooks/hackerone', secret: 'h1_sec_****', events: ['report.triaged', 'report.critical'], active: true, lastReceived: '2026-05-18T14:30:00Z', totalReceived: 47, failureRate: 2.1 },
  { id: 'wh-2', name: 'Splunk Alert Push', source: 'Splunk', endpoint: '/api/webhooks/splunk-alerts', secret: 'splk_wh_****', events: ['notable_event', 'correlation_alert'], active: true, lastReceived: '2026-05-20T12:10:00Z', totalReceived: 4821, failureRate: 0.3 },
  { id: 'wh-3', name: 'GitHub Secret Scan Alerts', source: 'GitHub', endpoint: '/api/webhooks/github-secrets', secret: 'gh_sec_****', events: ['secret_scanning_alert'], active: true, lastReceived: '2026-05-19T09:00:00Z', totalReceived: 12, failureRate: 0.0 },
  { id: 'wh-4', name: 'Qualys Scan Complete', source: 'Qualys', endpoint: '/api/webhooks/qualys-scan', secret: 'qlys_wh_****', events: ['scan.finished', 'vuln.new_critical'], active: true, lastReceived: '2026-05-20T08:05:00Z', totalReceived: 156, failureRate: 1.3 },
  { id: 'wh-5', name: 'PagerDuty Incident Sync', source: 'PagerDuty', endpoint: '/api/webhooks/pagerduty', secret: 'pd_wh_****', events: ['incident.triggered', 'incident.resolved'], active: false, lastReceived: '2026-05-01T10:00:00Z', totalReceived: 230, failureRate: 0.0 },
]
