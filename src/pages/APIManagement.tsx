import { AlertTriangle } from 'lucide-react'
import { integrations, apiKeys, webhooks } from '../data/integrationsMockData'
import type { IntegrationStatus } from '../data/integrationsMockData'

const STATUS_STYLES: Record<IntegrationStatus, { color: string; bg: string }> = {
  connected: { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  degraded: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  disconnected: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  syncing: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
}

const CAT_COLORS: Record<string, string> = {
  SIEM: '#6366f1',
  VULN_SCANNER: '#f59e0b',
  EDR: '#ef4444',
  APPSEC: '#10b981',
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

function rotationColor(days: number): string {
  if (days <= 30) return '#ef4444'
  if (days <= 90) return '#f59e0b'
  return '#10b981'
}

// Fake API quota data per integration
const QUOTA_MAP: Record<string, { used: number; total: number }> = {
  'int-1': { used: 4821, total: 50000 },
  'int-2': { used: 12300, total: 50000 },
  'int-3': { used: 890, total: 10000 },
  'int-4': { used: 3400, total: 20000 },
  'int-5': { used: 22100, total: 100000 },
  'int-6': { used: 1200, total: 20000 },
  'int-7': { used: 540, total: 5000 },
  'int-8': { used: 120, total: 5000 },
}

export default function APIManagement() {
  return (
    <div className="min-h-screen" style={{ background: '#0a0f1e' }}>
      {/* Page header */}
      <div className="sticky top-0 z-40 border-b border-white/[0.06] px-6 py-3 flex items-center gap-3" style={{ background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(20px)' }}>
        <span className="text-slate-600 text-xs">Dashboard</span>
        <span className="text-slate-700 text-xs">/</span>
        <span className="text-slate-300 text-xs font-semibold">API Management</span>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

        {/* Section 1: Integration Status Dashboard */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.05]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Integration Status Dashboard</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 p-5">
            {integrations.map(int => {
              const st = STATUS_STYLES[int.status]
              const catColor = CAT_COLORS[int.category] ?? '#6366f1'
              const quota = QUOTA_MAP[int.id] ?? { used: 0, total: 1 }
              const quotaPct = (quota.used / quota.total) * 100

              return (
                <div key={int.id} className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-slate-200 text-xs font-semibold leading-tight">{int.name}</p>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block"
                        style={{ background: `${catColor}15`, color: catColor, border: `1px solid ${catColor}25` }}>
                        {int.category.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: st.color }} />
                      <span className="text-[10px] font-medium" style={{ color: st.color }}>{int.status}</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500">Last sync: {relativeTime(int.lastSync)}</div>

                  {/* Error rate bar */}
                  <div>
                    <div className="flex justify-between text-[9px] mb-1">
                      <span className="text-slate-600">Error Rate</span>
                      <span className={int.errorRate > 2 ? 'text-red-400' : int.errorRate > 1 ? 'text-amber-400' : 'text-emerald-400'}>{int.errorRate}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, int.errorRate * 10)}%`, background: int.errorRate > 2 ? '#ef4444' : int.errorRate > 1 ? '#f59e0b' : '#10b981' }} />
                    </div>
                  </div>

                  {/* Quota bar */}
                  <div>
                    <div className="flex justify-between text-[9px] mb-1">
                      <span className="text-slate-600">API Quota</span>
                      <span className="text-slate-500">{quota.used.toLocaleString()} / {quota.total.toLocaleString()}</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full bg-indigo-500/60 transition-all" style={{ width: `${Math.min(100, quotaPct)}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Section 2: API Key Registry */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.05] flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">API Key Registry</p>
            <span className="text-slate-600 text-[10px]">{apiKeys.length} keys</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {['Integration', 'Label', 'Key', 'Created', 'Expires', 'Rotation Due', 'Scopes', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-slate-600 font-medium text-[10px] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((key, i) => {
                  const rc = rotationColor(key.rotationDueDays)
                  const urgentRotation = key.rotationDueDays <= 30
                  return (
                    <tr key={key.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors" style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <td className="px-4 py-3">
                        <p className="text-slate-300 font-medium whitespace-nowrap">{key.integrationName}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{key.label}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[10px] text-slate-400">{key.prefix}••••••••••••••••</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[10px] whitespace-nowrap">{key.createdAt}</td>
                      <td className="px-4 py-3 text-slate-500 text-[10px] whitespace-nowrap">{key.expiresAt}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {urgentRotation && <AlertTriangle size={12} style={{ color: rc }} />}
                          <span className="font-semibold text-[10px]" style={{ color: rc }}>{key.rotationDueDays}d</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {key.scopes.map(sc => (
                            <span key={sc} className="text-[9px] px-1.5 py-0.5 rounded font-mono text-slate-500"
                              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                              {sc}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button className="px-3 py-1 text-[10px] font-semibold rounded text-amber-400 hover:bg-amber-500/10 transition-colors border border-amber-500/20 whitespace-nowrap">
                          Rotate Key
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Webhook Configuration */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.05] flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Webhook Configuration</p>
            <span className="text-slate-600 text-[10px]">{webhooks.length} webhooks</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {['Name / Source', 'Endpoint', 'Secret', 'Events', 'Active', 'Last Received', 'Total', 'Fail %', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-slate-600 font-medium text-[10px] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {webhooks.map((wh, i) => (
                  <tr key={wh.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors" style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td className="px-4 py-3">
                      <p className="text-slate-200 font-medium whitespace-nowrap">{wh.name}</p>
                      <p className="text-slate-600 text-[10px]">{wh.source}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-[10px]">{wh.endpoint}</td>
                    <td className="px-4 py-3 font-mono text-slate-600 text-[10px]">{wh.secret}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {wh.events.map(ev => (
                          <span key={ev} className="text-[9px] px-1.5 py-0.5 rounded text-slate-500"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            {ev}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {/* Visual toggle - cosmetic */}
                      <div
                        className="relative w-8 h-4 rounded-full transition-colors cursor-pointer"
                        style={{ background: wh.active ? '#6366f1' : 'rgba(255,255,255,0.1)' }}
                      >
                        <div
                          className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
                          style={{ left: wh.active ? '18px' : '2px' }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[10px] whitespace-nowrap">{relativeTime(wh.lastReceived)}</td>
                    <td className="px-4 py-3 text-slate-400 tabular-nums">{wh.totalReceived.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold text-[10px] ${wh.failureRate > 2 ? 'text-red-400' : 'text-slate-500'}`}>{wh.failureRate}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button className="px-2 py-1 text-[10px] rounded text-indigo-400 hover:bg-indigo-500/10 transition-colors border border-indigo-500/20">Edit</button>
                        <button className="px-2 py-1 text-[10px] rounded text-red-400/70 hover:bg-red-500/10 transition-colors border border-red-500/20">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
