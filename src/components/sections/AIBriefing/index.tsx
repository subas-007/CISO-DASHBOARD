import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw, Clock, ChevronRight } from 'lucide-react'
import { SectionSkeleton } from '../../ui/SectionSkeleton'
import { useDataFreshness } from '../../../hooks/useDataFreshness'
import FreshnessBadge from '../../ui/FreshnessBadge'

const BRIEFING_SECTIONS = [
  {
    title: 'Risk Posture Summary',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.06)',
    border: 'rgba(99,102,241,0.18)',
    bullets: [
      'Overall posture score: 71/100 (↑2 from prior period) — marginal improvement driven by critical CVE patch sprint',
      'ALE down 27% year-over-year: $5.8M → $4.2M — vulnerability automation investments yielding measurable financial returns',
      '908 SLA-breached vulnerabilities remain open, exceeding internal policy threshold (SEC-P-003) by 5%',
      'P90 tail risk at $12.8M — Monte Carlo FAIR analysis suggests cyber insurance coverage review is warranted',
    ],
  },
  {
    title: 'Critical Issues Requiring Executive Decision',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.06)',
    border: 'rgba(239,68,68,0.18)',
    bullets: [
      'PCI-DSS Vulnerability Management at 64% vs 90% target — Q2 QSA audit at risk without compensating controls within 30 days',
      'NIST CSF Recover function at 55/100 (lowest across all functions) — IR playbooks 14 months stale; tabletop exercise 8 months overdue',
      'Core Banking SaaS vendor: unencrypted API key storage finding overdue since Apr 30 — escalation to vendor CISO required immediately',
      '2 of 6 repos (mobile-backend, reporting-svc) have no SBOM coverage — material supply chain audit gap ahead of SOC 2 renewal',
    ],
  },
  {
    title: 'Positive Trend Indicators',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.06)',
    border: 'rgba(16,185,129,0.18)',
    bullets: [
      'Critical CVE count reduced 8% month-over-month — dedicated patch sprint program producing consistent results',
      'SOC mean time to detect: 42 min vs 60-min industry benchmark — detection velocity above average for financial sector',
      'Auth service achieved full SBOM coverage: 143/143 components verified and signed',
      'Zero P1 incidents attributable to supply chain compromise in this reporting period',
    ],
  },
  {
    title: 'Board-Level Recommended Actions',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.18)',
    bullets: [
      'Authorize $85K emergency patch sprint for T0 critical CVEs — estimated 30-day full remediation window',
      'Direct CISO to engage external QSA for PCI-DSS compensating controls assessment before Q2 deadline',
      'Review cyber insurance policy limits — $4.2M ALE with $12.8M P90 tail risk may require coverage increase',
      'Approve 1× SOC Tier 2 Analyst headcount — required to sustain MTTD/MTTR improvement targets into H2 2026',
    ],
  },
]

const GENERATED_AT_LABEL = 'May 21, 2026 · 09:14 AM NPT'

export function AIBriefing({ lastUpdated }: { lastUpdated?: number }) {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 550); return () => clearTimeout(t) }, [])

  const { label: freshnessLabel } = useDataFreshness(lastUpdated)
  const [status, setStatus] = useState<'idle' | 'generating' | 'generated'>('idle')

  const generate = () => {
    setStatus('generating')
    setTimeout(() => setStatus('generated'), 1500)
  }

  if (!loaded) return <SectionSkeleton accent="#06b6d4" cols={1} />

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-6 rounded-full bg-cyan-500" />
        <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">E — AI Executive Briefing</h2>
        <div className="flex-1 h-px bg-white/5" />
        <FreshnessBadge label={freshnessLabel} />
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-cyan-400" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Powered by Claude AI</span>
          </div>
          {status === 'generated' && (
            <div className="flex items-center gap-1.5 text-[9px] text-slate-600">
              <Clock size={10} />
              <span>Generated {GENERATED_AT_LABEL}</span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {status === 'generated' && (
              <button
                onClick={generate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-white/[0.06] transition-all"
              >
                <RefreshCw size={11} />
                Regenerate
              </button>
            )}
            {status !== 'generated' && (
              <button
                onClick={generate}
                disabled={status === 'generating'}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-60"
                style={{
                  background: status === 'generating' ? 'rgba(6,182,212,0.15)' : 'rgba(6,182,212,0.2)',
                  border: '1px solid rgba(6,182,212,0.35)',
                  color: '#22d3ee',
                }}
              >
                {status === 'generating' ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    Generating briefing…
                  </>
                ) : (
                  <>
                    <Sparkles size={12} />
                    Generate Executive Briefing
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {status === 'idle' && (
          <div className="flex flex-col items-center justify-center py-16 gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}>
              <Sparkles size={28} className="text-cyan-500" />
            </div>
            <div className="text-center max-w-sm">
              <p className="text-slate-300 text-sm font-medium mb-1.5">AI-Powered Executive Briefing</p>
              <p className="text-slate-600 text-xs leading-relaxed">
                Generates a board-ready security briefing synthesizing posture score, FAIR risk exposure, compliance drift, and top threats — tailored for executive and board-level audiences.
              </p>
            </div>
            <button
              onClick={generate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', color: '#22d3ee' }}
            >
              <Sparkles size={14} />
              Generate Briefing
            </button>
          </div>
        )}

        {status === 'generating' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center animate-pulse" style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}>
              <Sparkles size={20} className="text-cyan-400 animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-slate-300 text-sm font-medium">Analyzing security posture…</p>
              <p className="text-slate-600 text-xs mt-1">Synthesizing FAIR model · Compliance drift · Threat signals</p>
            </div>
            {/* Shimmer bars */}
            <div className="w-full max-w-2xl px-8 space-y-2 mt-2">
              {[85, 72, 90, 65].map((w, i) => (
                <div key={i} className="h-2 rounded-full animate-pulse" style={{ width: `${w}%`, background: 'rgba(255,255,255,0.06)' }} />
              ))}
            </div>
          </div>
        )}

        {status === 'generated' && (
          <div className="p-5">
            {/* Headline summary */}
            <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
              <div className="flex items-start gap-3">
                <Sparkles size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                <p className="text-slate-300 text-sm leading-relaxed">
                  Security posture improved marginally (+2pts) but SLA breach rate and PCI-DSS compliance gaps represent material risks requiring immediate executive action. ALE trending favorably at $4.2M; P90 tail exposure of $12.8M warrants insurance review.
                </p>
              </div>
            </div>

            {/* 4-section briefing grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {BRIEFING_SECTIONS.map(section => (
                <div key={section.title} className="rounded-xl p-4" style={{ background: section.bg, border: `1px solid ${section.border}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 rounded-full" style={{ background: section.color }} />
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: section.color }}>
                      {section.title}
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {section.bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ChevronRight size={11} className="mt-0.5 flex-shrink-0" style={{ color: section.color }} />
                        <p className="text-slate-400 text-[11px] leading-relaxed">{b}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <p className="text-[9px] text-slate-700 mt-4 text-center">
              AI-generated briefing based on current dashboard data. Verify all figures with source systems before board presentation.
              Model: Claude Sonnet 4.6 · Context: FAIR model, compliance controls, vulnerability data, threat feeds.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
