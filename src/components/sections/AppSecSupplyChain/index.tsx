import { useMemo, useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts'
import { Package, AlertTriangle, ShieldCheck, Bug, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useDataFreshness } from '../../../hooks/useDataFreshness'
import FreshnessBadge from '../../ui/FreshnessBadge'
import { SectionSkeleton } from '../../ui/SectionSkeleton'
import { SeverityBadge } from '../../atomic/SeverityBadge'
import { MetricCard } from '../../atomic/MetricCard'
import { dependencyAlerts, vendorRisks, bugBountyReports } from '../../../data/mockData'
import type { Severity } from '../../../types/security'

const SEV_COLORS: Record<Severity, string> = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#10b981' }

const STATUS_COLORS: Record<string, string> = {
  triaging: '#f59e0b',
  accepted: '#6366f1',
  in_progress: '#3b82f6',
  resolved: '#10b981',
}

// SBOM coverage data — % of repos with verified SBOMs
const SBOM_REPOS = [
  { name: 'core-banking-api',  hasSbom: true,  components: 312, verified: 291 },
  { name: 'payment-service',   hasSbom: true,  components: 187, verified: 172 },
  { name: 'auth-service',      hasSbom: true,  components: 143, verified: 143 },
  { name: 'mobile-backend',    hasSbom: false, components: 224, verified: 0   },
  { name: 'reporting-svc',     hasSbom: false, components: 98,  verified: 0   },
  { name: 'risk-engine',       hasSbom: true,  components: 265, verified: 248 },
]

const SBOM_COVERAGE_PCT = Math.round(SBOM_REPOS.filter(r => r.hasSbom).length / SBOM_REPOS.length * 100)

// Vendor remediation tracking
const VENDOR_REMEDIATION = [
  { vendor: 'Core Banking SaaS', finding: 'Unencrypted API key storage', severity: 'critical', due: '2026-04-30', status: 'overdue'     },
  { vendor: 'Payment Gateway',   finding: 'TLS 1.1 still enabled',       severity: 'high',     due: '2026-05-15', status: 'overdue'     },
  { vendor: 'Cloud HSM Vendor',  finding: 'Firmware outdated (2 versions)', severity: 'high',  due: '2026-06-01', status: 'in_progress' },
  { vendor: 'KYC Provider',      finding: 'Missing WAF on admin portal',  severity: 'medium',   due: '2026-06-15', status: 'in_progress' },
  { vendor: 'SMS OTP Gateway',   finding: 'Rate limiting absent',         severity: 'medium',   due: '2026-07-01', status: 'pending'     },
  { vendor: 'Fraud Detection AI',finding: 'Model drift detected',         severity: 'low',      due: '2026-07-15', status: 'pending'     },
]

export function AppSecSupplyChain({ lastUpdated }: { lastUpdated?: number }) {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 600); return () => clearTimeout(t) }, [])

  const { label: freshnessLabel } = useDataFreshness(lastUpdated)
  const depBySev = useMemo(() => {
    const sev: Severity[] = ['critical', 'high', 'medium', 'low']
    return sev.map(s => ({ name: s, value: dependencyAlerts.filter(d => d.severity === s).length, color: SEV_COLORS[s] }))
  }, [])

  const vendorCritical = vendorRisks.filter(v => v.tier === 'critical')
  const openBounties = bugBountyReports.filter(b => b.status !== 'resolved')
  const critBounties = bugBountyReports.filter(b => b.severity === 'critical' && b.status !== 'resolved')

  if (!loaded) return <SectionSkeleton accent="#10b981" cols={3} hasTopRow />

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-6 rounded-full bg-emerald-500" />
        <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">D — Application Security & Supply Chain</h2>
        <div className="flex-1 h-px bg-white/5" />
        <FreshnessBadge label={freshnessLabel} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mb-4">
        <MetricCard title="Open Dep. Alerts" value={dependencyAlerts.length} icon={<Package size={14} />} accentColor="#f59e0b"
          subtitle={`${dependencyAlerts.filter(d => d.severity === 'critical').length} critical · ${dependencyAlerts.filter(d => d.fixAvailable).length} fixable`} />
        <MetricCard title="Malicious Pkg Blocks" value="3" icon={<AlertTriangle size={14} />} accentColor="#ef4444"
          subtitle="Blocked in last 30 days via registry scan" />
        <MetricCard title="Open Bug Bounty" value={openBounties.length} icon={<Bug size={14} />} accentColor="#6366f1"
          subtitle={`${critBounties.length} critical unresolved`} />
        <MetricCard title="Vendor Risk Avg" value={`${Math.round(vendorRisks.reduce((a, b) => a + b.riskScore, 0) / vendorRisks.length)}/100`} icon={<ShieldCheck size={14} />} accentColor="#8b5cf6"
          subtitle={`${vendorCritical.length} critical-tier vendors`} />
      </div>

      {/* SBOM Coverage + Vendor Remediation row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
        {/* SBOM Coverage Gauge */}
        <div className="glass-card rounded-xl p-5 flex flex-col">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">SBOM Coverage by Repository</p>
          <div className="flex items-center gap-6">
            {/* Radial gauge */}
            <div className="relative w-[110px] h-[110px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="60%" outerRadius="100%" data={[{ value: SBOM_COVERAGE_PCT, fill: SBOM_COVERAGE_PCT >= 80 ? '#10b981' : SBOM_COVERAGE_PCT >= 50 ? '#f59e0b' : '#ef4444' }]} startAngle={180} endAngle={0}>
                  <RadialBar dataKey="value" cornerRadius={4} background={{ fill: 'rgba(255,255,255,0.04)' }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingTop: 24 }}>
                <span className="text-2xl font-bold tabular-nums" style={{ color: SBOM_COVERAGE_PCT >= 80 ? '#10b981' : SBOM_COVERAGE_PCT >= 50 ? '#f59e0b' : '#ef4444' }}>{SBOM_COVERAGE_PCT}%</span>
                <span className="text-[9px] text-slate-600 mt-0.5">covered</span>
              </div>
            </div>
            {/* Repo list */}
            <div className="flex-1 space-y-2">
              {SBOM_REPOS.map(r => (
                <div key={r.name} className="flex items-center gap-2">
                  {r.hasSbom
                    ? <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0" />
                    : <XCircle size={11} className="text-red-500 flex-shrink-0" />
                  }
                  <span className="text-[10px] font-mono text-slate-400 flex-1 truncate">{r.name}</span>
                  {r.hasSbom
                    ? <span className="text-[9px] text-emerald-600 tabular-nums">{r.verified}/{r.components}</span>
                    : <span className="text-[9px] text-red-600">No SBOM</span>
                  }
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex gap-4 text-[9px] text-slate-600">
            <span>{SBOM_REPOS.filter(r => r.hasSbom).length}/{SBOM_REPOS.length} repos with verified SBOM</span>
            <span className="ml-auto">Format: CycloneDX 1.5 + SPDX 2.3</span>
          </div>
        </div>

        {/* Vendor Remediation Tracker */}
        <div className="glass-card rounded-xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <Clock size={13} className="text-slate-500" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Vendor Remediation Tracker</p>
            <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
              {VENDOR_REMEDIATION.filter(v => v.status === 'overdue').length} Overdue
            </span>
          </div>
          <div className="flex-1 divide-y divide-white/[0.03] overflow-auto">
            {VENDOR_REMEDIATION.map((v, i) => {
              const statusIcon = v.status === 'overdue'
                ? <XCircle size={11} className="text-red-500 flex-shrink-0" />
                : v.status === 'in_progress'
                  ? <Clock size={11} className="text-amber-500 flex-shrink-0" />
                  : <CheckCircle2 size={11} className="text-slate-600 flex-shrink-0" />
              const sevColor = v.severity === 'critical' ? '#ef4444' : v.severity === 'high' ? '#f59e0b' : v.severity === 'medium' ? '#3b82f6' : '#10b981'
              return (
                <div key={i} className="px-4 py-2.5 flex items-start gap-3 hover:bg-white/[0.02] transition-colors">
                  {statusIcon}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-slate-400 text-[10px] font-medium truncate">{v.vendor}</p>
                      <span className="text-[8px] font-bold px-1 py-0.5 rounded flex-shrink-0 capitalize" style={{ background: `${sevColor}20`, color: sevColor }}>{v.severity}</span>
                    </div>
                    <p className="text-slate-500 text-[9px] truncate">{v.finding}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-[9px] font-semibold ${v.status === 'overdue' ? 'text-red-400' : 'text-slate-500'}`}>{v.due}</p>
                    <p className="text-[8px] text-slate-700 capitalize">{v.status.replace('_', ' ')}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Dependency Alert Breakdown */}
        <div className="glass-card rounded-xl p-5 flex flex-col">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-4">Software Supply Chain Health</p>
          <div className="flex items-center gap-4 flex-1">
            <div className="w-[120px] h-[120px] flex-shrink-0 flex items-center justify-center">
              {depBySev.every(d => d.value === 0) ? (
                <div className="flex flex-col items-center gap-2 text-slate-600">
                  <Package size={28} />
                  <p className="text-[9px] text-center">No alerts</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={depBySev} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={2}>
                      {depBySev.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0d1324', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex-1">
              {depBySev.map(d => (
                <div key={d.name} className="flex items-center justify-between mb-2">
                  <span className="text-xs capitalize" style={{ color: d.color }}>{d.name}</span>
                  <span className="text-slate-300 text-xs font-semibold tabular-nums">{d.value}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-white/5 mt-1">
                <p className="text-[9px] text-slate-600 uppercase tracking-wider">Sources</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-[9px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">Dependabot</span>
                  <span className="text-[9px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">Snyk</span>
                  <span className="text-[9px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">OSV</span>
                </div>
              </div>
            </div>
          </div>
          {/* Top repos */}
          <div className="mt-4 pt-3 border-t border-white/5">
            <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">Top Affected Repos</p>
            {['core-banking-api', 'payment-service', 'auth-service', 'mobile-backend'].map(repo => {
              const count = dependencyAlerts.filter(d => d.repo === repo).length
              const critCount = dependencyAlerts.filter(d => d.repo === repo && d.severity === 'critical').length
              return (
                <div key={repo} className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-400 text-[10px] font-mono truncate">{repo}</span>
                  <div className="flex items-center gap-2">
                    {critCount > 0 && <span className="text-red-400 text-[9px] font-bold">{critCount} crit</span>}
                    <span className="text-slate-500 text-[9px]">{count} total</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Vendor Risk Scores */}
        <div className="glass-card rounded-xl p-5 flex flex-col">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-4">Third-Party Vendor Risk Register</p>
          <div className="flex-1 space-y-3 overflow-auto">
            {vendorRisks.map(v => (
              <div key={v.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-slate-300 text-xs font-medium truncate">{v.name}</p>
                    <span className={`text-[8px] font-bold px-1 py-0.5 rounded flex-shrink-0 ${
                      v.tier === 'critical' ? 'bg-red-950/60 text-red-400' :
                      v.tier === 'important' ? 'bg-amber-950/60 text-amber-400' :
                      'bg-slate-800/60 text-slate-400'
                    }`}>{v.tier.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white/5 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${v.riskScore}%`,
                          background: v.riskScore >= 60 ? '#ef4444' : v.riskScore >= 40 ? '#f59e0b' : '#10b981',
                        }} />
                    </div>
                    <span className={`text-[10px] font-bold tabular-nums flex-shrink-0 ${v.riskScore >= 60 ? 'text-red-400' : v.riskScore >= 40 ? 'text-amber-400' : 'text-emerald-400'}`}>{v.riskScore}</span>
                  </div>
                  <p className="text-slate-600 text-[9px] mt-0.5">{v.category} · {v.findings} finding{v.findings !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bug Bounty Tracker */}
        <div className="glass-card rounded-xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <Bug size={13} className="text-slate-500" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Bug Bounty & Arch Review Pipeline</p>
          </div>
          <div className="flex-1 overflow-auto divide-y divide-white/[0.03]">
            {bugBountyReports.map(b => (
              <div key={b.id} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-slate-300 text-xs font-medium leading-tight flex-1">{b.title}</p>
                  <SeverityBadge severity={b.severity} size="xs" />
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span style={{ color: STATUS_COLORS[b.status] }} className="font-medium capitalize">{b.status.replace('_', ' ')}</span>
                  <span className="text-slate-600">{b.platform}</span>
                  {b.bounty && <span className="text-emerald-500 font-semibold ml-auto">${b.bounty.toLocaleString()}</span>}
                </div>
                <p className="text-slate-600 text-[9px] mt-0.5">{b.id} · {b.submittedAt}</p>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-white/5 bg-white/[0.01]">
            <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">Pending Arch Reviews</p>
            <div className="space-y-1.5">
              {['Zero-Trust migration — Q2 2026', 'Payment API v3 redesign review', 'HSM key rotation procedure'].map(r => (
                <div key={r} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/60 flex-shrink-0" />
                  <p className="text-slate-400 text-[10px]">{r}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
