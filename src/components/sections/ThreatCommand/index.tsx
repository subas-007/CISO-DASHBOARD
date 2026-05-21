import { useState, useEffect } from 'react'
import { Clock, Zap, Activity, AlertOctagon, ChevronLeft, ChevronRight, RefreshCw, Plus, X } from 'lucide-react'
import { useDataFreshness } from '../../../hooks/useDataFreshness'
import FreshnessBadge from '../../ui/FreshnessBadge'
import { SectionSkeleton } from '../../ui/SectionSkeleton'
import { FunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer } from 'recharts'
import { MetricCard } from '../../atomic/MetricCard'
import { TrendBadge } from '../../atomic/TrendBadge'
import { SeverityBadge } from '../../atomic/SeverityBadge'
import { useSecurityMetrics } from '../../../hooks/useSecurityMetrics'
import { useFilteredIncidents } from '../../../hooks/useFilteredData'
import { useFilter } from '../../../context/FilterContext'
import { useDrillDown } from '../../../context/DrillDownContext'
import { useIncidentIntegrations } from '../../../hooks/useIncidentIntegrations'
import { siemOffenses } from '../../../data/siemOffenseData'
import type { SIEMOffense } from '../../../data/siemOffenseData'
import type { NormalizedIncident } from '../../../types/incidentIntegration'
import type { IncidentPhase, Severity } from '../../../types/security'

const PHASE_ORDER: IncidentPhase[] = ['triage', 'investigation', 'containment', 'resolved']
const PHASE_COLORS: Record<IncidentPhase, string> = {
  triage: '#ef4444',
  investigation: '#f59e0b',
  containment: '#6366f1',
  resolved: '#10b981',
}

// Sparkline data — 7 days
const MTTD_SPARKLINE = [38, 35, 42, 33, 36, 31, 28]
const MTTR_SPARKLINE = [210, 195, 230, 185, 200, 190, 175]

function fmtMins(mins: number) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
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

function hasSIEMConnected(): boolean {
  try {
    const stored = JSON.parse(localStorage.getItem('ciso_integration_configs') ?? '{}')
    // int-1 = Splunk, int-2 = Microsoft Sentinel (SIEM category)
    return Object.entries(stored).some(([k, v]: [string, unknown]) =>
      ['int-1', 'int-2'].includes(k) && (v as { status: string }).status === 'connected'
    )
  } catch { return false }
}

const SEV_ROW_COLORS: Record<Severity, { bg: string; color: string; border: string }> = {
  critical: { bg: 'rgba(239,68,68,0.08)', color: '#ef4444', border: 'rgba(239,68,68,0.15)' },
  high: { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: 'rgba(245,158,11,0.15)' },
  medium: { bg: 'rgba(59,130,246,0.05)', color: '#3b82f6', border: 'transparent' },
  low: { bg: 'transparent', color: '#10b981', border: 'transparent' },
}

const SEV_BADGE: Record<Severity, { bg: string; color: string }> = {
  critical: { bg: 'rgba(239,68,68,0.2)', color: '#ef4444' },
  high: { bg: 'rgba(245,158,11,0.2)', color: '#f59e0b' },
  medium: { bg: 'rgba(59,130,246,0.2)', color: '#3b82f6' },
  low: { bg: 'rgba(16,185,129,0.2)', color: '#10b981' },
}

const STATUS_BADGE: Record<SIEMOffense['status'], { bg: string; color: string; label: string }> = {
  OPEN: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'Open' },
  IN_PROGRESS: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'In Progress' },
  CLOSED: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'Closed' },
}

const OFFENSES_PER_PAGE = 10

