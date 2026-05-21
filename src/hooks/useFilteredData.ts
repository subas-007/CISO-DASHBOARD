import { useMemo } from 'react'
import { useFilter } from '../context/FilterContext'
import { vulnerabilities, incidents, assets } from '../data/mockData'

export function useFilteredVulnerabilities() {
  const { filter } = useFilter()
  return useMemo(() => vulnerabilities.filter(v => {
    if (filter.severity && v.effectivePriority !== filter.severity) return false
    if (filter.assetTier && v.assetTier !== filter.assetTier) return false
    if (filter.slaBreached !== undefined && v.slaBreached !== filter.slaBreached) return false
    return true
  }), [filter])
}

export function useFilteredIncidents() {
  const { filter } = useFilter()
  return useMemo(() => incidents.filter(i => {
    if (filter.severity && i.severity !== filter.severity) return false
    if (filter.phase && i.phase !== filter.phase) return false
    return true
  }), [filter])
}

export function useFilteredAssets() {
  const { filter } = useFilter()
  return useMemo(() => assets.filter(a => {
    if (filter.assetTier && a.tier !== filter.assetTier) return false
    return true
  }).slice(0, 200), [filter])  // cap at 200 rows for DOM perf
}
