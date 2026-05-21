import { useMemo, Fragment, useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
  ComposedChart, Bar,
} from 'recharts'
import { Shield, AlertTriangle, DollarSign } from 'lucide-react'
import { RiskGauge } from '../../atomic/RiskGauge'
import { MetricCard } from '../../atomic/MetricCard'
import { TrendBadge } from '../../atomic/TrendBadge'
import { useSecurityMetrics } from '../../../hooks/useSecurityMetrics'
import { useDrillDown } from '../../../context/DrillDownContext'
import { complianceControls } from '../../../data/mockData'
import { useDataFreshness } from '../../../hooks/useDataFreshness'
import FreshnessBadge from '../../ui/FreshnessBadge'
import { SectionSkeleton } from '../../ui/SectionSkeleton'

const MONTHS = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May']
const ALE_TREND = [5.8, 5.2, 5.6, 4.9, 6.1, 5.8, 5.1, 4.8, 4.5, 4.3, 4.4, 4.2].map((v, i) => ({ month: MONTHS[i], aleM: v }))

// Sparkline data — 7 days, last day is today (descending index = older)
const OPEN_VULNS_SPARKLINE = [11420, 11380, 11510, 11440, 11600, 11590, 11647]
const SLA_BREACHES_SPARKLINE = [890, 920, 910, 880, 940, 930, 908]

const radarData = [
  { domain: 'Govern/Security',  NIST_CSF: 72, SOC2: 79, PCI_DSS: 82, ISO_27001: 85 },
  { domain: 'Identify/Avail.',  NIST_CSF: 81, SOC2: 88, PCI_DSS: 91, ISO_27001: 78 },
  { domain: 'Protect/Confid.',  NIST_CSF: 68, SOC2: 71, PCI_DSS: 64, ISO_27001: 81 },
  { domain: 'Detect/Integrity', NIST_CSF: 74, SOC2: 83, PCI_DSS: 70, ISO_27001: 74 },
  { domain: 'Respond/Privacy',  NIST_CSF: 61, SOC2: 66, PCI_DSS: 77, ISO_27001: 72 },
  { domain: 'Recover/Policy',   NIST_CSF: 55, SOC2: null, PCI_DSS: 85, ISO_27001: 70 },
]

const frameworkColors: Record<string, string> = { NIST_CSF: '#6366f1', SOC2: '#3b82f6', PCI_DSS: '#8b5cf6', ISO_27001: '#f59e0b' }

// Monte Carlo FAIR loss distribution — 10,000 simulated scenarios (seeded summary)
const MC_DIST = [
  { range: '$0–1M',   count: 820,  pct: 8.2  },
  { range: '$1–2M',   count: 1540, pct: 15.4 },
  { range: '$2–3M',   count: 2180, pct: 21.8 },
  { range: '$3–5M',   count: 2650, pct: 26.5 },
  { range: '$5–8M',   count: 1760, pct: 17.6 },
  { range: '$8–12M',  count: 680,  pct: 6.8  },
  { range: '$12–20M', count: 320,  pct: 3.2  },
  { range: '>$20M',   count: 50,   pct: 0.5  },
]

const MC_PERCENTILES = [
  { label: 'P10', value: 1.2,  color: '#10b981' },
  { label: 'P25', value: 2.1,  color: '#3b82f6' },
  { label: 'P50', value: 4.2,  color: '#f59e0b' },
  { label: 'P75', value: 7.8,  color: '#f97316' },
  { label: 'P90', value: 12.8, color: '#ef4444' },
]

// Maturity heatmap data (NIST CSF × 5 maturity levels)
const NIST_FUNCTIONS = ['Govern', 'Identify', 'Protect', 'Detect', 'Respond', 'Recover']
const MATURITY_LABELS = ['Initial', 'Developing', 'Defined', 'Managed', 'Optimizing']
const NIST_MATURITY: Record<string, { maturity: number; score: number }> = {
  Govern:   { maturity: 3, score: 72 },
  Identify: { maturity: 3, score: 81 },
  Protect:  { maturity: 2, score: 68 },
  Detect:   { maturity: 3, score: 74 },
  Respond:  { maturity: 2, score: 61 },
  Recover:  { maturity: 2, score: 55 },
}

