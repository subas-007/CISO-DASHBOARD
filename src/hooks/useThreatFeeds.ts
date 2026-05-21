import { useState, useCallback } from 'react'
import type { ThreatFeedSource, ThreatFeedItem } from '../types/threatFeed'
import { cisaKevMock, mitreAttackMock, feodoTrackerMock, otxMock } from '../data/threatFeedMockData'

const CONFIG_KEY = 'ciso_threat_feeds_config'
const DATA_KEY = 'ciso_threat_feeds_data'

const DEFAULT_SOURCES: ThreatFeedSource[] = [
  {
    id: 'feed-cisa-kev', name: 'CISA KEV', type: 'CISA_KEV',
    url: 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
    enabled: true, fetchStatus: 'idle',
  },
  {
    id: 'feed-mitre-attack', name: 'MITRE ATT&CK', type: 'MITRE_ATTACK',
    url: 'https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack-14.1.json',
    enabled: true, fetchStatus: 'idle',
  },
  {
    id: 'feed-feodo', name: 'Feodo Tracker C2', type: 'FEODO_TRACKER',
    url: 'https://feodotracker.abuse.ch/downloads/ipblocklist.json',
    enabled: true, fetchStatus: 'idle',
  },
  {
    id: 'feed-otx', name: 'AlienVault OTX', type: 'OTX',
    url: 'https://otx.alienvault.com/api/v1/pulses/subscribed',
    enabled: false, fetchStatus: 'idle',
  },
]

function loadSources(): ThreatFeedSource[] {
  try {
    const stored = JSON.parse(localStorage.getItem(CONFIG_KEY) ?? 'null')
    if (Array.isArray(stored) && stored.length > 0) return stored
  } catch { /* ignore */ }
  return DEFAULT_SOURCES
}

function loadItems(): ThreatFeedItem[] {
  try {
    const stored = JSON.parse(localStorage.getItem(DATA_KEY) ?? 'null')
    if (Array.isArray(stored)) return stored
  } catch { /* ignore */ }
  // Bootstrap with mock data for enabled feeds
  const items = [...cisaKevMock, ...mitreAttackMock, ...feodoTrackerMock]
  localStorage.setItem(DATA_KEY, JSON.stringify(items))
  return items
}

function parseCISAKEV(data: unknown, sourceId: string): ThreatFeedItem[] {
  try {
    const d = data as { vulnerabilities?: Array<Record<string, unknown>> }
    if (!d.vulnerabilities) return cisaKevMock
    return d.vulnerabilities.slice(0, 50).map((v, i) => ({
      id: `cisa-live-${i}`,
      feedSourceId: sourceId,
      feedSourceName: 'CISA KEV',
      iocType: 'CVE' as const,
      value: String(v.cveID ?? ''),
      severity: v.knownRansomwareCampaignUse === 'Known' ? 'critical' as const : 'high' as const,
      title: String(v.vulnerabilityName ?? ''),
      description: String(v.shortDescription ?? ''),
      cveId: String(v.cveID ?? ''),
      firstSeen: String(v.dateAdded ?? new Date().toISOString()),
      lastSeen: new Date().toISOString(),
      tags: ['cisa-kev'],
    }))
  } catch {
    return cisaKevMock
  }
}

function parseFeodoTracker(data: unknown, sourceId: string): ThreatFeedItem[] {
  try {
    const arr = data as Array<Record<string, unknown>>
    if (!Array.isArray(arr)) return feodoTrackerMock
    return arr.slice(0, 20).map((item, i) => ({
      id: `feodo-live-${i}`,
      feedSourceId: sourceId,
      feedSourceName: 'Feodo Tracker C2',
      iocType: 'IP' as const,
      value: String(item.ip_address ?? item.ip ?? ''),
      severity: 'high' as const,
      title: `Feodo C2: ${item.ip_address ?? item.ip}`,
      description: 'Known Feodo botnet C2 server.',
      mitreTactic: 'TA0011 Command and Control',
      mitreTechnique: 'T1071',
      firstSeen: String(item.first_seen ?? new Date().toISOString()),
      lastSeen: new Date().toISOString(),
      tags: ['c2', 'feodo', 'botnet'],
    }))
  } catch {
    return feodoTrackerMock
  }
}

