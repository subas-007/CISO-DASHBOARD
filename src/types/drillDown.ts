export type DrillDownTargetType =
  | 'vulnerability' | 'incident' | 'asset'
  | 'siem_offense' | 'va_finding' | 'compliance_control'
  | 'metric' | 'threat_feed_item'

export interface DrillDownTarget {
  type: DrillDownTargetType
  id: string
  label: string
  sourceIntegration?: string
}

export interface BreadcrumbItem {
  label: string
  target: DrillDownTarget
}
