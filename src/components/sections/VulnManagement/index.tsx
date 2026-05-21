import { useMemo, useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine, CartesianGrid } from 'recharts'
import { ShieldAlert } from 'lucide-react'
import { useDataFreshness } from '../../../hooks/useDataFreshness'
import FreshnessBadge from '../../ui/FreshnessBadge'
import { SectionSkeleton } from '../../ui/SectionSkeleton'
import { SecurityDataTable } from '../../atomic/SecurityDataTable'
import { useFilteredVulnerabilities } from '../../../hooks/useFilteredData'
import { useFilter } from '../../../context/FilterContext'
import { vulnerabilities } from '../../../data/mockData'
import { useVAReports } from '../../../hooks/useVAReports'
import { useDrillDown } from '../../../context/DrillDownContext'
import type { VAFinding, VAReport } from '../../../types/vaReport'
import type { Severity, AssetTier } from '../../../types/security'

const TIER_LABELS: Record<AssetTier, string> = { T0: 'HSM/Payment', T1: 'Core Banking', T2: 'Internal', T3: 'Dev/Test' }
const SEV_COLORS: Record<Severity, string> = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#10b981' }

const SLA_TREND = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  avgAge: Math.round(15 + Math.sin(i * 0.3) * 8 + i * 0.4),
  slaLine: 14,
}))

// --- CVE Age Heatmap ---
const HEATMAP_WEEKS = 12
const heatmapData: { week: number; critical: number; high: number; medium: number; low: number }[] =
  Array.from({ length: HEATMAP_WEEKS }, (_, w) => ({
    week: w + 1,
    critical: [8, 5, 12, 3, 7, 9, 4, 11, 6, 8, 10, 7][w],
    high: [22, 18, 30, 15, 25, 28, 19, 33, 21, 24, 29, 20][w],
    medium: [45, 38, 55, 30, 48, 52, 40, 60, 44, 50, 58, 42][w],
    low: [18, 14, 22, 10, 16, 20, 15, 25, 17, 19, 23, 16][w],
  }))

const SEV_ROWS: { key: 'critical' | 'high' | 'medium' | 'low'; label: string; color: string; max: number }[] = [
  { key: 'critical', label: 'Critical', color: '#ef4444', max: 12 },
  { key: 'high', label: 'High', color: '#f59e0b', max: 33 },
  { key: 'medium', label: 'Medium', color: '#3b82f6', max: 60 },
  { key: 'low', label: 'Low', color: '#10b981', max: 25 },
]

