interface Props {
  score: number   // 0-100
  size?: number
}

function scoreColor(s: number) {
  if (s >= 80) return '#10b981'
  if (s >= 60) return '#f59e0b'
  if (s >= 40) return '#f97316'
  return '#ef4444'
}

function scoreLabel(s: number) {
  if (s >= 80) return 'GOOD'
  if (s >= 60) return 'MODERATE'
  if (s >= 40) return 'ELEVATED'
  return 'CRITICAL'
}

export function RiskGauge({ score, size = 180 }: Props) {
  const cx = size / 2, cy = size / 2
  const r = size * 0.38
  const strokeW = size * 0.07
  const startAngle = -210
  const endAngle = 30
  const totalAngle = endAngle - startAngle  // 240 degrees

  const toRad = (deg: number) => (deg * Math.PI) / 180
  const arcX = (deg: number) => cx + r * Math.cos(toRad(deg))
  const arcY = (deg: number) => cy + r * Math.sin(toRad(deg))

  const bgPath = `M ${arcX(startAngle)} ${arcY(startAngle)} A ${r} ${r} 0 1 1 ${arcX(endAngle)} ${arcY(endAngle)}`
  const filled = (score / 100) * totalAngle
  const fillEnd = startAngle + filled
  const largeArc = filled > 180 ? 1 : 0
  const fillPath = score > 0
    ? `M ${arcX(startAngle)} ${arcY(startAngle)} A ${r} ${r} 0 ${largeArc} 1 ${arcX(fillEnd)} ${arcY(fillEnd)}`
    : ''

  const color = scoreColor(score)

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        {/* Glow filter */}
        <defs>
          <filter id="gauge-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Track */}
        <path d={bgPath} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeW} strokeLinecap="round" />

        {/* Filled arc */}
        {fillPath && (
          <path d={fillPath} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round"
            filter="url(#gauge-glow)" style={{ transition: 'all 0.8s cubic-bezier(0.34,1.56,0.64,1)' }} />
        )}

        {/* Score text */}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#e2e8f0" fontSize={size * 0.16} fontWeight="700" fontFamily="ui-monospace,monospace">
          {score}
        </text>
        <text x={cx} y={cy + size * 0.1} textAnchor="middle" fill={color} fontSize={size * 0.065} fontWeight="600" letterSpacing="2">
          {scoreLabel(score)}
        </text>
      </svg>
    </div>
  )
}