export function ExecutiveScorecard({ lastUpdated }: { lastUpdated?: number }) {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 500); return () => clearTimeout(t) }, [])

  const m = useSecurityMetrics()
  const { openDrillDown } = useDrillDown()
  const { label: freshnessLabel } = useDataFreshness(lastUpdated)
  // Must be before any early return — Rules of Hooks
  const _rd = useMemo(() => radarData, [])

  if (!loaded) return <SectionSkeleton accent="#6366f1" cols={3} />

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-6 rounded-full bg-indigo-500" />
        <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">A — Executive Risk & Compliance Scorecard</h2>
        <div className="flex-1 h-px bg-white/5" />
        <FreshnessBadge label={freshnessLabel} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Col 1 — Posture + KPIs */}
        <div className="glass-card rounded-xl p-5 flex flex-col items-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">Security Posture Score</p>
          <div className="cursor-pointer" onClick={() => openDrillDown({ type: 'metric', id: 'posture_score', label: `Security Posture Score: ${m.postureScore}/100` })}>
            <RiskGauge score={m.postureScore} size={180} />
          </div>
          <p className="text-slate-500 text-xs mt-1 mb-4 text-center">Composite: Compliance + SLA adherence + CVE exposure</p>
          <div className="grid grid-cols-1 gap-2 w-full mt-auto">
            <MetricCard
              title="Open Vulnerabilities"
              value={m.openVulnerabilities.toLocaleString()}
              icon={<AlertTriangle size={14} />}
              accentColor="#f59e0b"
              subtitle={`${m.vulnBySeverity.critical} critical · ${m.vulnBySeverity.high} high`}
              sparklineData={OPEN_VULNS_SPARKLINE}
            />
            <MetricCard
              title="SLA Breaches"
              value={m.slaBreachCount.toLocaleString()}
              icon={<Shield size={14} />}
              accentColor="#ef4444"
              subtitle="Vulnerabilities past remediation SLA"
              sparklineData={SLA_BREACHES_SPARKLINE}
            />
            <MetricCard
              title="Critical Assets"
              value={m.criticalAssets.toLocaleString()}
              icon={<Shield size={14} />}
              accentColor="#6366f1"
              subtitle="Tier 0 + Tier 1 combined"
            />
          </div>
        </div>

        {/* Col 2 — FAIR Financial Risk */}
        <div className="glass-card rounded-xl p-5 flex flex-col">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-4">FAIR Financial Risk Exposure (ALE)</p>
          <div className="flex items-start justify-between mb-1">
            <div>
              <div className="flex items-baseline gap-2">
                <DollarSign size={16} className="text-amber-400 mt-0.5" />
                <span className="text-3xl font-bold text-slate-100 tabular-nums">$4.2M</span>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">≈ NPR 556.8 Cr</p>
            </div>
            <div className="text-right">
              <TrendBadge value={m.aleeTrend} invertColors={true} />
              <p className="text-slate-600 text-[10px] mt-1">Annualized Loss Expectancy</p>
            </div>
          </div>

          {/* Monte Carlo FAIR loss distribution */}
          <div className="my-3 py-2 border-y border-white/5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] text-slate-600 uppercase tracking-wider">Monte Carlo Distribution (10K sims)</p>
              <div className="flex gap-2">
                {MC_PERCENTILES.filter(p => ['P10', 'P50', 'P90'].includes(p.label)).map(p => (
                  <span key={p.label} className="text-[9px] font-semibold tabular-nums" style={{ color: p.color }}>{p.label} ${p.value}M</span>
                ))}
              </div>
            </div>
            <div className="h-[88px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={MC_DIST} margin={{ top: 10, right: 4, bottom: 0, left: -20 }}>
                  <XAxis dataKey="range" tick={{ fill: '#475569', fontSize: 7 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 7 }} axisLine={false} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{ background: '#0d1324', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 10 }}
                    labelStyle={{ color: '#94a3b8' }}
                    formatter={(v: unknown) => [`${v}%`, 'Probability']}
                  />
                  <Bar dataKey="pct" fill="#f59e0b" fillOpacity={0.75} radius={[2, 2, 0, 0]} />
                  <ReferenceLine x="$1–2M" stroke="#10b981" strokeDasharray="3 2" strokeOpacity={0.9} label={{ value: 'P10', fill: '#10b981', fontSize: 7, position: 'insideTopRight' }} />
                  <ReferenceLine x="$3–5M" stroke="#f59e0b" strokeDasharray="3 2" strokeOpacity={0.9} label={{ value: 'P50', fill: '#f59e0b', fontSize: 7, position: 'insideTopRight' }} />
                  <ReferenceLine x="$8–12M" stroke="#ef4444" strokeDasharray="3 2" strokeOpacity={0.9} label={{ value: 'P90', fill: '#ef4444', fontSize: 7, position: 'insideTopRight' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">12-Month ALE Trend (USD M)</p>
          <div className="flex-1 min-h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ALE_TREND} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="aleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} domain={[3, 7]} />
                <Tooltip
                  contentStyle={{ background: '#0d1324', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }}
                  itemStyle={{ color: '#f59e0b' }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(v) => [`$${v}M`, 'ALE']}
                />
                <Area type="monotone" dataKey="aleM" stroke="#f59e0b" strokeWidth={2} fill="url(#aleGrad)" dot={false} activeDot={{ r: 3, fill: '#f59e0b' }} />
                <ReferenceLine y={4.2} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Col 3 — Compliance Radar */}
        <div className="glass-card rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Regulatory Compliance Drift</p>
            <div className="flex gap-2">
              {Object.entries(frameworkColors).map(([k, c]) => (
                <span key={k} className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${c}20`, color: c, border: `1px solid ${c}40` }}>
                  {k.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-[280px] cursor-pointer" onClick={() => {
            const ctrl = complianceControls[0]
            if (ctrl) openDrillDown({ type: 'compliance_control', id: 'cc-0', label: `${ctrl.framework} — ${ctrl.domain}`, sourceIntegration: ctrl.framework })
          }}>
            {complianceControls.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600">
                <Shield size={32} />
                <p className="text-xs text-center">No compliance data available.<br />Connect a compliance feed to populate this chart.</p>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={_rd} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}
                onClick={(data: unknown) => {
                  if (data) {
                    const idx = (_rd as typeof radarData).findIndex(r => r.domain === (data as { activeLabel?: string }).activeLabel)
                    if (idx >= 0) {
                      const ctrl = complianceControls[idx]
                      if (ctrl) openDrillDown({ type: 'compliance_control', id: `cc-${idx}`, label: `${ctrl.framework} — ${ctrl.domain}`, sourceIntegration: ctrl.framework })
                    }
                  }
                }}
              >
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="domain" tick={{ fill: '#64748b', fontSize: 9 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#475569', fontSize: 8 }} axisLine={false} tickCount={4} />
                <Tooltip
                  contentStyle={{ background: '#0d1324', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 10 }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Legend wrapperStyle={{ fontSize: 9, color: '#64748b' }} />
                <Radar name="NIST CSF"   dataKey="NIST_CSF"  stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} strokeWidth={1.5} />
                <Radar name="SOC 2"     dataKey="SOC2"      stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={1.5} />
                <Radar name="PCI DSS"   dataKey="PCI_DSS"   stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} strokeWidth={1.5} />
                <Radar name="ISO 27001" dataKey="ISO_27001" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.08} strokeWidth={1.5} dot={false} />
              </RadarChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Compliance Maturity Heatmap */}
      <div className="glass-card rounded-xl p-5 mt-4">
        <div className="flex items-center gap-3 mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">NIST CSF 2.0 Maturity Heatmap</p>
          <div className="flex-1 h-px bg-white/5" />
          <div className="flex gap-3">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80" /><span className="text-[9px] text-slate-500">Score ≥70</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-amber-500/80" /><span className="text-[9px] text-slate-500">50–69</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-red-500/80" /><span className="text-[9px] text-slate-500">&lt;50</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(255,255,255,0.08)' }} /><span className="text-[9px] text-slate-500">Achieved</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(255,255,255,0.025)' }} /><span className="text-[9px] text-slate-500">Pending</span></div>
          </div>
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: '90px repeat(5, 1fr)' }}>
          <div />
          {MATURITY_LABELS.map(l => (
            <div key={l} className="text-center pb-1">
              <p className="text-[8px] text-slate-600 uppercase tracking-wide">{l}</p>
            </div>
          ))}
          {NIST_FUNCTIONS.map(fn => {
            const d = NIST_MATURITY[fn]
            const activeColor = d.score >= 70 ? '#10b981' : d.score >= 50 ? '#f59e0b' : '#ef4444'
            return (
              <Fragment key={fn}>
                <div className="flex items-center">
                  <p className="text-[10px] text-slate-400 font-medium">{fn}</p>
                </div>
                {([1, 2, 3, 4, 5] as const).map(level => {
                  const isActive = d.maturity === level
                  const isPassed = d.maturity > level
                  return (
                    <div
                      key={level}
                      className="h-9 rounded flex items-center justify-center cursor-pointer transition-opacity hover:opacity-80"
                      style={{
                        background: isActive ? activeColor : isPassed ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.025)',
                        border: isActive ? `1px solid ${activeColor}` : '1px solid transparent',
                        opacity: isActive ? 1 : isPassed ? 0.65 : 0.4,
                      }}
                      onClick={() => openDrillDown({ type: 'metric', id: `nist_${fn.toLowerCase()}`, label: `${fn} — Maturity L${d.maturity} · Score ${d.score}/100` })}
                      title={`${fn} Level ${level}${isActive ? ` — Current (${d.score}/100)` : isPassed ? ' — Achieved' : ' — Not reached'}`}
                    >
                      {isActive && <span className="text-[10px] font-bold text-white tabular-nums">{d.score}</span>}
                      {isPassed && !isActive && <span className="text-[8px] text-slate-500">✓</span>}
                    </div>
                  )
                })}
              </Fragment>
            )
          })}
        </div>
      </div>
    </section>
  )
}
