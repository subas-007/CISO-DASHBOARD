import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Props {
  value: number
  invertColors?: boolean  // true = negative trend is good (e.g. MTTD going down is good)
  suffix?: string
}

export function TrendBadge({ value, invertColors = false, suffix = '%' }: Props) {
  const isPositive = value > 0
  const isGood = invertColors ? !isPositive : isPositive
  const absVal = Math.abs(value).toFixed(1)

  if (value === 0) return (
    <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-medium">
      <Minus size={11} /> No change
    </span>
  )

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${isGood ? 'text-emerald-400' : 'text-red-400'}`}>
      {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {isPositive ? '+' : '-'}{absVal}{suffix} vs last month
    </span>
  )
}
