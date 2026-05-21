import { useState, useMemo } from 'react'
import { RefreshCw, Plus, X, ToggleLeft, ToggleRight, Trash2, Shield, AlertTriangle } from 'lucide-react'
import { useThreatFeeds } from '../hooks/useThreatFeeds'
import { useDrillDown } from '../context/DrillDownContext'
import type { ThreatFeedSource, IOCType } from '../types/threatFeed'

const inputCls = 'w-full px-3 py-2 rounded-lg text-sm text-slate-200 bg-white/5 border border-white/10 focus:border-indigo-500/50 focus:outline-none placeholder:text-slate-600'
const labelCls = 'block text-xs font-medium text-slate-400 mb-1'

const FEED_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  CISA_KEV: { bg: 'rgba(239,68,68,0.2)', color: '#ef4444' },
  MITRE_ATTACK: { bg: 'rgba(245,158,11,0.2)', color: '#f59e0b' },
  FEODO_TRACKER: { bg: 'rgba(99,102,241,0.2)', color: '#818cf8' },
  OTX: { bg: 'rgba(59,130,246,0.2)', color: '#3b82f6' },
  CUSTOM: { bg: 'rgba(16,185,129,0.2)', color: '#10b981' },
}

const SEV_COLORS: Record<string, { bg: string; color: string }> = {
  critical: { bg: 'rgba(239,68,68,0.2)', color: '#ef4444' },
  high: { bg: 'rgba(245,158,11,0.2)', color: '#f59e0b' },
  medium: { bg: 'rgba(59,130,246,0.2)', color: '#3b82f6' },
  low: { bg: 'rgba(16,185,129,0.2)', color: '#10b981' },
  info: { bg: 'rgba(100,116,139,0.2)', color: '#94a3b8' },
}

const IOC_COLORS: Record<IOCType, { bg: string; color: string }> = {
  CVE: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
  IP: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  DOMAIN: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8' },
  HASH: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
  URL: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
  TECHNIQUE: { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa' },
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// Toggle component
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className="transition-colors">
      {on ? <ToggleRight size={20} className="text-emerald-400" /> : <ToggleLeft size={20} className="text-slate-600" />}
    </button>
  )
}

// Add Source Modal
interface AddSourceModalProps {
  onAdd: (source: Omit<ThreatFeedSource, 'id' | 'fetchStatus'>) => void
  onClose: () => void
}

