import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import type { ActiveFilter, Severity, AssetTier, IncidentPhase } from '../types/security'

interface FilterContextValue {
  filter: ActiveFilter
  setFilter: (f: ActiveFilter) => void
  toggleSeverity: (s: Severity) => void
  toggleTier: (t: AssetTier) => void
  togglePhase: (p: IncidentPhase) => void
  toggleSlaBreached: () => void
  clearFilter: () => void
  hasFilter: boolean
}

const FilterContext = createContext<FilterContextValue | null>(null)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<ActiveFilter>({})

  const toggleSeverity = useCallback((s: Severity) => {
    setFilter(f => f.severity === s ? { ...f, severity: undefined } : { ...f, severity: s })
  }, [])

  const toggleTier = useCallback((t: AssetTier) => {
    setFilter(f => f.assetTier === t ? { ...f, assetTier: undefined } : { ...f, assetTier: t })
  }, [])

  const togglePhase = useCallback((p: IncidentPhase) => {
    setFilter(f => f.phase === p ? { ...f, phase: undefined } : { ...f, phase: p })
  }, [])

  const toggleSlaBreached = useCallback(() => {
    setFilter(f => ({ ...f, slaBreached: f.slaBreached ? undefined : true }))
  }, [])

  const clearFilter = useCallback(() => setFilter({}), [])

  const hasFilter = useMemo(() => Object.values(filter).some(v => v !== undefined), [filter])

  return (
    <FilterContext.Provider value={{ filter, setFilter, toggleSeverity, toggleTier, togglePhase, toggleSlaBreached, clearFilter, hasFilter }}>
      {children}
    </FilterContext.Provider>
  )
}

export function useFilter() {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useFilter must be used within FilterProvider')
  return ctx
}
