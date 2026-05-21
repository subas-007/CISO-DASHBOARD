interface Props {
  accent?: string
  cols?: number
  hasTopRow?: boolean
}

export function SectionSkeleton({ accent = '#6366f1', cols = 3, hasTopRow = false }: Props) {
  return (
    <section>
      {/* Header bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-6 rounded-full" style={{ background: `${accent}50` }} />
        <div className="h-2.5 w-60 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="flex-1 h-px bg-white/[0.04]" />
        <div className="h-4 w-24 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>

      {/* Optional top metrics row */}
      {hasTopRow && (
        <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-4 space-y-2">
              <div className="h-2 w-20 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
              <div className="h-6 w-16 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.07)' }} />
              <div className="h-1.5 w-32 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
          ))}
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="glass-card rounded-xl p-5 space-y-3">
            <div className="h-2.5 w-28 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div
              className="rounded-lg animate-pulse"
              style={{
                height: i === 0 ? 160 : 180,
                background: 'rgba(255,255,255,0.03)',
              }}
            />
            {[75, 55, 90].map((w, j) => (
              <div
                key={j}
                className="h-2 rounded-full animate-pulse"
                style={{ width: `${w}%`, background: 'rgba(255,255,255,0.04)' }}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