function AddSourceModal({ onAdd, onClose }: AddSourceModalProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<ThreatFeedSource['type']>('CUSTOM')
  const [url, setUrl] = useState('')
  const [apiKey, setApiKey] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="max-w-md w-full rounded-xl" style={{ background: 'rgba(10,15,30,0.98)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <p className="text-slate-200 text-sm font-semibold">Add Feed Source</p>
          <button onClick={onClose} className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className={labelCls}>Source Name</label>
            <input className={inputCls} placeholder="My Custom Feed" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Feed Type</label>
            <select className={inputCls} value={type} onChange={e => setType(e.target.value as ThreatFeedSource['type'])}>
              <option value="CISA_KEV">CISA KEV</option>
              <option value="MITRE_ATTACK">MITRE ATT&CK</option>
              <option value="FEODO_TRACKER">Feodo Tracker</option>
              <option value="OTX">AlienVault OTX</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Feed URL</label>
            <input className={inputCls} placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>API Key <span className="text-slate-600">(optional)</span></label>
            <input className={inputCls} type="password" placeholder="••••••••" value={apiKey} onChange={e => setApiKey(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-white/[0.06]">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-xs text-slate-400 hover:bg-white/5 border border-white/10 transition-all">Cancel</button>
          <button
            onClick={() => {
              if (!name || !url) return
              onAdd({ name, type, url, apiKey: apiKey || undefined, enabled: true })
              onClose()
            }}
            className="flex-1 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            Add Source
          </button>
        </div>
      </div>
    </div>
  )
}

// Feed Source Card
function FeedSourceCard({ source, onToggle, onRefresh, onDelete, isRefreshing }: {
  source: ThreatFeedSource
  onToggle: () => void
  onRefresh: () => void
  onDelete: () => void
  isRefreshing: boolean
}) {
  const typeStyle = FEED_TYPE_COLORS[source.type] ?? FEED_TYPE_COLORS.CUSTOM

  return (
    <div className="glass-card rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-slate-200 text-sm font-semibold truncate">{source.name}</p>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block" style={{ background: typeStyle.bg, color: typeStyle.color }}>
            {source.type.replace('_', ' ')}
          </span>
        </div>
        <Toggle on={source.enabled} onChange={onToggle} />
      </div>

      <div className="text-[10px] text-slate-600 truncate">{source.url}</div>

      <div className="flex items-center gap-3 text-[10px]">
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${source.fetchStatus === 'success' ? 'bg-emerald-400' : source.fetchStatus === 'error' ? 'bg-red-400' : source.fetchStatus === 'loading' ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
          <span className="text-slate-500 capitalize">{source.fetchStatus === 'idle' ? 'Not fetched' : source.fetchStatus}</span>
        </div>
        {source.lastFetched && (
          <span className="text-slate-600">{relativeTime(source.lastFetched)}</span>
        )}
        {source.itemCount !== undefined && (
          <span className="text-slate-500 ml-auto">{source.itemCount} items</span>
        )}
      </div>

      {source.errorMessage && (
        <p className="text-[10px] text-red-400 truncate">{source.errorMessage}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex-1 py-1.5 rounded-lg text-[11px] font-medium text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
        >
          <RefreshCw size={11} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Fetching...' : 'Refresh'}
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 border border-white/[0.06] transition-all"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

const IOC_TYPES: IOCType[] = ['CVE', 'IP', 'DOMAIN', 'HASH', 'URL', 'TECHNIQUE']
const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info']
const PAGE_SIZE = 20

export default function ThreatFeeds() {
  const { sources, items, isRefreshing, addSource, removeSource, toggleSource, refreshFeed, refreshAll } = useThreatFeeds()
  const { openDrillDown } = useDrillDown()

  const [search, setSearch] = useState('')
  const [iocFilter, setIocFilter] = useState<IOCType | 'All'>('All')
  const [sevFilter, setSevFilter] = useState<string>('All')
  const [sourceFilter, setSourceFilter] = useState<string>('All')
  const [page, setPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isRefreshingAll, setIsRefreshingAll] = useState(false)

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (iocFilter !== 'All' && item.iocType !== iocFilter) return false
      if (sevFilter !== 'All' && item.severity !== sevFilter) return false
      if (sourceFilter !== 'All' && item.feedSourceId !== sourceFilter) return false
      if (search) {
        const s = search.toLowerCase()
        return item.value.toLowerCase().includes(s) || item.title.toLowerCase().includes(s) || item.description.toLowerCase().includes(s)
      }
      return true
    })
  }, [items, iocFilter, sevFilter, sourceFilter, search])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const pagedItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const stats = useMemo(() => ({
    total: items.length,
    critical: items.filter(i => i.severity === 'critical').length,
    cves: items.filter(i => i.iocType === 'CVE').length,
    ips: items.filter(i => i.iocType === 'IP').length,
    lastUpdated: items.reduce((acc: string, i) => i.lastSeen > acc ? i.lastSeen : acc, ''),
  }), [items])

  const handleRefreshAll = async () => {
    setIsRefreshingAll(true)
    await refreshAll()
    setIsRefreshingAll(false)
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0f1e' }}>
      {/* Page header */}
      <div className="sticky top-0 z-40 border-b border-white/[0.06] px-6 py-3 flex items-center gap-3" style={{ background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(20px)' }}>
        <Shield size={14} className="text-indigo-400" />
        <span className="text-slate-300 text-xs font-semibold">Threat Intelligence Feeds</span>
        <span className="text-[10px] px-2 py-0.5 rounded font-bold ml-2" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
          {stats.total} IOCs
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleRefreshAll}
            disabled={isRefreshingAll}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/20 transition-all disabled:opacity-50"
          >
            <RefreshCw size={12} className={isRefreshingAll ? 'animate-spin' : ''} />
            {isRefreshingAll ? 'Refreshing...' : 'Refresh All'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            <Plus size={12} />
            Add Source
          </button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

        {/* Stats Bar */}
        <div className="glass-card rounded-xl px-6 py-4">
          <div className="flex flex-wrap items-center gap-6">
            {[
              { label: 'Total IOCs', value: stats.total, color: '#e2e8f0' },
              { label: 'Critical', value: stats.critical, color: '#ef4444' },
              { label: 'CVEs', value: stats.cves, color: '#f59e0b' },
              { label: 'IP IOCs', value: stats.ips, color: '#818cf8' },
              { label: 'Active Feeds', value: sources.filter(s => s.enabled).length, color: '#10b981' },
            ].map(item => (
              <div key={item.label}>
                <p className="text-[9px] text-slate-600 uppercase tracking-wider">{item.label}</p>
                <p className="text-2xl font-bold tabular-nums" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
            {stats.lastUpdated && (
              <div className="ml-auto text-right">
                <p className="text-[9px] text-slate-600 uppercase tracking-wider">Last Updated</p>
                <p className="text-xs text-slate-400 font-medium">{relativeTime(stats.lastUpdated)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-6">
          {/* Feed Sources Panel */}
          <div className="w-72 shrink-0 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 rounded-full bg-indigo-500" />
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Feed Sources</p>
            </div>
            {sources.map(source => (
              <FeedSourceCard
                key={source.id}
                source={source}
                onToggle={() => toggleSource(source.id)}
                onRefresh={() => refreshFeed(source.id)}
                onDelete={() => removeSource(source.id)}
                isRefreshing={!!isRefreshing[source.id]}
              />
            ))}
            {sources.length === 0 && (
              <div className="glass-card rounded-xl p-4 text-center">
                <p className="text-slate-600 text-xs">No feed sources configured.</p>
                <button onClick={() => setShowAddModal(true)} className="mt-2 text-indigo-400 text-xs hover:text-indigo-300">Add one</button>
              </div>
            )}
          </div>

          {/* IOC Feed Table */}
          <div className="flex-1 min-w-0 glass-card rounded-xl overflow-hidden">
            {/* Filters */}
            <div className="px-4 py-3 border-b border-white/5 space-y-2">
              <div className="flex items-center gap-3">
                <AlertTriangle size={13} className="text-slate-500" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">IOC Feed</p>
                <span className="text-[10px] text-slate-600 ml-auto">{filteredItems.length} items</span>
              </div>
              <input
                className={inputCls + ' text-xs py-1.5'}
                placeholder="Search IOC value, title, description..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-600 text-[10px]">Type:</span>
                {(['All', ...IOC_TYPES] as const).map(t => (
                  <button key={t} onClick={() => { setIocFilter(t as IOCType | 'All'); setPage(1) }}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${iocFilter === t ? 'text-indigo-300 bg-indigo-500/20 border border-indigo-500/30' : 'text-slate-600 hover:text-slate-400 border border-transparent'}`}>
                    {t}
                  </button>
                ))}
                <span className="text-slate-700 mx-1">|</span>
                <span className="text-slate-600 text-[10px]">Severity:</span>
                {(['All', ...SEVERITIES] as const).map(s => (
                  <button key={s} onClick={() => { setSevFilter(s); setPage(1) }}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all capitalize ${sevFilter === s ? 'text-indigo-300 bg-indigo-500/20 border border-indigo-500/30' : 'text-slate-600 hover:text-slate-400 border border-transparent'}`}>
                    {s}
                  </button>
                ))}
                <span className="text-slate-700 mx-1">|</span>
                <span className="text-slate-600 text-[10px]">Source:</span>
                <button onClick={() => { setSourceFilter('All'); setPage(1) }}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${sourceFilter === 'All' ? 'text-indigo-300 bg-indigo-500/20 border border-indigo-500/30' : 'text-slate-600 hover:text-slate-400 border border-transparent'}`}>
                  All
                </button>
                {sources.filter(s => s.enabled).map(s => (
                  <button key={s.id} onClick={() => { setSourceFilter(s.id); setPage(1) }}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${sourceFilter === s.id ? 'text-indigo-300 bg-indigo-500/20 border border-indigo-500/30' : 'text-slate-600 hover:text-slate-400 border border-transparent'}`}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    {['Severity', 'Type', 'Value', 'Feed Source', 'MITRE Tactic', 'First Seen', 'Last Seen', 'Tags'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[9px] text-slate-600 font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedItems.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-600">No items match the current filters.</td></tr>
                  ) : pagedItems.map(item => {
                    const sevStyle = SEV_COLORS[item.severity] ?? SEV_COLORS.info
                    const iocStyle = IOC_COLORS[item.iocType] ?? IOC_COLORS.CVE
                    return (
                      <tr key={item.id}
                        className="border-t border-white/[0.03] cursor-pointer hover:bg-white/[0.04] transition-colors group"
                        onClick={() => openDrillDown({ type: 'threat_feed_item', id: item.id, label: item.value, sourceIntegration: item.feedSourceName })}
                      >
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded capitalize" style={{ background: sevStyle.bg, color: sevStyle.color }}>{item.severity}</span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: iocStyle.bg, color: iocStyle.color }}>{item.iocType}</span>
                        </td>
                        <td className="px-3 py-2.5 max-w-[180px]">
                          <p className="font-mono text-slate-300 text-[10px] truncate group-hover:text-slate-100">{item.value}</p>
                          <p className="text-slate-600 text-[9px] truncate">{item.title}</p>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="text-[9px] font-medium text-slate-400">{item.feedSourceName}</span>
                        </td>
                        <td className="px-3 py-2.5 max-w-[160px]">
                          <p className="text-slate-500 text-[9px] truncate">{item.mitreTactic ?? '—'}</p>
                          {item.mitreTechnique && <p className="text-slate-600 text-[9px] font-mono">{item.mitreTechnique}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 text-[9px] whitespace-nowrap">
                          {new Date(item.firstSeen).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 text-[9px] whitespace-nowrap">
                          {relativeTime(item.lastSeen)}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1 flex-wrap">
                            {item.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="text-[8px] px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>{tag}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-2.5 border-t border-white/[0.04] flex items-center justify-between">
              <span className="text-[10px] text-slate-600">Page {page} of {totalPages} · {filteredItems.length} items</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-2 py-1 rounded text-[10px] text-slate-500 hover:text-slate-300 hover:bg-white/5 disabled:opacity-30 transition-all">Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-2 py-1 rounded text-[10px] text-slate-500 hover:text-slate-300 hover:bg-white/5 disabled:opacity-30 transition-all">Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddModal && <AddSourceModal onAdd={addSource} onClose={() => setShowAddModal(false)} />}
    </div>
  )
}
