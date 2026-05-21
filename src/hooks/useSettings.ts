import { useState, useEffect } from 'react'

export interface DashboardSettings {
  orgName: string
  timezone: string
  currency: 'USD' | 'NPR' | 'BOTH'
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
  refreshInterval: 30 | 60 | 120 | 300
  defaultAssetTier: 'ALL' | 'T0' | 'T0_T1'
  defaultReportScope: '7d' | '30d' | '90d'
  showFreshnessBadges: boolean
}

const DEFAULTS: DashboardSettings = {
  orgName: 'SecureBank Financial Group',
  timezone: 'Asia/Kathmandu',
  currency: 'BOTH',
  dateFormat: 'MM/DD/YYYY',
  refreshInterval: 30,
  defaultAssetTier: 'ALL',
  defaultReportScope: '30d',
  showFreshnessBadges: true,
}

const KEY = 'ciso_settings'

export function useSettings() {
  const [settings, setSettings] = useState<DashboardSettings>(() => {
    try {
      const stored = localStorage.getItem(KEY)
      return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS
    } catch { return DEFAULTS }
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(settings))
  }, [settings])

  const updateSetting = <K extends keyof DashboardSettings>(
    key: K,
    value: DashboardSettings[K]
  ) => setSettings(prev => ({ ...prev, [key]: value }))

  const resetSettings = () => setSettings(DEFAULTS)

  return { settings, updateSetting, resetSettings }
}
