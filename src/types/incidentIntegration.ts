export interface ServiceNowConfig {
  instanceUrl: string
  username: string
  password: string
  table: string
  sysparmQuery: string
  maxRecords: number
}

export interface OpsgenieConfig {
  apiKey: string
  baseUrl: string
  teamId?: string
  query: string
}

export interface NormalizedIncident {
  id: string
  externalId: string
  source: 'ServiceNow' | 'Opsgenie' | 'Manual'
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  assignee: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  tags: string[]
  url?: string
}
