import { useState, useCallback } from 'react'

export interface IntegrationConfig {
  integrationId: string
  fields: Record<string, string | boolean | string[]>
  status: 'untested' | 'connected' | 'failed' | 'testing'
  testedAt?: string
  errorMessage?: string
}

const STORAGE_KEY = 'ciso_integration_configs'

function loadFromStorage(): Record<string, IntegrationConfig> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch { return {} }
}

export function useIntegrationConfigs() {
  const [configs, setConfigs] = useState<Record<string, IntegrationConfig>>(loadFromStorage)

  const saveConfig = useCallback((id: string, fields: Record<string, string | boolean | string[]>) => {
    const updated = { ...loadFromStorage(), [id]: { integrationId: id, fields, status: 'untested' as const } }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setConfigs(updated)
  }, [])

  const testConnection = useCallback(async (id: string): Promise<boolean> => {
    setConfigs(prev => ({ ...prev, [id]: { ...prev[id], status: 'testing' } }))
    // Simulate network round-trip (1.5–2.5s)
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000))
    const cfg = loadFromStorage()[id]
    // Fail if URL field is empty or obviously wrong
    const urlField = Object.entries(cfg?.fields ?? {}).find(([k]) => k.toLowerCase().includes('url'))
    const urlVal = urlField ? String(urlField[1]) : ''
    const success = urlVal.startsWith('http') || urlVal.length > 5
    const result: IntegrationConfig = {
      ...cfg,
      status: success ? 'connected' : 'failed',
      testedAt: new Date().toISOString(),
      errorMessage: success ? undefined : 'Connection refused — check URL and credentials.',
    }
    const updated = { ...loadFromStorage(), [id]: result }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setConfigs(updated)
    return success
  }, [])

  const getConfig = useCallback((id: string) => configs[id] ?? null, [configs])
  const isConnected = useCallback((id: string) => configs[id]?.status === 'connected', [configs])

  return { configs, saveConfig, testConnection, getConfig, isConnected }
}