// ─── SIEM Offense Feed ────────────────────────────────────────────────────────
function SIEMOffenseFeed() {
  const siemConnected = hasSIEMConnected()
  const [offenses, setOffenses] = useState<SIEMOffense[]>(siemOffenses)
  const [sourceFilter, setSourceFilter] = useState<'All' | 'Splunk' | 'QRadar'>('All')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'CLOSED'>('ALL')
  const [page, setPage] = useState(1)
  const { openDrillDown } = useDrillDown()

  const connectedSources = (() => {
    try {
      const stored = JSON.parse(localStorage.getItem('ciso_integration_configs') ?? '{}')
      const hasSplunk = stored['int-1']?.status === 'connected'
      const hasSentinel = stored['int-2']?.status === 'connected'
      if (hasSplunk && hasSentinel) return 'Both'
      if (hasSplunk) return 'Splunk'
      if (hasSentinel) return 'Sentinel'
      return 'SIEM'
    } catch { return 'SIEM' }
  })()

  const filtered = offenses.filter(o => {
    if (sourceFilter !== 'All' && o.source !== sourceFilter) return false
    if (statusFilter !== 'ALL' && o.status !== statusFilter) return false
    return true
  })

  const totalPages = Math.ceil(filtered.length / OFFENSES_PER_PAGE)
  const pageOffenses = filtered.slice((page - 1) * OFFENSES_PER_PAGE, page * OFFENSES_PER_PAGE)

  const acknowledge = (id: string) => {
    setOffenses(prev => prev.map(o =>
      o.id === id && o.status === 'OPEN' ? { ...o, status: 'IN_PROGRESS' } : o
    ))
  }

  if (!siemConnected) {
    return (
      <div className="glass-card rounded-xl p-6 flex items-center justify-center gap-3 mt-4" style={{ minHeight: 120 }}>
        <div className="text-center">
          <p className="text-slate-500 text-sm font-medium">No SIEM Connected</p>
          <p className="text-slate-600 text-xs mt-1">Configure and connect Splunk or Microsoft Sentinel in Integrations to see the offense feed.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden mt-4">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="live-pulse w-2 h-2 rounded-full bg-red-500 inline-block" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">SIEM Offense Feed — Live Alerts</p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded font-bold"
          style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
          {connectedSources}
        </span>
        <span className="text-slate-600 text-[10px] ml-auto">{filtered.length} offenses</span>
      </div>

      {/* Filters */}
      <div className="px-4 py-2 border-b border-white/[0.04] flex items-center gap-2 flex-wrap">
        <span className="text-slate-600 text-[10px]">Source:</span>
        {(['All', 'Splunk', 'QRadar'] as const).map(s => (
          <button key={s} onClick={() => { setSourceFilter(s); setPage(1) }}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${sourceFilter === s ? 'text-indigo-300 bg-indigo-500/20 border border-indigo-500/30' : 'text-slate-600 hover:text-slate-400 border border-transparent'}`}>
            {s}
          </button>
        ))}
        <span className="text-slate-700 mx-1">|</span>
        <span className="text-slate-600 text-[10px]">Status:</span>
        {(['ALL', 'OPEN', 'IN_PROGRESS', 'CLOSED'] as const).map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${statusFilter === s ? 'text-indigo-300 bg-indigo-500/20 border border-indigo-500/30' : 'text-slate-600 hover:text-slate-400 border border-transparent'}`}>
            {s === 'ALL' ? 'All' : s === 'IN_PROGRESS' ? 'In Progress' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
              {['ID', 'Rule Triggered', 'Sev', 'Src IP → Dst IP', 'User', 'Events', 'Last Seen', 'Status', 'Mag.', ''].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[9px] text-slate-600 font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageOffenses.map(o => {
              const rowStyle = SEV_ROW_COLORS[o.severity]
              const sevBadge = SEV_BADGE[o.severity]
              const stBadge = STATUS_BADGE[o.status]
              return (
                <tr key={o.id} className="border-t border-white/[0.03] hover:brightness-110 cursor-pointer transition-all"
                  style={{ background: rowStyle.bg, borderLeft: `2px solid ${rowStyle.color}20` }}
                  onClick={() => openDrillDown({ type: 'siem_offense', id: o.id, label: o.ruleName, sourceIntegration: o.source })}
                >
                  <td className="px-3 py-2.5 font-mono text-slate-500 text-[9px] whitespace-nowrap">
                    <span className="text-slate-400">{o.source === 'QRadar' ? 'QR' : 'SP'}-{o.offenseId}</span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-300 max-w-[200px]">
                    <p className="truncate text-[10px]">{o.ruleName}</p>
                    <p className="text-slate-600 text-[9px] truncate">{o.category}</p>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded capitalize"
                      style={{ background: sevBadge.bg, color: sevBadge.color }}>{o.severity.slice(0, 4)}</span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[9px] whitespace-nowrap">
                    <p className="text-slate-400">{o.sourceIp}</p>
                    <p className="text-slate-600">{o.destinationIp}</p>
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 text-[9px] max-w-[100px]">
                    <p className="truncate">{o.username ?? '—'}</p>
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 tabular-nums text-[10px] whitespace-nowrap">
                    {o.eventCount.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 text-[9px] whitespace-nowrap">
                    {relativeTime(o.lastEventTime)}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: stBadge.bg, color: stBadge.color }}>{stBadge.label}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {o.source === 'QRadar' && (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 10 }, (_, j) => (
                          <div key={j} className="w-1.5 h-3 rounded-sm"
                            style={{ background: j < o.magnitude ? '#6366f1' : 'rgba(99,102,241,0.15)' }} />
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {o.status === 'OPEN' && (
                      <button
                        onClick={() => acknowledge(o.id)}
                        className="text-[9px] px-2 py-0.5 rounded text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-colors"
                      >
                        Ack
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-2.5 border-t border-white/[0.04] flex items-center justify-between">
        <span className="text-[10px] text-slate-600">Page {page} of {totalPages}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-white/5 disabled:opacity-30 transition-all">
            <ChevronLeft size={13} />
          </button>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-white/5 disabled:opacity-30 transition-all">
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Incident Management Feed ─────────────────────────────────────────────────
const INC_SEV_BADGE: Record<NormalizedIncident['severity'], { bg: string; color: string }> = {
  critical: { bg: 'rgba(239,68,68,0.2)', color: '#ef4444' },
  high: { bg: 'rgba(245,158,11,0.2)', color: '#f59e0b' },
  medium: { bg: 'rgba(59,130,246,0.2)', color: '#3b82f6' },
  low: { bg: 'rgba(16,185,129,0.2)', color: '#10b981' },
}

const INC_STATUS_BADGE: Record<NormalizedIncident['status'], { bg: string; color: string; label: string }> = {
  open: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'Open' },
  in_progress: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'In Progress' },
  resolved: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'Resolved' },
  closed: { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', label: 'Closed' },
}

interface CreateIncModalProps {
  onCreate: (d: Partial<NormalizedIncident>) => Promise<void>
  onClose: () => void
}

function CreateIncModal({ onCreate, onClose }: CreateIncModalProps) {
  const [title, setTitle] = useState('')
  const [severity, setSeverity] = useState<NormalizedIncident['severity']>('medium')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm text-slate-200 bg-white/5 border border-white/10 focus:border-indigo-500/50 focus:outline-none placeholder:text-slate-600'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="max-w-md w-full rounded-xl" style={{ background: 'rgba(10,15,30,0.98)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <p className="text-slate-200 text-sm font-semibold">Create Incident</p>
          <button onClick={onClose} className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Title</label>
            <input className={inputCls} placeholder="Incident title..." value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Severity</label>
            <select className={inputCls} value={severity} onChange={e => setSeverity(e.target.value as NormalizedIncident['severity'])}>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
            <textarea className={inputCls + ' resize-none'} rows={3} placeholder="Describe the incident..." value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-white/[0.06]">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-xs text-slate-400 hover:bg-white/5 border border-white/10 transition-all">Cancel</button>
          <button
            disabled={!title || saving}
            onClick={async () => { setSaving(true); await onCreate({ title, severity, description }); onClose() }}
            className="flex-1 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

function IncidentManagementFeed() {
  const { incidents, isConfigured, isSyncing, lastSynced, syncIncidents, createIncident } = useIncidentIntegrations()
  const { openDrillDown } = useDrillDown()
  const [sourceFilter, setSourceFilter] = useState<'All' | 'ServiceNow' | 'Opsgenie' | 'Manual'>('All')
  const [statusFilter, setStatusFilter] = useState<'All' | NormalizedIncident['status']>('All')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const filtered = incidents.filter(i => {
    if (sourceFilter !== 'All' && i.source !== sourceFilter) return false
    if (statusFilter !== 'All' && i.status !== statusFilter) return false
    return true
  })

  return (
    <div className="glass-card rounded-xl overflow-hidden mt-4">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Incident Management Feed</span>
        </div>
        {lastSynced && <span className="text-slate-600 text-[10px]">Last sync: {relativeTime(lastSynced)}</span>}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 transition-all"
          >
            <Plus size={11} />
            Create Incident
          </button>
          <button
            onClick={syncIncidents}
            disabled={isSyncing || !isConfigured}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/20 transition-all disabled:opacity-50"
          >
            <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {!isConfigured ? (
        <div className="p-6 text-center">
          <p className="text-slate-500 text-sm font-medium">No Incident Integration Configured</p>
          <p className="text-slate-600 text-xs mt-1">Connect ServiceNow or Opsgenie in Integrations to see live incident data.</p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="px-4 py-2 border-b border-white/[0.04] flex items-center gap-2 flex-wrap">
            <span className="text-slate-600 text-[10px]">Source:</span>
            {(['All', 'ServiceNow', 'Opsgenie', 'Manual'] as const).map(s => (
              <button key={s} onClick={() => setSourceFilter(s)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${sourceFilter === s ? 'text-indigo-300 bg-indigo-500/20 border border-indigo-500/30' : 'text-slate-600 hover:text-slate-400 border border-transparent'}`}>{s}</button>
            ))}
            <span className="text-slate-700 mx-1">|</span>
            <span className="text-slate-600 text-[10px]">Status:</span>
            {(['All', 'open', 'in_progress', 'resolved', 'closed'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all capitalize ${statusFilter === s ? 'text-indigo-300 bg-indigo-500/20 border border-indigo-500/30' : 'text-slate-600 hover:text-slate-400 border border-transparent'}`}>{s.replace('_', ' ')}</button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {['ID', 'Title', 'Severity', 'Status', 'Source', 'Assignee', 'Created'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[9px] text-slate-600 font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-600 text-xs">No incidents found.</td></tr>
                ) : filtered.map(inc => {
                  const sevB = INC_SEV_BADGE[inc.severity]
                  const stB = INC_STATUS_BADGE[inc.status]
                  return (
                    <tr key={inc.id}
                      className="border-t border-white/[0.03] cursor-pointer hover:bg-white/[0.04] transition-colors"
                      onClick={() => openDrillDown({ type: 'incident', id: inc.id, label: inc.title, sourceIntegration: inc.source })}
                    >
                      <td className="px-3 py-2.5 font-mono text-slate-500 text-[9px] whitespace-nowrap">{inc.externalId}</td>
                      <td className="px-3 py-2.5 text-slate-300 max-w-[200px]"><p className="truncate text-[10px]">{inc.title}</p></td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded capitalize" style={{ background: sevB.bg, color: sevB.color }}>{inc.severity.slice(0, 4)}</span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: stB.bg, color: stB.color }}>{stB.label}</span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: inc.source === 'ServiceNow' ? 'rgba(59,130,246,0.15)' : inc.source === 'Opsgenie' ? 'rgba(245,158,11,0.15)' : 'rgba(100,116,139,0.15)', color: inc.source === 'ServiceNow' ? '#3b82f6' : inc.source === 'Opsgenie' ? '#f59e0b' : '#94a3b8' }}>{inc.source}</span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 text-[9px] whitespace-nowrap">{inc.assignee}</td>
                      <td className="px-3 py-2.5 text-slate-500 text-[9px] whitespace-nowrap">{new Date(inc.createdAt).toLocaleDateString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showCreateModal && <CreateIncModal onCreate={createIncident} onClose={() => setShowCreateModal(false)} />}
    </div>
  )
}

// ─── Main ThreatCommand Export ────────────────────────────────────────────────
export function ThreatCommand({ lastUpdated }: { lastUpdated?: number }) {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 700); return () => clearTimeout(t) }, [])

  const m = useSecurityMetrics()
  const incidents = useFilteredIncidents()
  const { filter, togglePhase, toggleSeverity } = useFilter()
  const { openDrillDown } = useDrillDown()
  const { label: freshnessLabel } = useDataFreshness(lastUpdated)

  if (!loaded) return <SectionSkeleton accent="#ef4444" cols={3} />

  const totalAlerts = incidents.length
  const triageCount = incidents.filter(i => i.phase === 'triage').length
  const investigationCount = incidents.filter(i => i.phase === 'investigation').length
  const containmentCount = incidents.filter(i => i.phase === 'containment').length
  const resolvedCount = incidents.filter(i => i.phase === 'resolved').length

  const funnelData = [
    { name: 'Active Alerts', value: totalAlerts, fill: '#ef4444' },
    { name: 'Triaging', value: triageCount, fill: '#f59e0b' },
    { name: 'Investigating', value: investigationCount, fill: '#6366f1' },
    { name: 'Containment', value: containmentCount, fill: '#3b82f6' },
    { name: 'Resolved', value: resolvedCount, fill: '#10b981' },
  ]

  const recentIncidents = [...incidents].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 8)

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-6 rounded-full bg-red-500" />
        <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">B — Active Threat & Incident Command</h2>
        <div className="flex items-center gap-2 ml-2">
          <span className="live-pulse w-2 h-2 rounded-full bg-red-500 inline-block" />
          <span className="text-red-400 text-[10px] font-semibold uppercase tracking-wider">Live SOC Feed</span>
        </div>
        <div className="flex-1 h-px bg-white/5" />
        <FreshnessBadge label={freshnessLabel} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* MTTD / MTTR / Active */}
        <div className="flex flex-col gap-3">
          <div className="cursor-pointer" onClick={() => openDrillDown({ type: 'metric', id: 'mttd', label: `MTTD: ${fmtMins(m.mttdMinutes)}` })}>
            <MetricCard
              title="Mean Time to Detect (MTTD)"
              value={fmtMins(m.mttdMinutes)}
              icon={<Clock size={14} />}
              accentColor="#6366f1"
              trend={<TrendBadge value={m.mttdTrend} invertColors={true} />}
              subtitle="Avg across all active incidents"
              sparklineData={MTTD_SPARKLINE}
            />
          </div>
          <div className="cursor-pointer" onClick={() => openDrillDown({ type: 'metric', id: 'mttr', label: `MTTR: ${fmtMins(m.mttrMinutes)}` })}>
            <MetricCard
              title="Mean Time to Respond (MTTR)"
              value={fmtMins(m.mttrMinutes)}
              icon={<Zap size={14} />}
              accentColor="#8b5cf6"
              trend={<TrendBadge value={m.mttrTrend} invertColors={true} />}
              subtitle="Avg across resolved incidents"
              sparklineData={MTTR_SPARKLINE}
            />
          </div>
          <MetricCard
            title="Active Incidents"
            value={m.activeIncidents}
            icon={<AlertOctagon size={14} />}
            accentColor="#ef4444"
            subtitle={`${m.incidentsByPhase.triage} triaging · ${m.incidentsByPhase.investigation} investigating`}
          />

          {/* Phase filter pills */}
          <div className="glass-card rounded-xl p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">Filter by Phase</p>
            <div className="flex flex-col gap-1.5">
              {PHASE_ORDER.map(phase => {
                const count = m.incidentsByPhase[phase]
                const active = filter.phase === phase
                return (
                  <button key={phase} onClick={() => togglePhase(phase)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${active ? 'ring-1' : 'hover:bg-white/5'}`}
                    style={{ background: active ? `${PHASE_COLORS[phase]}15` : undefined, borderColor: active ? `${PHASE_COLORS[phase]}60` : undefined, color: active ? PHASE_COLORS[phase] : '#64748b' }}>
                    <span className="capitalize">{phase}</span>
                    <span className="tabular-nums font-bold" style={{ color: PHASE_COLORS[phase] }}>{count}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Incident Funnel Chart */}
        <div className="glass-card rounded-xl p-5 flex flex-col">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-4">Incident Funnel — Active Alerts by Phase</p>
          <div className="flex-1 min-h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Tooltip
                  contentStyle={{ background: '#0d1324', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(value, name) => [value, name]}
                />
                <Funnel
                  dataKey="value"
                  data={funnelData}
                  isAnimationActive={false}
                  onClick={(data) => {
                    const phaseMap: Record<string, IncidentPhase> = {
                      'Triaging': 'triage',
                      'Investigating': 'investigation',
                      'Containment': 'containment',
                      'Resolved': 'resolved',
                    }
                    const phase = phaseMap[data.name]
                    if (phase) togglePhase(phase)
                  }}
                >
                  <LabelList
                    position="right"
                    content={({ value, name, x, y, width, height }) => {
                      const cx = (x as number) + (width as number) / 2
                      const cy = (y as number) + (height as number) / 2
                      return (
                        <g>
                          <text x={cx} y={cy - 6} textAnchor="middle" fill="#94a3b8" fontSize={10} fontWeight="600">
                            {name as string}
                          </text>
                          <text x={cx} y={cy + 8} textAnchor="middle" fill="#e2e8f0" fontSize={13} fontWeight="700">
                            {value as number}
                          </text>
                        </g>
                      )
                    }}
                  />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Incidents Table */}
        <div className="glass-card rounded-xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <Activity size={13} className="text-slate-500" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Recent Incidents</p>
          </div>
          <div className="flex-1 overflow-auto">
            {recentIncidents.map(inc => (
              <div key={inc.id}
                className="px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.04] cursor-pointer transition-colors"
                onClick={() => openDrillDown({ type: 'incident', id: inc.id, label: inc.title, sourceIntegration: inc.source })}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-slate-300 text-xs font-medium leading-tight flex-1 truncate">{inc.title}</p>
                  <SeverityBadge severity={inc.severity} size="xs" />
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="text-slate-600 font-mono">{inc.id}</span>
                  <span style={{ color: PHASE_COLORS[inc.phase] }} className="font-medium capitalize">{inc.phase}</span>
                  <span className="text-slate-600">{inc.source}</span>
                  <button
                    onClick={e => { e.stopPropagation(); toggleSeverity(inc.severity) }}
                    className="text-slate-600 ml-auto hover:text-slate-400 transition-colors"
                  >
                    {inc.assignee}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SIEM Offense Feed — below the 3-column grid */}
      <SIEMOffenseFeed />

      {/* Incident Management Feed */}
      <IncidentManagementFeed />
    </section>
  )
}