function VulnHeatmap() {
  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">CVE Discovery Density — Last 12 Weeks</p>
          <p className="text-slate-600 text-[9px] mt-0.5">Cell color intensity = volume of new CVEs discovered that week</p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3">
          {SEV_ROWS.map(s => (
            <div key={s.key} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: s.color, opacity: 0.7 }} />
              <span className="text-[9px] text-slate-500">{s.label}</span>
            </div>
          ))}
          <div className="ml-2 flex items-center gap-1 border-l border-white/10 pl-2">
            <span className="text-[9px] text-slate-600">Low</span>
            {[0.15, 0.35, 0.55, 0.75, 1.0].map((op, i) => (
              <div key={i} className="w-4 h-4 rounded-sm" style={{ background: '#6366f1', opacity: op }} />
            ))}
            <span className="text-[9px] text-slate-600">High</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        {/* Severity labels */}
        <div className="flex flex-col justify-around" style={{ width: 56 }}>
          {SEV_ROWS.map(s => (
            <div key={s.key} className="flex items-center h-6">
              <span className="text-[9px] font-semibold" style={{ color: s.color }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1">
          <div className="flex gap-1">
            {heatmapData.map(week => (
              <div key={week.week} className="flex flex-col gap-1 flex-1">
                {SEV_ROWS.map(s => {
                  const val = week[s.key]
                  const intensity = Math.max(0.08, val / s.max)
                  return (
                    <div
                      key={s.key}
                      className="h-6 rounded-sm transition-opacity cursor-default"
                      style={{ background: s.color, opacity: intensity, minWidth: 8 }}
                      title={`Week ${week.week} · ${s.label}: ${val} CVEs`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
          {/* Week labels */}
          <div className="flex gap-1 mt-1">
            {heatmapData.map(week => (
              <div key={week.week} className="flex-1 text-center">
                <span className="text-[8px] text-slate-700">W{week.week}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── VA Report Findings Panel ─────────────────────────────────────────────────
const STATUS_BADGE: Record<VAFinding['status'], { bg: string; color: string; label: string }> = {
  open: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: 'Open' },
  accepted_risk: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'Accepted' },
  resolved: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'Resolved' },
}

function VAReportTab({ report }: { report: VAReport }) {
  const [findings, setFindings] = useState<VAFinding[]>(report.findings)
  const { openDrillDown } = useDrillDown()

  const sorted = [...findings].sort((a, b) => {
    const order: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    return order[a.severity] - order[b.severity]
  })

  const acceptRisk = (id: string) => {
    setFindings(prev => prev.map(f => f.id === id ? { ...f, status: 'accepted_risk' as const } : f))
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
            {['Sev', 'CVE ID', 'Title', 'Host', 'Port', 'CVSS', 'Recommendation', 'Status', ''].map(h => (
              <th key={h} className="px-3 py-2.5 text-left text-[9px] text-slate-600 font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(f => {
            const sc = SEV_COLORS[f.severity]
            const stb = STATUS_BADGE[f.status]
            return (
              <tr key={f.id}
                className="border-t border-white/[0.03] hover:bg-white/[0.04] cursor-pointer transition-colors"
                onClick={() => openDrillDown({ type: 'va_finding', id: f.id, label: f.title, sourceIntegration: report.scanner })}
              >
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded capitalize"
                    style={{ background: `${sc}20`, color: sc }}>{f.severity.slice(0, 4)}</span>
                </td>
                <td className="px-3 py-2.5 font-mono text-[9px] text-indigo-400 whitespace-nowrap">
                  {f.cveId ?? '—'}
                </td>
                <td className="px-3 py-2.5 text-slate-300 max-w-[220px]">
                  <p className="truncate text-[10px] font-medium">{f.title}</p>
                  <p className="text-slate-600 text-[9px] truncate">{f.service ?? f.description.slice(0, 60)}</p>
                </td>
                <td className="px-3 py-2.5 font-mono text-slate-400 text-[9px] whitespace-nowrap">{f.affectedHost}</td>
                <td className="px-3 py-2.5 text-slate-500 text-[9px] whitespace-nowrap">{f.affectedPort ?? '—'}</td>
                <td className="px-3 py-2.5 tabular-nums text-[10px] whitespace-nowrap"
                  style={{ color: f.cvssScore >= 9 ? '#ef4444' : f.cvssScore >= 7 ? '#f59e0b' : f.cvssScore >= 4 ? '#3b82f6' : '#10b981' }}>
                  {f.cvssScore.toFixed(1)}
                </td>
                <td className="px-3 py-2.5 text-slate-500 text-[9px] max-w-[180px]">
                  <p className="truncate">{f.recommendation}</p>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ background: stb.bg, color: stb.color }}>{stb.label}</span>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {f.status === 'open' && (
                    <button
                      onClick={() => acceptRisk(f.id)}
                      className="text-[9px] px-2 py-0.5 rounded text-amber-400/80 hover:bg-amber-500/10 border border-amber-500/20 transition-colors whitespace-nowrap"
                    >
                      Accept Risk
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function VAReportFindingsPanel() {
  const { reports, clearReports, openFindings } = useVAReports()
  const [activeTab, setActiveTab] = useState(0)

  if (reports.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 mt-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-1 h-5 rounded-full bg-emerald-500" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">VA Scanner Findings</p>
        </div>
        <p className="text-slate-600 text-sm text-center py-4">No VA reports imported yet. Go to Integrations → VA Scanner section to import a report.</p>
      </div>
    )
  }

  const totalCritical = openFindings.filter(f => f.severity === 'critical').length
  const bySev = {
    critical: openFindings.filter(f => f.severity === 'critical').length,
    high: openFindings.filter(f => f.severity === 'high').length,
    medium: openFindings.filter(f => f.severity === 'medium').length,
    low: openFindings.filter(f => f.severity === 'low').length,
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden mt-4">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
        <div className="w-1 h-5 rounded-full bg-emerald-500" />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">VA Scanner Findings</p>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={clearReports}
            className="text-[9px] px-2 py-0.5 rounded text-slate-600 hover:text-slate-400 hover:bg-white/5 border border-white/[0.06] transition-colors"
          >
            Clear All Reports
          </button>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-6 flex-wrap" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div>
          <span className="text-slate-500 text-[10px]">{reports.length} reports imported</span>
          <span className="text-slate-700 mx-2">·</span>
          <span className="text-slate-500 text-[10px]">{openFindings.length} open findings</span>
          {totalCritical > 0 && <><span className="text-slate-700 mx-2">·</span><span className="text-red-400 text-[10px] font-semibold">{totalCritical} critical</span></>}
        </div>
        <div className="flex gap-2 ml-auto">
          {(['critical', 'high', 'medium', 'low'] as Severity[]).map(s => bySev[s] > 0 && (
            <span key={s} className="text-[9px] font-bold px-2 py-0.5 rounded"
              style={{ background: `${SEV_COLORS[s]}20`, color: SEV_COLORS[s] }}>
              {bySev[s]} {s.slice(0, 4)}
            </span>
          ))}
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-white/[0.04] overflow-x-auto">
        {reports.map((r, i) => (
          <button
            key={r.id}
            onClick={() => setActiveTab(i)}
            className={`px-3 py-1.5 rounded text-[10px] font-medium whitespace-nowrap transition-all ${activeTab === i ? 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
          >
            {r.scanName}
          </button>
        ))}
      </div>

      {/* Active Tab Content */}
      {reports[activeTab] && <VAReportTab report={reports[activeTab]} />}
    </div>
  )
}

export function VulnManagement({ lastUpdated }: { lastUpdated?: number }) {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 850); return () => clearTimeout(t) }, [])

  const filtered = useFilteredVulnerabilities()
  const { filter, toggleSeverity } = useFilter()
  const { openDrillDown } = useDrillDown()
  const { label: freshnessLabel } = useDataFreshness(lastUpdated)

  // All useMemo calls must be before any early return (Rules of Hooks)
  const matrixData = useMemo(() => {
    const tiers: AssetTier[] = ['T0', 'T1', 'T2', 'T3']
    return tiers.map(tier => {
      const row: Record<string, string | number> = { tier: TIER_LABELS[tier] }
      const sev: Severity[] = ['critical', 'high', 'medium', 'low']
      sev.forEach(s => { row[s] = vulnerabilities.filter(v => v.assetTier === tier && v.effectivePriority === s).length })
      return row
    })
  }, [])

  const summary = useMemo(() => ({
    critical: filtered.filter(v => v.effectivePriority === 'critical').length,
    high: filtered.filter(v => v.effectivePriority === 'high').length,
    slaBreached: filtered.filter(v => v.slaBreached).length,
    exploitable: filtered.filter(v => v.exploitAvailable).length,
  }), [filtered])

  if (!loaded) return <SectionSkeleton accent="#8b5cf6" cols={3} hasTopRow />

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-6 rounded-full bg-amber-500" />
        <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">C — Vulnerability & Exposure Management</h2>
        <div className="flex-1 h-px bg-white/5" />
        <FreshnessBadge label={freshnessLabel} />
      </div>

      {/* CVE Heatmap — above the existing charts */}
      <div className="mb-4">
        <VulnHeatmap />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        {/* Risk Matrix: stacked bar */}
        <div className="glass-card rounded-xl p-5 flex flex-col xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Risk-Based Vulnerability Priority Matrix</p>
            <p className="text-[10px] text-slate-600">Click bars to filter table below</p>
          </div>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={matrixData} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                <XAxis dataKey="tier" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0d1324', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }} labelStyle={{ color: '#94a3b8' }} />
                <Bar dataKey="critical" stackId="a" fill="#ef4444" fillOpacity={0.85} name="Critical (Eff.)" radius={[0, 0, 0, 0]} onClick={() => toggleSeverity('critical')} style={{ cursor: 'pointer' }} />
                <Bar dataKey="high" stackId="a" fill="#f59e0b" fillOpacity={0.85} name="High (Eff.)" onClick={() => toggleSeverity('high')} style={{ cursor: 'pointer' }} />
                <Bar dataKey="medium" stackId="a" fill="#3b82f6" fillOpacity={0.85} name="Medium (Eff.)" onClick={() => toggleSeverity('medium')} style={{ cursor: 'pointer' }} />
                <Bar dataKey="low" stackId="a" fill="#10b981" fillOpacity={0.85} name="Low (Eff.)" radius={[4, 4, 0, 0]} onClick={() => toggleSeverity('low')} style={{ cursor: 'pointer' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-3 mt-3 pt-3 border-t border-white/5">
            {(['critical', 'high', 'medium', 'low'] as Severity[]).map(s => {
              const cnt = vulnerabilities.filter(v => v.effectivePriority === s).length
              return (
                <button key={s} onClick={() => {
                  toggleSeverity(s)
                  if (s === 'critical') openDrillDown({ type: 'metric', id: 'vuln_critical', label: `${cnt} Critical Vulnerabilities` })
                }}
                  className={`flex-1 rounded-lg py-2 text-center transition-all ${filter.severity === s ? 'ring-1' : 'hover:bg-white/5'}`}
                  style={{ background: filter.severity === s ? `${SEV_COLORS[s]}15` : undefined, borderColor: `${SEV_COLORS[s]}60` }}>
                  <p className="text-[8px] font-bold uppercase tracking-wider mb-0.5" style={{ color: SEV_COLORS[s] }}>{s}</p>
                  <p className="text-slate-200 text-sm font-bold tabular-nums">
                    {cnt.toLocaleString()}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* SLA Breach Tracker */}
        <div className="glass-card rounded-xl p-5 flex flex-col">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">SLA Breach Tracker</p>
          <p className="text-slate-600 text-[10px] mb-4">Avg CVE age vs 14-day P0 SLA (30-day rolling)</p>
          <div className="flex-1 min-h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={SLA_TREND} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 8 }} axisLine={false} tickLine={false} tickCount={6} label={{ value: 'Days ago', fill: '#475569', fontSize: 8, position: 'insideBottomRight', offset: 0 }} />
                <YAxis tick={{ fill: '#475569', fontSize: 8 }} axisLine={false} tickLine={false} unit="d" />
                <Tooltip contentStyle={{ background: '#0d1324', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 10 }} formatter={(v) => [`${v} days`, 'Avg Age']} />
                <ReferenceLine y={14} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.6} label={{ value: 'P0 SLA: 14d', fill: '#ef4444', fontSize: 8, position: 'insideTopRight' }} />
                <ReferenceLine y={30} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.4} label={{ value: 'P1 SLA: 30d', fill: '#f59e0b', fontSize: 8, position: 'insideTopRight' }} />
                <Line type="monotone" dataKey="avgAge" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#6366f1' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/5">
            <div className="text-center cursor-pointer hover:bg-white/[0.04] rounded-lg p-1 transition-colors"
              onClick={() => openDrillDown({ type: 'metric', id: 'vuln_sla_breach', label: `${summary.slaBreached} SLA Breached Vulnerabilities` })}>
              <p className="text-red-400 text-xl font-bold tabular-nums">{summary.slaBreached.toLocaleString()}</p>
              <p className="text-slate-600 text-[9px] uppercase tracking-wider">SLA Breached</p>
            </div>
            <div className="text-center cursor-pointer hover:bg-white/[0.04] rounded-lg p-1 transition-colors"
              onClick={() => openDrillDown({ type: 'metric', id: 'vuln_exploitable', label: `${summary.exploitable} Exploitable Vulnerabilities` })}>
              <p className="text-amber-400 text-xl font-bold tabular-nums">{summary.exploitable.toLocaleString()}</p>
              <p className="text-slate-600 text-[9px] uppercase tracking-wider">Exploitable</p>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Inventory Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
          <ShieldAlert size={13} className="text-slate-500" />
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Vulnerability Detail — Asset Inventory</p>
          <span className="ml-auto text-[9px] text-slate-600">Filtered: {filtered.length.toLocaleString()} CVEs</span>
        </div>
        <SecurityDataTable mode="vulnerabilities" />
      </div>

      {/* VA Report Findings Panel */}
      <VAReportFindingsPanel />
    </section>
  )
}
