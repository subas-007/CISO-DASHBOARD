import type { ReactNode } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface Props {
  title: string
  value: string | number
  subtitle?: string
  trend?: ReactNode
  icon?: ReactNode
  accentColor?: string
  onClick?: () => void
  active?: boolean
  badge?: ReactNode
  sparklineData?: number[]
}

export function MetricCard({ title, value, subtitle, trend, icon, accentColor = '#6366f1', onClick, active, badge, sparklineData }: Props) {
  const sparkPoints = sparklineData?.map(v => ({ v }))

  return (
    <div
      onClick={onClick}
      className={`glass-card rounded-xl p-4 transition-all duration-200 relative overflow-hidden ${onClick ? 'cursor-pointer hover:border-white/20' : ''} ${active ? 'ring-1 ring-indigo-500/60' : ''}`}
    >
      {/* Accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{ background: `linear-gradient(90deg, ${accentColor}80, transparent)` }} />

      <div className="flex items-start justify-between mb-3">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{title}</p>
        <div className="flex items-center gap-2">
          {badge}
          {icon && <div className="text-slate-500">{icon}</div>}
        </div>
      </div>

      <div className="mb-1">
        <span className="text-2xl font-bold text-slate-100 tabular-nums">{value}</span>
      </div>

      {subtitle && <p className="text-slate-500 text-xs mb-2">{subtitle}</p>}
      {trend && <div className="mt-2">{trend}</div>}

      {sparkPoints && sparkPoints.length > 0 && (
        <div className="mt-2" style={{ height: 36 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkPoints} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
              <Line
                type="monotone"
                dataKey="v"
                stroke="#6366f1"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
