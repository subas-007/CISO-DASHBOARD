export type FeedType = 'CISA_KEV' | 'MITRE_ATTACK' | 'FEODO_TRACKER' | 'OTX' | 'CUSTOM'
export type IOCType = 'CVE' | 'IP' | 'DOMAIN' | 'HASH' | 'URL' | 'TECHNIQUE'

export interface ThreatFeedSource {
  id: string
  name: string
  type: FeedType
  url: string
  apiKey?: string
  enabled: boolean
  lastFetched?: string
  itemCount?: number
  fetchStatus: 'idle' | 'loading' | 'success' | 'error'
  errorMessage?: string
}

export interface ThreatFeedItem {
  id: string
  feedSourceId: string
  feedSourceName: string
  iocType: IOCType
  value: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  title: string
  description: string
  mitreTactic?: string
  mitreTechnique?: string
  cveId?: string
  firstSeen: string
  lastSeen: string
  tags: string[]
  raw?: Record<string, unknown>
}
