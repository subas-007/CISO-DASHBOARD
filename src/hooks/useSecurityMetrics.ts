import { useMemo } from 'react'
import { securityMetrics, vulnerabilities, incidents, assets } from '../data/mockData'

export function useSecurityMetrics() {
  return useMemo(() => {
    const vulnBySeverity = {
      critical: vulnerabilities.filter(v => v.effectivePriority === 'critical').length,
      high: vulnerabilities.filter(v => v.effectivePriority === 'high').length,
      medium: vulnerabilities.filter(v => v.effectivePriority === 'medium').length,
      low: vulnerabilities.filter(v => v.effectivePriority === 'low').length,
    }
    const incidentsByPhase = {
      triage: incidents.filter(i => i.phase === 'triage').length,
      investigation: incidents.filter(i => i.phase === 'investigation').length,
      containment: incidents.filter(i => i.phase === 'containment').length,
      resolved: incidents.filter(i => i.phase === 'resolved').length,
    }
    const assetsByTier = {
      T0: assets.filter(a => a.tier === 'T0').length,
      T1: assets.filter(a => a.tier === 'T1').length,
      T2: assets.filter(a => a.tier === 'T2').length,
      T3: assets.filter(a => a.tier === 'T3').length,
    }
    return { ...securityMetrics, vulnBySeverity, incidentsByPhase, assetsByTier }
  }, [])
}