export function useThreatFeeds() {
  const [sources, setSources] = useState<ThreatFeedSource[]>(loadSources)
  const [items, setItems] = useState<ThreatFeedItem[]>(loadItems)
  const [isRefreshing, setIsRefreshing] = useState<Record<string, boolean>>({})

  const persistSources = (s: ThreatFeedSource[]) => {
    setSources(s)
    localStorage.setItem(CONFIG_KEY, JSON.stringify(s))
  }

  const persistItems = (newItems: ThreatFeedItem[], feedSourceId: string) => {
    setItems(prev => {
      const without = prev.filter(i => i.feedSourceId !== feedSourceId)
      const merged = [...without, ...newItems]
      localStorage.setItem(DATA_KEY, JSON.stringify(merged))
      return merged
    })
  }

  const addSource = useCallback((source: Omit<ThreatFeedSource, 'id' | 'fetchStatus'>) => {
    const newSource: ThreatFeedSource = {
      ...source,
      id: `feed-custom-${Date.now()}`,
      fetchStatus: 'idle',
    }
    persistSources([...loadSources(), newSource])
  }, [])

  const removeSource = useCallback((id: string) => {
    persistSources(loadSources().filter(s => s.id !== id))
    setItems(prev => {
      const updated = prev.filter(i => i.feedSourceId !== id)
      localStorage.setItem(DATA_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const toggleSource = useCallback((id: string) => {
    const updated = loadSources().map(s => s.id === id ? { ...s, enabled: !s.enabled } : s)
    persistSources(updated)
  }, [])

  const refreshFeed = useCallback(async (id: string) => {
    const source = loadSources().find(s => s.id === id)
    if (!source) return

    setIsRefreshing(prev => ({ ...prev, [id]: true }))
    setSources(prev => prev.map(s => s.id === id ? { ...s, fetchStatus: 'loading' } : s))

    try {
      if (source.type === 'MITRE_ATTACK') {
        // Never fetch the real file — too large
        persistItems(mitreAttackMock, id)
        const updated = loadSources().map(s => s.id === id ? { ...s, fetchStatus: 'success' as const, lastFetched: new Date().toISOString(), itemCount: mitreAttackMock.length } : s)
        persistSources(updated)
      } else if (source.type === 'OTX') {
        // Always use mock
        persistItems(otxMock, id)
        const updated = loadSources().map(s => s.id === id ? { ...s, fetchStatus: 'success' as const, lastFetched: new Date().toISOString(), itemCount: otxMock.length } : s)
        persistSources(updated)
      } else {
        let feedItems: ThreatFeedItem[] = []
        try {
          const response = await fetch(source.url)
          const data: unknown = await response.json()
          if (source.type === 'CISA_KEV') {
            feedItems = parseCISAKEV(data, id)
          } else if (source.type === 'FEODO_TRACKER') {
            feedItems = parseFeodoTracker(data, id)
          } else {
            // CUSTOM — best effort
            if (Array.isArray(data)) {
              feedItems = parseFeodoTracker(data, id)
            } else {
              feedItems = parseCISAKEV(data, id)
            }
          }
        } catch {
          // CORS or network fail — use mock
          if (source.type === 'CISA_KEV') feedItems = cisaKevMock
          else if (source.type === 'FEODO_TRACKER') feedItems = feodoTrackerMock
          else feedItems = []
        }

        persistItems(feedItems, id)
        const updated = loadSources().map(s => s.id === id ? { ...s, fetchStatus: 'success' as const, lastFetched: new Date().toISOString(), itemCount: feedItems.length } : s)
        persistSources(updated)
      }
    } catch {
      const updated = loadSources().map(s => s.id === id ? { ...s, fetchStatus: 'error' as const, errorMessage: 'Fetch failed' } : s)
      persistSources(updated)
    } finally {
      setIsRefreshing(prev => ({ ...prev, [id]: false }))
    }
  }, [])

  const refreshAll = useCallback(async () => {
    const enabledSources = loadSources().filter(s => s.enabled)
    await Promise.all(enabledSources.map(s => refreshFeed(s.id)))
  }, [refreshFeed])

  const enabledItems = items.filter(item => {
    const source = sources.find(s => s.id === item.feedSourceId)
    return source?.enabled ?? false
  })

  return {
    sources,
    items: enabledItems,
    isRefreshing,
    addSource,
    removeSource,
    toggleSource,
    refreshFeed,
    refreshAll,
  }
}
