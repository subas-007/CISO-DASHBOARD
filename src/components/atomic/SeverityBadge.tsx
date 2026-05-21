import type { Severity } from '../../types/security'

const config: Record<Severity, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-red-950/60 border border-red-800/50', text: 'text-red-400', label: 'CRITICAL' },
  high:     { bg: 'bg-amber-950/60 border border-amber-800/50', text: 'text-amber-400', label: 'HIGH' },
  medium:   { bg: 'bg-blue-950/60 border border-blue-800/50', text: 'text-blue-400', label: 'MEDIUM' },
  low:      { bg: 'bg-emerald-950/60 border border-emerald-800/50', text: 'text-emerald-400', label: 'LOW' },
}

export function SeverityBadge({ severity, size = 'sm' }: { severity: Severity; size?: 'xs' | 'sm' }) {
  const { bg, text, label } = config[severity]
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono font-semibold tracking-wider ${bg} ${text} ${size === 'xs' ? 'text-[9px]' : 'text-[10px]'}`}>
      {label}
    </span>
  )
}
