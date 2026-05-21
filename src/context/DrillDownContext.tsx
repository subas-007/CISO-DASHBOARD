import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { DrillDownTarget } from '../types/drillDown'

interface DrillDownContextValue {
  stack: DrillDownTarget[]
  isOpen: boolean
  openDrillDown: (target: DrillDownTarget) => void
  pushDrillDown: (target: DrillDownTarget) => void
  popDrillDown: () => void
  closeDrillDown: () => void
}

const DrillDownContext = createContext<DrillDownContextValue | null>(null)

export function DrillDownProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<DrillDownTarget[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const openDrillDown = useCallback((target: DrillDownTarget) => {
    setStack([target])
    setIsOpen(true)
  }, [])

  const pushDrillDown = useCallback((target: DrillDownTarget) => {
    setStack(prev => [...prev, target])
    setIsOpen(true)
  }, [])

  const popDrillDown = useCallback(() => {
    setStack(prev => {
      if (prev.length <= 1) { setIsOpen(false); return [] }
      return prev.slice(0, -1)
    })
  }, [])

  const closeDrillDown = useCallback(() => {
    setStack([])
    setIsOpen(false)
  }, [])

  return (
    <DrillDownContext.Provider value={{ stack, isOpen, openDrillDown, pushDrillDown, popDrillDown, closeDrillDown }}>
      {children}
    </DrillDownContext.Provider>
  )
}

export function useDrillDown() {
  const ctx = useContext(DrillDownContext)
  if (!ctx) throw new Error('useDrillDown must be used within DrillDownProvider')
  return ctx
}
