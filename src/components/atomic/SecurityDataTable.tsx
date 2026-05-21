import { useMemo, useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { SeverityBadge } from './SeverityBadge'
import { useFilteredVulnerabilities, useFilteredAssets } from '../../hooks/useFilteredData'
import type { Severity } from '../../types/security'

type TableMode = 'vulnerabilities' | 'assets'

function formatAge(days: number) {
  if (days < 1) return '< 1d'
  if (days < 30) return `${days}d`
  return `${Math.floor(days / 30)}mo ${days % 30}d`
}

export function SecurityDataTable({ mode = 'vulnerabilities' }: { mode?: TableMode }) {
  const vulns = useFilteredVulnerabilities()
  const assetData = useFilteredAssets()
  const [sortCol, setSortCol] = useState<string>('effectivePriority')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 12

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
    setPage(0)
  }

  const sevOrder: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 }

  const sortedVulns = useMemo(() => {
    const sorted = [...vulns].sort((a, b) => {
      let cmp = 0
      if (sortCol === 'effectivePriority') cmp = sevOrder[a.effectivePriority] - sevOrder[b.effectivePriority]
      else if (sortCol === 'cvssScore') cmp = a.cvssScore - b.cvssScore
      else if (sortCol === 'daysOpen') cmp = a.daysOpen - b.daysOpen
      else if (sortCol === 'assetTier') cmp = a.assetTier.localeCompare(b.assetTier)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [vulns, sortCol, sortDir])

  const SortIcon = ({ col }: { col: string }) => (
    <span className="inline-flex flex-col ml-1 opacity-40">
      {sortCol === col ? (sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />) : <ChevronDown size={10} />}
    </span>
  )

  const Th = ({ col, label, className = '' }: { col: string; label: string; className?: string }) => (
    <th onClick={() => handleSort(col)} className={`px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 cursor-pointer hover:text-slate-300 transition-colors select-none whitespace-nowrap ${className}`}>
      {label}<SortIcon col={col} />
    </th>
  )

  if (mode === 'assets') {
    const totalPages = Math.ceil(assetData.length / PAGE_SIZE)
    const pageData = assetData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    return (
      <div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-white/5">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Asset</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Tier</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Type</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Open Vulns</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Critical</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Region</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((a, i) => (
                <tr key={a.id} className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                  <td className="px-3 py-2 font-mono text-slate-300">{a.name}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      a.tier === 'T0' ? 'bg-red-950/60 text-red-400' :
                      a.tier === 'T1' ? 'bg-amber-950/60 text-amber-400' :
                      a.tier === 'T2' ? 'bg-blue-950/60 text-blue-400' :
                      'bg-slate-800/60 text-slate-400'
                    }`}>{a.tier}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-400">{a.type}</td>
                  <td className="px-3 py-2 text-slate-300 tabular-nums">{a.openVulns}</td>
                  <td className="px-3 py-2">
                    {a.openCritical > 0 ? <span className="text-red-400 font-semibold tabular-nums">{a.openCritical}</span> : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-3 py-2 text-slate-500 font-mono">{a.region}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-3 py-2 border-t border-white/5">
          <span className="text-slate-600 text-[10px]">{assetData.length} assets</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="text-slate-500 hover:text-slate-300 disabled:opacity-30 text-xs px-2 py-1 rounded hover:bg-white/5 transition-colors">Prev</button>
            <span className="text-slate-600 text-[10px]">{page + 1}/{totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="text-slate-500 hover:text-slate-300 disabled:opacity-30 text-xs px-2 py-1 rounded hover:bg-white/5 transition-colors">Next</button>
          </div>
        </div>
      </div>
    )
  }

  const totalPages = Math.ceil(sortedVulns.length / PAGE_SIZE)
  const pageData = sortedVulns.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-b border-white/5">
            <tr>
              <Th col="effectivePriority" label="Priority" />
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">CVE ID</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">Asset</th>
              <Th col="assetTier" label="Tier" />
              <Th col="cvssScore" label="CVSS" />
              <Th col="daysOpen" label="Age" />
              <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">SLA</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((v, i) => (
              <tr key={v.id} className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                <td className="px-3 py-2"><SeverityBadge severity={v.effectivePriority} size="xs" /></td>
                <td className="px-3 py-2 font-mono text-slate-400 text-[10px]">{v.cveId}</td>
                <td className="px-3 py-2 text-slate-300 truncate max-w-[140px]">{v.assetName}</td>
                <td className="px-3 py-2">
                  <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${v.assetTier === 'T0' ? 'text-red-400' : v.assetTier === 'T1' ? 'text-amber-400' : v.assetTier === 'T2' ? 'text-blue-400' : 'text-slate-500'}`}>{v.assetTier}</span>
                </td>
                <td className="px-3 py-2 tabular-nums text-slate-300 font-mono">{v.cvssScore.toFixed(1)}</td>
                <td className="px-3 py-2 tabular-nums text-slate-400">{formatAge(v.daysOpen)}</td>
                <td className="px-3 py-2">
                  {v.slaBreached
                    ? <span className="text-red-400 text-[9px] font-semibold">BREACHED +{v.daysOpen - v.slaDays}d</span>
                    : <span className="text-emerald-600 text-[9px]">{v.slaDays - v.daysOpen}d left</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-3 py-2 border-t border-white/5">
        <span className="text-slate-600 text-[10px]">{sortedVulns.length.toLocaleString()} vulnerabilities</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="text-slate-500 hover:text-slate-300 disabled:opacity-30 text-xs px-2 py-1 rounded hover:bg-white/5 transition-colors">Prev</button>
          <span className="text-slate-600 text-[10px]">{page + 1}/{totalPages || 1}</span>
          <button onClick={() => setPage(p => Math.min((totalPages || 1) - 1, p + 1))} disabled={page >= (totalPages || 1) - 1} className="text-slate-500 hover:text-slate-300 disabled:opacity-30 text-xs px-2 py-1 rounded hover:bg-white/5 transition-colors">Next</button>
        </div>
      </div>
    </div>
  )
}
