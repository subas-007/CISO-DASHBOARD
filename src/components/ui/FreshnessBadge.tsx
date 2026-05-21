interface FreshnessBadgeProps {
  label: string
  className?: string
}

export default function FreshnessBadge({ label, className = '' }: FreshnessBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.04] border border-white/[0.06] text-slate-500 ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 live-pulse inline-block" />
      {label}
    </span>
  )
}
