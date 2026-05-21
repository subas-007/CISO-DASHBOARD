import { useState, useEffect, useCallback } from 'react'

const API = 'http://localhost:4000/api'

// Maps the static mock integration IDs to the connector source names
export const INTEGRATION_SOURCES: Record<string, string> = {
  'int-1': 'splunk',
  'int-2': 'sentinel',
  'int-3': 'qualys',
  'int-4': 'wiz',
  'int-5': 'crowdstrike',
  'int-6': 'sentinelone',
  'int-7': 'snyk',
  'int-8': 'github',
}

export interface IntegrationConfig {
  integrationId: string
  fields: Record<string, string | boolean | string[]>
  status: 'untested' | 'connected' | 'failed' | 'testing'
  testedAt?: string
  errorMessage?: string
}

interface BackendRow {
  id: string
  name: string
  source: string
  last_sync_at: string | null
  last_error: string | null
}

function authHeaders(): Record<string, string> {
  try {
    const raw = localStorage.getItem('ciso_auth') ?? sessionStorage.getItem('ciso_auth') ?? '{}'
    const { accessToken } = JSON.parse(raw) as { accessToken?: string }
    if (accessToken) return { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
  } catch {}
  return { 'Content-Type': 'application/json' }
}

// Local-state key for field values (never put credentials in long-term storage;
// this just keeps form pre-fill alive for the session)
const SESSION_KEY = 'ciso_integration_fields'

function loadFields(): Record<string, Record<string, string | boolean | string[]>> {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '{}') } catch { return {} }
}

function saveFields(id: string, fields: Record<string, string | boolean | string[]>) {
  try {
    const all = loadFields()
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...all, [id]: fields }))
  } catch {}
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useIntegrationConfigs() {
  const [configs, setConfigs] = useState<Record<string, IntegrationConfig>>({})
  const [backendIds, setBackendIds] = useState<Record<string, string>>({}) // source → backend DB id

  const loadFromBackend = useCallback(async () => {
    const headers = authHeaders()
    if (!headers['Authorization']) return
    try {
      const res = await fetch(`${API}/integrations`, { headers })
      if (!res.ok) return
      const rows: BackendRow[] = await res.json()
      const next: Record<string, IntegrationConfig> = {}
      const ids: Record<string, string> = {}

      // Reverse-map source → integration mock ID
      const sourceToMockId: Record<string, string> = Object.fromEntries(
        Object.entries(INTEGRATION_SOURCES).map(([k, v]) => [v, k])
      )

      for (const row of rows) {
        const mockId = sourceToMockId[row.source] ?? row.source
        const status: IntegrationConfig['status'] = row.last_error
          ? 'failed'
          : row.last_sync_at
          ? 'connected'
          : 'untested'

        next[mockId] = {
          integrationId: mockId,
          fields: loadFields()[mockId] ?? {},
          status,
          testedAt: row.last_sync_at ?? undefined,
          errorMessage: row.last_error ?? undefined,
        }
        ids[row.source] = row.id
      }

      setConfigs(next)
      setBackendIds(ids)
    } catch {}
  }, [])

  useEffect(() => { loadFromBackend() }, [loadFromBackend])

  // Save the field values locally (session) so the form can pre-fill
  const saveConfig = useCallback((id: string, fields: Record<string, string | boolean | string[]>) => {
    saveFields(id, fields)
    setConfigs(prev => ({
      ...prev,
      [id]: { integrationId: id, fields, status: prev[id]?.status ?? 'untested' },
    }))
  }, [])

  // Call backend: test + save atomically. Only saves if connection succeeds.
  const testConnection = useCallback(async (id: string): Promise<boolean> => {
    const source = INTEGRATION_SOURCES[id] ?? id
    const fields = loadFields()[id] ?? {}

    setConfigs(prev => ({ ...prev, [id]: { ...prev[id], integrationId: id, fields, status: 'testing' } }))

    const headers = authHeaders()
    if (!headers['Authorization']) {
      // No auth token — simulate for pure-frontend demo mode
      await new Promise(r => setTimeout(r, 1200))
      const ok = Object.values(fields).some(v => String(v).length > 4)
      setConfigs(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          status: ok ? 'connected' : 'failed',
          testedAt: ok ? new Date().toISOString() : undefined,
          errorMessage: ok ? undefined : 'No backend — enter credentials and start the server.',
        },
      }))
      return ok
    }

    try {
      const res = await fetch(`${API}/integrations/connect`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          source,
          name: id,
          params: Object.fromEntries(
            Object.entries(fields).map(([k, v]) => [k, String(v)])
          ),
        }),
      })
      const result = await res.json() as { ok: boolean; message: string; id?: string }

      if (result.ok && result.id) {
        setBackendIds(prev => ({ ...prev, [source]: result.id! }))
      }

      setConfigs(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          status: result.ok ? 'connected' : 'failed',
          testedAt: result.ok ? new Date().toISOString() : undefined,
          errorMessage: result.ok ? undefined : result.message,
        },
      }))

      return result.ok
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error — is the server running?'
      setConfigs(prev => ({
        ...prev,
        [id]: { ...prev[id], status: 'failed', errorMessage: msg },
      }))
      return false
    }
  }, [])

  // Trigger an immediate sync for a connected integration
  const syncNow = useCallback(async (id: string): Promise<{ synced: number } | null> => {
    const source = INTEGRATION_SOURCES[id] ?? id
    const dbId = backendIds[source]
    if (!dbId) return null

    const res = await fetch(`${API}/integrations/${dbId}/sync`, {
      method: 'POST',
      headers: authHeaders(),
    })
    if (!res.ok) return null
    await loadFromBackend()
    return res.json()
  }, [backendIds, loadFromBackend])

  // Disconnect a saved connection
  const disconnect = useCallback(async (id: string): Promise<void> => {
    const source = INTEGRATION_SOURCES[id] ?? id
    const dbId = backendIds[source]
    if (dbId) {
      await fetch(`${API}/integrations/${dbId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
    }
    setConfigs(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setBackendIds(prev => {
      const next = { ...prev }
      delete next[source]
      return next
    })
  }, [backendIds])

  const getConfig = useCallback((id: string) => configs[id] ?? null, [configs])
  const isConnected = useCallback((id: string) => configs[id]?.status === 'connected', [configs])

  return { configs, saveConfig, testConnection, syncNow, disconnect, getConfig, isConnected }
}
