import { useState } from 'react'
import { X, ChevronRight, ExternalLink, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react'
import { useDrillDown } from '../../context/DrillDownContext'
import type { DrillDownTarget } from '../../types/drillDown'
import { vulnerabilities, incidents, assets, complianceControls } from '../../data/mockData'
import { siemOffenses } from '../../data/siemOffenseData'

const SEV_BADGE: Record<string, { bg: string; color: string }> = {
  critical: { bg: 'rgba(239,68,68,0.2)', color: '#ef4444' },
  high: { bg: 'rgba(245,158,11,0.2)', color: '#f59e0b' },
  medium: { bg: 'rgba(59,130,246,0.2)', color: '#3b82f6' },
  low: { bg: 'rgba(16,185,129,0.2)', color: '#10b981' },
  info: { bg: 'rgba(100,116,139,0.2)', color: '#94a3b8' },
}

function SevBadge({ sev }: { sev: string }) {
  const s = SEV_BADGE[sev] ?? SEV_BADGE.info
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded capitalize"
      style={{ background: s.bg, color: s.color }}>{sev}</span>
  )
}

// Mini filterable table
function MiniTable({
  columns, rows, onRowClick, emptyMsg = 'No data',
}: {
  columns: string[]
  rows: (string | React.ReactNode)[][]
  onRowClick?: (i: number) => void
  emptyMsg?: string
}) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PER_PAGE = 10

  const filtered = rows.filter(r =>
    r.some(c => typeof c === 'string' && c.toLowerCase().includes(search.toLowerCase()))
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div>
      <input
        className="w-full px-3 py-1.5 rounded-lg text-xs text-slate-300 bg-white/5 border border-white/10 focus:outline-none focus:border-indigo-500/50 placeholder:text-slate-600 mb-2"
        placeholder="Search..."
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1) }}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
              {columns.map(c => (
                <th key={c} className="px-3 py-2 text-left text-[9px] text-slate-600 font-medium uppercase tracking-wider whitespace-nowrap">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-3 py-4 text-center text-slate-600 text-xs">{emptyMsg}</td></tr>
            ) : paged.map((row, i) => (
              <tr key={i}
                className={`border-t border-white/[0.03] transition-colors ${onRowClick ? 'cursor-pointer hover:bg-white/[0.04]' : ''}`}
                onClick={() => onRowClick?.(rows.indexOf(row))}
              >
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-slate-300 whitespace-nowrap">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-1.5 mt-1">
          <span className="text-[10px] text-slate-600">Page {page}/{totalPages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1 rounded text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-all">
              <ChevronLeft size={12} />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1 rounded text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-all">
              <ChevronRightIcon size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Detail views ──────────────────────────────────────────────────────────────

function VulnerabilityDetail({ target, onPush }: { target: DrillDownTarget; onPush: (t: DrillDownTarget) => void }) {
  const vuln = vulnerabilities.find(v => v.id === target.id) ?? vulnerabilities[0]
  if (!vuln) return <p className="text-slate-500 text-sm p-6">Vulnerability not found.</p>

  const asset = assets.find(a => a.id === vuln.assetId)

  return (
    <div className="p-5 space-y-5">
      <div>
        <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">CVE Identifier</p>
        <p className="text-2xl font-bold font-mono text-slate-100">{vuln.cveId}</p>
        <div className="flex items-center gap-2 mt-2">
          <SevBadge sev={vuln.severity} />
          <span className="text-slate-400 text-xs font-mono">CVSS {vuln.cvssScore.toFixed(1)}</span>
          {vuln.exploitAvailable && (
            <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>EXPLOIT AVAILABLE</span>
          )}
          {vuln.patchAvailable && (
            <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>PATCH READY</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Asset', value: vuln.assetName },
          { label: 'Tier', value: `${vuln.assetTier} — ${asset?.tierLabel ?? ''}` },
          { label: 'Days Open', value: String(vuln.daysOpen) },
          { label: 'SLA Status', value: vuln.slaBreached ? 'BREACHED' : 'OK', color: vuln.slaBreached ? '#ef4444' : '#10b981' },
          { label: 'Effective Priority', value: vuln.effectivePriority },
          { label: 'SLA Days', value: String(vuln.slaDays) },
        ].map(item => (
          <div key={item.label} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-0.5">{item.label}</p>
            <p className="text-sm font-semibold" style={{ color: item.color ?? '#e2e8f0' }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Description</p>
        <p className="text-slate-400 text-xs leading-relaxed">{vuln.description} This vulnerability allows potential system compromise if exploitation prerequisites are met. Remediation should follow the established SLA window based on severity tier.</p>
      </div>

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Affected Assets (Same CVE)</p>
        <MiniTable
          columns={['Asset Name', 'Tier', 'IP', 'Criticality']}
          rows={
            vulnerabilities.filter(v => v.cveId === vuln.cveId).slice(0, 20).map(v => {
              const a = assets.find(x => x.id === v.assetId)
              return [v.assetName, v.assetTier, a?.ip ?? '—', String(a?.criticality ?? '—')]
            })
          }
          onRowClick={(i) => {
            const related = vulnerabilities.filter(v => v.cveId === vuln.cveId)[i]
            if (related) onPush({ type: 'vulnerability', id: related.id, label: related.cveId, sourceIntegration: 'Mock VA' })
          }}
        />
      </div>
    </div>
  )
}

function IncidentDetail({ target, onPush }: { target: DrillDownTarget; onPush: (t: DrillDownTarget) => void }) {
  const inc = incidents.find(i => i.id === target.id) ?? incidents[0]
  if (!inc) return <p className="text-slate-500 text-sm p-6">Incident not found.</p>

  const PHASE_COLORS: Record<string, string> = { triage: '#ef4444', investigation: '#f59e0b', containment: '#6366f1', resolved: '#10b981' }
  const relatedVulns = vulnerabilities.filter(v => inc.affectedAssets.includes(v.assetId)).slice(0, 5)
  const relatedOffenses = siemOffenses.filter(o => o.severity === inc.severity).slice(0, 3)

  const fmtMins = (m: number) => m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`

  return (
    <div className="p-5 space-y-5">
      <div>
        <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Incident {inc.id}</p>
        <p className="text-lg font-bold text-slate-100 leading-tight">{inc.title}</p>
        <div className="flex items-center gap-2 mt-2">
          <SevBadge sev={inc.severity} />
          <span className="text-[9px] px-2 py-0.5 rounded font-bold capitalize" style={{ background: `${PHASE_COLORS[inc.phase]}20`, color: PHASE_COLORS[inc.phase] }}>{inc.phase}</span>
          <span className="text-slate-500 text-[10px]">{inc.source}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'MTTD', value: fmtMins(inc.mttdMinutes) },
          { label: 'MTTR', value: inc.mttrMinutes > 0 ? fmtMins(inc.mttrMinutes) : '—' },
          { label: 'Assignee', value: inc.assignee },
          { label: 'Source', value: inc.source },
          { label: 'Created', value: new Date(inc.createdAt).toLocaleDateString() },
          { label: 'Updated', value: new Date(inc.updatedAt).toLocaleDateString() },
        ].map(item => (
          <div key={item.label} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-0.5">{item.label}</p>
            <p className="text-sm font-semibold text-slate-200">{item.value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Related Vulnerabilities</p>
        <MiniTable
          columns={['CVE ID', 'Severity', 'Asset', 'Days Open']}
          rows={relatedVulns.map(v => [v.cveId, <SevBadge key={v.id} sev={v.severity} />, v.assetName, String(v.daysOpen)])}
          onRowClick={(i) => {
            const v = relatedVulns[i]
            if (v) onPush({ type: 'vulnerability', id: v.id, label: v.cveId, sourceIntegration: 'Mock VA' })
          }}
        />
      </div>

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Related SIEM Offenses</p>
        <MiniTable
          columns={['ID', 'Rule', 'Source', 'Status']}
          rows={relatedOffenses.map(o => [`${o.source === 'QRadar' ? 'QR' : 'SP'}-${o.offenseId}`, o.ruleName, o.source, o.status])}
          onRowClick={(i) => {
            const o = relatedOffenses[i]
            if (o) onPush({ type: 'siem_offense', id: o.id, label: o.ruleName, sourceIntegration: o.source })
          }}
        />
      </div>
    </div>
  )
}

function AssetDetail({ target, onPush }: { target: DrillDownTarget; onPush: (t: DrillDownTarget) => void }) {
  const asset = assets.find(a => a.id === target.id) ?? assets[0]
  if (!asset) return <p className="text-slate-500 text-sm p-6">Asset not found.</p>

  const assetVulns = vulnerabilities.filter(v => v.assetId === asset.id)
  const assetIncidents = incidents.filter(i => i.affectedAssets.includes(asset.id))

  return (
    <div className="p-5 space-y-5">
      <div>
        <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Asset</p>
        <p className="text-xl font-bold font-mono text-slate-100">{asset.name}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>{asset.tier}</span>
          <span className="text-slate-400 text-xs">{asset.tierLabel}</span>
          {asset.internetFacing && <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>INTERNET-FACING</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'IP Address', value: asset.ip },
          { label: 'Owner', value: asset.owner },
          { label: 'Region', value: asset.region },
          { label: 'Criticality', value: `${asset.criticality}/10` },
          { label: 'Open Vulns', value: String(asset.openVulns) },
          { label: 'Open Critical', value: String(asset.openCritical) },
        ].map(item => (
          <div key={item.label} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-0.5">{item.label}</p>
            <p className="text-sm font-semibold text-slate-200">{item.value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Open Vulnerabilities</p>
        <MiniTable
          columns={['CVE ID', 'Severity', 'CVSS', 'Days']}
          rows={assetVulns.map(v => [v.cveId, <SevBadge key={v.id} sev={v.severity} />, v.cvssScore.toFixed(1), String(v.daysOpen)])}
          onRowClick={(i) => {
            const v = assetVulns[i]
            if (v) onPush({ type: 'vulnerability', id: v.id, label: v.cveId, sourceIntegration: 'Mock VA' })
          }}
        />
      </div>

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Recent Incidents</p>
        <MiniTable
          columns={['ID', 'Title', 'Severity', 'Phase']}
          rows={assetIncidents.map(i => [i.id, i.title.slice(0, 40), <SevBadge key={i.id} sev={i.severity} />, i.phase])}
          onRowClick={(i) => {
            const inc = assetIncidents[i]
            if (inc) onPush({ type: 'incident', id: inc.id, label: inc.title, sourceIntegration: inc.source })
          }}
        />
      </div>
    </div>
  )
}

function SIEMOffenseDetail({ target, onPush: _onPush }: { target: DrillDownTarget; onPush: (t: DrillDownTarget) => void }) {
  const offense = siemOffenses.find(o => o.id === target.id) ?? siemOffenses[0]
  if (!offense) return <p className="text-slate-500 text-sm p-6">Offense not found.</p>

  const mockEvents = [
    { time: new Date(Date.now() - 5 * 60000).toISOString(), event: 'Authentication failure from source IP', count: 142 },
    { time: new Date(Date.now() - 12 * 60000).toISOString(), event: 'Correlation rule threshold exceeded', count: 1 },
    { time: new Date(Date.now() - 18 * 60000).toISOString(), event: 'Repeated login attempts detected', count: 89 },
    { time: new Date(Date.now() - 35 * 60000).toISOString(), event: 'Connection to unusual port established', count: 3 },
    { time: new Date(Date.now() - 52 * 60000).toISOString(), event: 'First event matching pattern', count: 17 },
  ]

  return (
    <div className="p-5 space-y-5">
      <div>
        <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">{offense.source} Offense {offense.offenseId}</p>
        <p className="text-lg font-bold text-slate-100 leading-tight">{offense.ruleName}</p>
        <div className="flex items-center gap-2 mt-2">
          <SevBadge sev={offense.severity} />
          <span className="text-slate-400 text-xs">{offense.category}</span>
          <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: offense.status === 'OPEN' ? 'rgba(239,68,68,0.15)' : offense.status === 'IN_PROGRESS' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: offense.status === 'OPEN' ? '#ef4444' : offense.status === 'IN_PROGRESS' ? '#f59e0b' : '#10b981' }}>{offense.status.replace('_', ' ')}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Source IP', value: offense.sourceIp },
          { label: 'Dest IP', value: offense.destinationIp },
          { label: 'Username', value: offense.username ?? '—' },
          { label: 'Event Count', value: offense.eventCount.toLocaleString() },
        ].map(item => (
          <div key={item.label} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-0.5">{item.label}</p>
            <p className="text-sm font-semibold font-mono text-slate-200">{item.value}</p>
          </div>
        ))}
      </div>

      {offense.source === 'QRadar' && (
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">QRadar Magnitude</p>
          <div className="flex items-center gap-1">
            {Array.from({ length: 10 }, (_, j) => (
              <div key={j} className="w-6 h-5 rounded-sm" style={{ background: j < offense.magnitude ? '#6366f1' : 'rgba(99,102,241,0.15)' }} />
            ))}
            <span className="text-slate-400 text-sm font-bold ml-2">{offense.magnitude}/10</span>
          </div>
        </div>
      )}

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Event Timeline</p>
        <div className="space-y-2">
          {mockEvents.map((ev, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-300 text-xs truncate">{ev.event}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-slate-600 text-[10px] font-mono">{new Date(ev.time).toLocaleTimeString()}</span>
                  <span className="text-slate-600 text-[10px]">{ev.count} events</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function VAFindingDetail({ target, onPush: _onPush }: { target: DrillDownTarget; onPush: (t: DrillDownTarget) => void }) {
  const [riskAccepted, setRiskAccepted] = useState(false)

  return (
    <div className="p-5 space-y-5">
      <div>
        <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">VA Finding</p>
        <p className="text-lg font-bold text-slate-100 leading-tight">{target.label}</p>
        <div className="flex items-center gap-2 mt-2">
          <SevBadge sev="high" />
          <span className="text-slate-400 text-xs">{target.sourceIntegration ?? 'Scanner'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Plugin ID', value: `PID-${target.id.slice(-5)}` },
          { label: 'CVE Refs', value: `CVE-2024-${Math.abs(target.id.charCodeAt(4) * 1337) % 90000 + 10000}` },
          { label: 'CVSS Score', value: '7.8' },
          { label: 'Affected Host', value: `10.${Math.abs(target.id.charCodeAt(5) * 7) % 255}.${Math.abs(target.id.charCodeAt(6) * 13) % 255}.${Math.abs(target.id.charCodeAt(7) * 31) % 254 + 1}` },
        ].map(item => (
          <div key={item.label} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-0.5">{item.label}</p>
            <p className="text-sm font-semibold font-mono text-slate-200">{item.value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Description</p>
        <p className="text-slate-400 text-xs leading-relaxed">This vulnerability was identified during routine vulnerability assessment scanning. The affected service exposes a security weakness that could be leveraged by an attacker to gain unauthorized access or escalate privileges within the affected system.</p>
      </div>

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Remediation</p>
        <p className="text-slate-400 text-xs leading-relaxed">Apply vendor-supplied patches immediately. Verify the patch has been applied successfully by re-running the vulnerability scan. Consider implementing compensating controls until the patch can be applied in production environments.</p>
      </div>

      <div>
        <button
          onClick={() => setRiskAccepted(true)}
          disabled={riskAccepted}
          className="px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
          style={{ background: riskAccepted ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', border: `1px solid ${riskAccepted ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`, color: riskAccepted ? '#10b981' : '#f59e0b' }}
        >
          {riskAccepted ? 'Risk Accepted' : 'Accept Risk'}
        </button>
      </div>
    </div>
  )
}

function ComplianceControlDetail({ target, onPush: _onPush }: { target: DrillDownTarget; onPush: (t: DrillDownTarget) => void }) {
  const idx = parseInt(target.id.replace('cc-', '')) || 0
  const control = complianceControls[idx % complianceControls.length]
  if (!control) return <p className="text-slate-500 text-sm p-6">Control not found.</p>

  const frameworkMap: Record<string, string> = { NIST_CSF: 'NIST CSF 2.0', SOC2: 'SOC 2 Type II', PCI_DSS: 'PCI DSS v4' }
  const statusColor = control.score >= control.target ? '#10b981' : control.score >= control.target * 0.8 ? '#f59e0b' : '#ef4444'
  const statusLabel = control.score >= control.target ? 'Compliant' : control.score >= control.target * 0.8 ? 'Partial' : 'Non-Compliant'

  const evidence = [
    { id: 'EV-001', title: 'Access Control Policy', date: '2026-04-01', status: 'approved' },
    { id: 'EV-002', title: 'Security Assessment Report', date: '2026-03-15', status: 'approved' },
    { id: 'EV-003', title: 'Audit Log Review Records', date: '2026-04-10', status: 'pending' },
  ]

  return (
    <div className="p-5 space-y-5">
      <div>
        <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">{frameworkMap[control.framework] ?? control.framework}</p>
        <p className="text-xl font-bold text-slate-100">{control.domain}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: `${statusColor}20`, color: statusColor }}>{statusLabel}</span>
          <span className="text-slate-400 text-xs">Last assessed: {control.lastAssessed}</span>
        </div>
      </div>

      <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-xs">Score</span>
          <span className="text-lg font-bold" style={{ color: statusColor }}>{control.score}%</span>
        </div>
        <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-2 rounded-full transition-all" style={{ width: `${control.score}%`, background: statusColor }} />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-slate-600">Current</span>
          <span className="text-[10px] text-slate-600">Target: {control.target}%</span>
        </div>
      </div>

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Gap Analysis</p>
        <p className="text-slate-400 text-xs leading-relaxed">Current implementation is {control.target - control.score}% below target. Key gaps include incomplete documentation of security procedures, insufficient automated monitoring controls, and pending remediation of identified deficiencies from the last assessment cycle.</p>
      </div>

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Evidence Items</p>
        <div className="space-y-2">
          {evidence.map(ev => (
            <div key={ev.id} className="flex items-center justify-between rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div>
                <p className="text-slate-300 text-xs font-medium">{ev.title}</p>
                <p className="text-slate-600 text-[10px]">{ev.id} · {ev.date}</p>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: ev.status === 'approved' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: ev.status === 'approved' ? '#10b981' : '#f59e0b' }}>{ev.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MetricDetail({ target, onPush }: { target: DrillDownTarget; onPush: (t: DrillDownTarget) => void }) {
  const isVulnMetric = target.id.includes('vuln') || target.id.includes('crit') || target.id.includes('sla')
  const isIncidentMetric = target.id.includes('mttd') || target.id.includes('mttr') || target.id.includes('incident')
  const isPosture = target.id.includes('posture')

  if (isVulnMetric) {
    const filtered = target.id.includes('sla')
      ? vulnerabilities.filter(v => v.slaBreached).slice(0, 50)
      : vulnerabilities.filter(v => v.effectivePriority === 'critical').slice(0, 50)

    return (
      <div className="p-5 space-y-4">
        <div>
          <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Metric Detail</p>
          <p className="text-xl font-bold text-slate-100">{target.label}</p>
          <p className="text-3xl font-bold mt-2" style={{ color: '#ef4444' }}>{filtered.length}</p>
        </div>
        <MiniTable
          columns={['CVE ID', 'Severity', 'Asset', 'Days']}
          rows={filtered.map(v => [v.cveId, <SevBadge key={v.id} sev={v.severity} />, v.assetName, String(v.daysOpen)])}
          onRowClick={(i) => {
            const v = filtered[i]
            if (v) onPush({ type: 'vulnerability', id: v.id, label: v.cveId, sourceIntegration: 'Mock VA' })
          }}
        />
      </div>
    )
  }

  if (isPosture) {
    return (
      <div className="p-5 space-y-4">
        <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Security Posture Score</p>
        <p className="text-xl font-bold text-slate-100">{target.label}</p>
        <p className="text-slate-400 text-xs leading-relaxed">The security posture score is a composite metric calculated from: Compliance controls score (40% weight), SLA adherence (30% weight), and CVE exposure inverse (30% weight). A higher score indicates better overall security posture.</p>
        <MiniTable
          columns={['Framework', 'Domain', 'Score', 'Target']}
          rows={complianceControls.map(c => [c.framework, c.domain, `${c.score}%`, `${c.target}%`])}
        />
      </div>
    )
  }

  if (isIncidentMetric) {
    return (
      <div className="p-5 space-y-4">
        <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Incident Metric</p>
        <p className="text-xl font-bold text-slate-100">{target.label}</p>
        <MiniTable
          columns={['ID', 'Title', 'Severity', 'Phase', 'MTTD']}
          rows={incidents.map(i => [i.id, i.title.slice(0, 35), <SevBadge key={i.id} sev={i.severity} />, i.phase, `${i.mttdMinutes}m`])}
          onRowClick={(i) => {
            const inc = incidents[i]
            if (inc) onPush({ type: 'incident', id: inc.id, label: inc.title, sourceIntegration: inc.source })
          }}
        />
      </div>
    )
  }

  return (
    <div className="p-5">
      <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Metric</p>
      <p className="text-xl font-bold text-slate-100">{target.label}</p>
      <p className="text-slate-400 text-xs mt-3">Detailed breakdown for this metric is available in the main dashboard sections.</p>
    </div>
  )
}

function ThreatFeedItemDetail({ target }: { target: DrillDownTarget }) {
  return (
    <div className="p-5 space-y-5">
      <div>
        <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Threat Intelligence IOC</p>
        <p className="text-2xl font-bold font-mono text-slate-100 break-all">{target.label}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[9px] px-2 py-0.5 rounded font-bold" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>IOC</span>
          <span className="text-slate-400 text-xs">{target.sourceIntegration ?? 'Threat Feed'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Feed Source', value: target.sourceIntegration ?? '—' },
          { label: 'IOC Type', value: target.id.includes('cve') ? 'CVE' : target.id.includes('ip') ? 'IP' : 'IOC' },
          { label: 'First Seen', value: new Date(Date.now() - 30 * 86400000).toLocaleDateString() },
          { label: 'Last Seen', value: new Date().toLocaleDateString() },
        ].map(item => (
          <div key={item.label} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-0.5">{item.label}</p>
            <p className="text-sm font-semibold text-slate-200">{item.value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">MITRE ATT&CK</p>
        <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-slate-300 text-xs font-medium">TA0001 — Initial Access</p>
          <p className="text-slate-500 text-[10px] mt-0.5">T1190 — Exploit Public-Facing Application</p>
        </div>
      </div>

      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Description</p>
        <p className="text-slate-400 text-xs leading-relaxed">This indicator of compromise was identified through threat intelligence feeds and is associated with known malicious activity. Immediate investigation is recommended if this IOC is observed in your environment.</p>
      </div>
    </div>
  )
}

function DetailBody({ target, onPush }: { target: DrillDownTarget; onPush: (t: DrillDownTarget) => void }) {
  switch (target.type) {
    case 'vulnerability': return <VulnerabilityDetail target={target} onPush={onPush} />
    case 'incident': return <IncidentDetail target={target} onPush={onPush} />
    case 'asset': return <AssetDetail target={target} onPush={onPush} />
    case 'siem_offense': return <SIEMOffenseDetail target={target} onPush={onPush} />
    case 'va_finding': return <VAFindingDetail target={target} onPush={onPush} />
    case 'compliance_control': return <ComplianceControlDetail target={target} onPush={onPush} />
    case 'metric': return <MetricDetail target={target} onPush={onPush} />
    case 'threat_feed_item': return <ThreatFeedItemDetail target={target} />
    default: return <p className="p-6 text-slate-500 text-sm">No detail view available.</p>
  }
}

// ── Main Panel ─────────────────────────────────────────────────────────────────

export function DrillDownPanel() {
  const { stack, isOpen, closeDrillDown, pushDrillDown, popDrillDown } = useDrillDown()

  const current = stack[stack.length - 1]

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={closeDrillDown}
        />
      )}

      {/* Slide-out panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
        style={{
          width: 640,
          background: 'rgba(10,15,30,0.98)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms ease-in-out',
        }}
      >
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-white/[0.06] flex items-center gap-3">
          {/* Breadcrumbs */}
          <div className="flex-1 flex items-center gap-1 overflow-hidden">
            {stack.map((item, i) => (
              <div key={i} className="flex items-center gap-1 min-w-0">
                {i > 0 && <ChevronRight size={12} className="text-slate-700 shrink-0" />}
                <button
                  onClick={() => {
                    if (i < stack.length - 1) {
                      // pop to this level
                      const times = stack.length - 1 - i
                      for (let j = 0; j < times; j++) popDrillDown()
                    }
                  }}
                  className={`text-xs truncate max-w-[160px] transition-colors ${i === stack.length - 1 ? 'text-slate-200 font-semibold' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {item.label}
                </button>
              </div>
            ))}
          </div>

          {/* Source badge */}
          {current?.sourceIntegration && (
            <span className="text-[9px] px-2 py-0.5 rounded font-bold shrink-0" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
              {current.sourceIntegration}
            </span>
          )}

          {/* External link icon */}
          <ExternalLink size={13} className="text-slate-600 hover:text-slate-400 cursor-pointer shrink-0 transition-colors" />

          {/* Close */}
          <button onClick={closeDrillDown} className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {current && (
            <DetailBody key={current.id + current.type} target={current} onPush={pushDrillDown} />
          )}
        </div>
      </div>
    </>
  )
}
