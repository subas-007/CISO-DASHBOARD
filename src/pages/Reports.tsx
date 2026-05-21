import { useState, useMemo } from 'react'
import { FileText, Printer, RefreshCw } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid,
} from 'recharts'
import { vulnerabilities, incidents, complianceControls, securityMetrics } from '../data/mockData'
import { siemOffenses } from '../data/siemOffenseData'
import { useThreatFeeds } from '../hooks/useThreatFeeds'
import { useIncidentIntegrations } from '../hooks/useIncidentIntegrations'
import { useVAReports } from '../hooks/useVAReports'

type DateRange = '7d' | '30d' | '90d'
type AssetScope = 'all' | 'T0' | 'T0T1'

type WorkflowStage = 'draft' | 'under_review' | 'ciso_approved' | 'board_approved'

interface WorkflowState {
  currentStage: WorkflowStage
  timestamps: Partial<Record<WorkflowStage, string>>
}

const STAGES: Array<{ id: WorkflowStage; label: string; desc: string; actor: string; action: string; color: string }> = [
  { id: 'draft',          label: 'Draft',           desc: 'Prepared by audit team',                       actor: 'Audit Team',  action: 'Submit for Review',  color: '#64748b' },
  { id: 'under_review',   label: 'Under Review',    desc: 'Pending CISO review and sign-off',             actor: 'CISO Office', action: 'CISO Approve',        color: '#6366f1' },
  { id: 'ciso_approved',  label: 'CISO Approved',   desc: 'Signed off by Chief Information Security Officer', actor: 'CISO',  action: 'Submit to Board',    color: '#f59e0b' },
  { id: 'board_approved', label: 'Board Ratified',  desc: 'Ratified by Board Risk Committee',             actor: 'Board',       action: '',                    color: '#10b981' },
]

const STAGE_ORDER: WorkflowStage[] = ['draft', 'under_review', 'ciso_approved', 'board_approved']

const WORKFLOW_DEFAULT: WorkflowState = {
  currentStage: 'draft',
  timestamps: { draft: '2026-05-21T09:00:00' },
}

function loadWorkflow(): WorkflowState {
  try {
    const s = localStorage.getItem('ciso_audit_workflow')
    return s ? JSON.parse(s) : WORKFLOW_DEFAULT
  } catch { return WORKFLOW_DEFAULT }
}

function saveWorkflow(s: WorkflowState) {
  localStorage.setItem('ciso_audit_workflow', JSON.stringify(s))
}

const MONTHS = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May']
const ALE_TREND = [5.8, 5.2, 5.6, 4.9, 6.1, 5.8, 5.1, 4.8, 4.5, 4.3, 4.4, 4.2].map((v, i) => ({ month: MONTHS[i], aleM: v }))

const HEATMAP_RISKS = [
  { likelihood: 5, impact: 5, count: 3, label: 'Ransomware Attack' },
  { likelihood: 4, impact: 5, count: 5, label: 'Data Breach' },
  { likelihood: 3, impact: 5, count: 2, label: 'Critical System Failure' },
  { likelihood: 5, impact: 4, count: 7, label: 'Phishing Campaign' },
  { likelihood: 4, impact: 4, count: 4, label: 'Insider Threat' },
  { likelihood: 3, impact: 4, count: 6, label: 'Supply Chain Attack' },
  { likelihood: 5, impact: 3, count: 9, label: 'DDoS Attack' },
  { likelihood: 2, impact: 5, count: 1, label: 'Zero-Day Exploit' },
  { likelihood: 4, impact: 3, count: 8, label: 'Credential Stuffing' },
  { likelihood: 3, impact: 3, count: 12, label: 'Unpatched CVEs' },
  { likelihood: 2, impact: 4, count: 3, label: 'APT Intrusion' },
  { likelihood: 5, impact: 2, count: 15, label: 'Phishing Emails' },
  { likelihood: 1, impact: 5, count: 1, label: 'Nuclear Option' },
  { likelihood: 2, impact: 3, count: 5, label: 'Third-Party Breach' },
  { likelihood: 3, impact: 2, count: 10, label: 'Misconfiguration' },
]

const TOP_RISKS = [
  { rank: 1, title: 'Unpatched Critical CVEs in T0/T1 assets', category: 'Cyber', likelihood: 5, impact: 5, inherent: 25, residual: 18, treatment: 'Mitigate', owner: 'infra-team' },
  { rank: 2, title: 'Ransomware via phishing vector', category: 'Cyber', likelihood: 4, impact: 5, inherent: 20, residual: 14, treatment: 'Mitigate', owner: 'soc-team' },
  { rank: 3, title: 'Insider threat — privileged access misuse', category: 'Operational', likelihood: 3, impact: 5, inherent: 15, residual: 10, treatment: 'Mitigate', owner: 'iam-team' },
  { rank: 4, title: 'PCI-DSS compliance gaps — Vuln Management', category: 'Compliance', likelihood: 4, impact: 4, inherent: 16, residual: 12, treatment: 'Mitigate', owner: 'ciso-office' },
  { rank: 5, title: 'Third-party vendor security failure', category: 'Operational', likelihood: 3, impact: 4, inherent: 12, residual: 9, treatment: 'Transfer', owner: 'vendor-mgmt' },
  { rank: 6, title: 'DDoS attack on payment gateway', category: 'Cyber', likelihood: 5, impact: 3, inherent: 15, residual: 8, treatment: 'Mitigate', owner: 'network-team' },
  { rank: 7, title: 'Supply chain compromise in CI/CD', category: 'Cyber', likelihood: 2, impact: 5, inherent: 10, residual: 7, treatment: 'Mitigate', owner: 'devsecops' },
  { rank: 8, title: 'SOC2 Confidentiality control failure', category: 'Compliance', likelihood: 3, impact: 3, inherent: 9, residual: 6, treatment: 'Mitigate', owner: 'ciso-office' },
  { rank: 9, title: 'SLA breach leading to regulatory penalty', category: 'Compliance', likelihood: 4, impact: 3, inherent: 12, residual: 8, treatment: 'Accept', owner: 'ciso-office' },
  { rank: 10, title: 'Cloud misconfiguration data exposure', category: 'Cyber', likelihood: 3, impact: 3, inherent: 9, residual: 5, treatment: 'Mitigate', owner: 'cloud-team' },
]

const RISK_SCORE_COLOR = (score: number) => score >= 20 ? '#ef4444' : score >= 12 ? '#f59e0b' : score >= 6 ? '#3b82f6' : '#10b981'

// Framework control effectiveness
const frameworkEffectiveness = [
  { framework: 'NIST CSF', pct: Math.round(complianceControls.filter(c => c.framework === 'NIST_CSF').reduce((a, b) => a + b.score / b.target, 0) / complianceControls.filter(c => c.framework === 'NIST_CSF').length * 100) },
  { framework: 'SOC 2', pct: Math.round(complianceControls.filter(c => c.framework === 'SOC2').reduce((a, b) => a + b.score / b.target, 0) / complianceControls.filter(c => c.framework === 'SOC2').length * 100) },
  { framework: 'PCI DSS', pct: Math.round(complianceControls.filter(c => c.framework === 'PCI_DSS').reduce((a, b) => a + b.score / b.target, 0) / complianceControls.filter(c => c.framework === 'PCI_DSS').length * 100) },
  { framework: 'ISO 27001', pct: Math.round(complianceControls.filter(c => c.framework === 'ISO_27001').reduce((a, b) => a + b.score / b.target, 0) / (complianceControls.filter(c => c.framework === 'ISO_27001').length || 1) * 100) },
]

const HEATMAP_COLOR = (l: number, i: number) => {
  const score = l * i
  if (score >= 20) return 'rgba(239,68,68,0.8)'
  if (score >= 12) return 'rgba(239,68,68,0.5)'
  if (score >= 9) return 'rgba(245,158,11,0.7)'
  if (score >= 6) return 'rgba(245,158,11,0.4)'
  if (score >= 3) return 'rgba(59,130,246,0.4)'
  return 'rgba(16,185,129,0.3)'
}

const COMPLIANCE_STATUS = complianceControls.map(c => ({
  framework: c.framework.replace('_', ' '),
  domain: c.domain,
  total: 10,
  passed: Math.round(c.score / 10),
  failed: 10 - Math.round(c.score / 10),
  notAssessed: 0,
  score: c.score,
}))

const CRITICAL_FINDINGS = [
  {
    id: 'CF-001', title: 'PCI-DSS Vulnerability Management Controls Below Target',
    frameworkRef: 'PCI DSS Req 6.3', severity: 'Critical',
    evidence: 'Current score 64% vs target 90%. 847 unpatched critical CVEs in scope.',
    recommendation: 'Implement automated patching pipeline for Tier 0/1 assets within 30 days.',
  },
  {
    id: 'CF-002', title: 'SOC2 Confidentiality Controls Deficient',
    frameworkRef: 'SOC2 CC6.1', severity: 'High',
    evidence: 'Score 71% vs target 95%. DLP policies incomplete on 12 data stores.',
    recommendation: 'Deploy DLP solution with full coverage within 60 days.',
  },
  {
    id: 'CF-003', title: 'NIST CSF Recover Function Significantly Below Target',
    frameworkRef: 'NIST CSF RS.RP-1', severity: 'High',
    evidence: 'Score 55% vs target 80%. IR playbooks outdated. Last tabletop 14 months ago.',
    recommendation: 'Update IR playbooks and conduct tabletop exercise within 45 days.',
  },
  {
    id: 'CF-004', title: 'SLA Breach Rate Exceeds Acceptable Threshold',
    frameworkRef: 'Internal Policy SEC-P-003', severity: 'Critical',
    evidence: `908+ vulnerabilities past SLA. ${securityMetrics.slaBreachCount} total SLA breaches.`,
    recommendation: 'Establish exception management process and remediation sprints.',
  },
  {
    id: 'CF-005', title: 'MTTD Exceeds Industry Benchmark',
    frameworkRef: 'NIST SP 800-61', severity: 'Medium',
    evidence: `Average MTTD ${securityMetrics.mttdMinutes} minutes vs benchmark 30 minutes.`,
    recommendation: 'Tune SIEM correlation rules and implement automated alert triage.',
  },
]

const RECOMMENDATIONS = [
  { id: 'REC-001', priority: 'P1 — Critical', area: 'Vulnerability Management', text: 'Implement automated patching pipeline for Tier 0 and Tier 1 assets with SLA enforcement. Target: reduce SLA breach rate by 50% within 30 days.', days: 30 },
  { id: 'REC-002', priority: 'P1 — Critical', area: 'Compliance', text: 'Remediate PCI-DSS Vulnerability Management controls to reach 90% target. Engage QSA for guidance on compensating controls.', days: 45 },
  { id: 'REC-003', priority: 'P2 — High', area: 'Incident Response', text: 'Update all IR playbooks to current threat landscape. Schedule quarterly tabletop exercises. Hire additional SOC Tier 2 analyst.', days: 60 },
  { id: 'REC-004', priority: 'P2 — High', area: 'Data Protection', text: 'Complete DLP deployment across all identified data stores. Implement CASB for cloud data movement monitoring.', days: 60 },
  { id: 'REC-005', priority: 'P2 — High', area: 'Threat Intelligence', text: 'Subscribe to financial sector ISAC threat feeds. Integrate threat intelligence with SIEM for automated IOC blocking.', days: 45 },
  { id: 'REC-006', priority: 'P3 — Medium', area: 'SIEM / Detection', text: 'Tune SIEM rules to reduce false positive rate below 5%. Implement SOAR platform for automated first-level response.', days: 90 },
  { id: 'REC-007', priority: 'P3 — Medium', area: 'Third-Party Risk', text: 'Conduct security assessments for all Tier 1 vendors with overdue reviews. Implement continuous monitoring for critical vendors.', days: 90 },
  { id: 'REC-008', priority: 'P3 — Medium', area: 'Identity & Access', text: 'Implement privileged access management (PAM) solution for all administrative accounts on Tier 0 assets.', days: 90 },
]

// ISO 27001:2022 ↔ NIST CSF 2.0 ↔ PCI-DSS v4 ↔ SOC 2 crosswalk
const ISO_CROSSWALK = [
  { nistFn: 'Govern',   nistScore: 72, iso: 'A.5.1',   isoDomain: 'Policies for Information Security',     isoStatus: 'partial',   pci: 'Req 12.1',   soc2: 'CC1.1' },
  { nistFn: 'Identify', nistScore: 81, iso: 'A.8.8',   isoDomain: 'Management of Technical Vulnerabilities', isoStatus: 'compliant', pci: 'Req 6.3',    soc2: 'CC3.1' },
  { nistFn: 'Protect',  nistScore: 68, iso: 'A.8.9',   isoDomain: 'Configuration Management',             isoStatus: 'partial',   pci: 'Req 2.2',    soc2: 'CC6.6' },
  { nistFn: 'Detect',   nistScore: 74, iso: 'A.8.16',  isoDomain: 'Monitoring Activities',                isoStatus: 'partial',   pci: 'Req 10.4',   soc2: 'CC7.2' },
  { nistFn: 'Respond',  nistScore: 61, iso: 'A.5.26',  isoDomain: 'Response to Information Security Incidents', isoStatus: 'partial', pci: 'Req 12.10', soc2: 'CC7.3' },
  { nistFn: 'Recover',  nistScore: 55, iso: 'A.5.29',  isoDomain: 'Information Security in Business Continuity', isoStatus: 'gap',  pci: 'Req 12.10.1', soc2: 'A1.3' },
]

const targetDate = (days: number) => {
  const d = new Date('2026-05-20')
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Risk Heatmap Component ────────────────────────────────────────────────────
function RiskHeatmap() {
  const [selected, setSelected] = useState<{ l: number; i: number } | null>(null)

  const getCellCount = (l: number, i: number) => {
    const cell = HEATMAP_RISKS.find(r => r.likelihood === l && r.impact === i)
    return cell?.count ?? 0
  }

  const getCellRisks = (l: number, i: number) => {
    return HEATMAP_RISKS.filter(r => r.likelihood === l && r.impact === i)
  }

  return (
    <div>
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] text-slate-600 uppercase tracking-wider">Impact →</span>
          </div>
          <div className="relative">
            {/* Y-axis label */}
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-slate-600 uppercase tracking-wider whitespace-nowrap">Likelihood →</div>
            <div className="grid gap-1" style={{ gridTemplateColumns: 'auto repeat(5, 1fr)', gridTemplateRows: 'repeat(5, 1fr)' }}>
              {[5, 4, 3, 2, 1].map(l => (
                [0, 1, 2, 3, 4, 5].map((col) => {
                  if (col === 0) return (
                    <div key={`lbl-${l}`} className="flex items-center justify-end pr-2">
                      <span className="text-[9px] text-slate-600">{l}</span>
                    </div>
                  )
                  const i = col
                  const count = getCellCount(l, i)
                  const color = HEATMAP_COLOR(l, i)
                  const isSelected = selected?.l === l && selected?.i === i
                  return (
                    <div key={`${l}-${i}`}
                      className={`h-12 rounded flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'ring-2 ring-white/30' : ''}`}
                      style={{ background: count > 0 ? color : 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                      onClick={() => setSelected(isSelected ? null : { l, i })}
                    >
                      {count > 0 && <span className="text-white font-bold text-sm">{count}</span>}
                    </div>
                  )
                })
              ))}
              {/* X-axis labels */}
              <div />
              {[1, 2, 3, 4, 5].map(i => (
                <div key={`xl-${i}`} className="text-center">
                  <span className="text-[9px] text-slate-600">{i}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="w-32 space-y-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Legend</p>
          {[
            { color: 'rgba(239,68,68,0.8)', label: 'Critical (20-25)' },
            { color: 'rgba(239,68,68,0.5)', label: 'High (15-19)' },
            { color: 'rgba(245,158,11,0.7)', label: 'Medium (9-14)' },
            { color: 'rgba(245,158,11,0.4)', label: 'Low (6-8)' },
            { color: 'rgba(59,130,246,0.4)', label: 'Minor (3-5)' },
            { color: 'rgba(16,185,129,0.3)', label: 'Minimal (1-2)' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm shrink-0" style={{ background: item.color }} />
              <span className="text-[9px] text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="mt-3 rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[10px] text-slate-500 mb-2">Risks at L{selected.l}/I{selected.i}</p>
          {getCellRisks(selected.l, selected.i).map((r, i) => (
            <p key={i} className="text-slate-300 text-xs py-1 border-b border-white/[0.03] last:border-0">{r.label}</p>
          ))}
          {getCellRisks(selected.l, selected.i).length === 0 && (
            <p className="text-slate-600 text-xs">No risks in this cell.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Reports Page ─────────────────────────────────────────────────────────
export default function Reports() {
  const [activeTab, setActiveTab] = useState<'risk' | 'audit'>('risk')
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [assetScope, setAssetScope] = useState<AssetScope>('all')
  const [lastGenerated, setLastGenerated] = useState<string>(new Date().toISOString())
  const [workflow, setWorkflow] = useState<WorkflowState>(loadWorkflow)
  const [confirmingAdvance, setConfirmingAdvance] = useState(false)

  const { items: threatItems, sources: threatSources } = useThreatFeeds()
  const { incidents: incidentData } = useIncidentIntegrations()
  const { openFindings } = useVAReports()

  const vulnStats = useMemo(() => ({
    total: vulnerabilities.length,
    critical: vulnerabilities.filter(v => v.effectivePriority === 'critical').length,
    high: vulnerabilities.filter(v => v.effectivePriority === 'high').length,
    medium: vulnerabilities.filter(v => v.effectivePriority === 'medium').length,
    low: vulnerabilities.filter(v => v.effectivePriority === 'low').length,
    slaBreached: vulnerabilities.filter(v => v.slaBreached).length,
    exploitable: vulnerabilities.filter(v => v.exploitAvailable).length,
  }), [])

  const incidentStats = useMemo(() => {
    const allInc = [...incidents, ...incidentData]
    const resolved = allInc.filter(i => (i as { phase?: string; status?: string }).phase === 'resolved' || (i as { phase?: string; status?: string }).status === 'resolved')
    return {
      total: allInc.length,
      open: allInc.filter(i => (i as { phase?: string; status?: string }).phase !== 'resolved' && (i as { phase?: string; status?: string }).status !== 'resolved').length,
      siemOffenses: siemOffenses.length,
      criticalOffenses: siemOffenses.filter(o => o.severity === 'critical').length,
      mttd: securityMetrics.mttdMinutes,
      mttr: securityMetrics.mttrMinutes,
      resolved: resolved.length,
    }
  }, [incidentData])

  const execSummary = useMemo(() => {
    const trendDir = securityMetrics.aleeTrend < 0 ? 'decreased' : 'increased'
    return `SecureBank's overall security posture score is ${securityMetrics.postureScore}/100, reflecting a composite measurement of compliance adherence, SLA performance, and CVE exposure. The Annualized Loss Expectancy (ALE) has ${trendDir} by ${Math.abs(securityMetrics.aleeTrend)}% year-over-year to $4.2M USD. Critical vulnerabilities requiring immediate attention number ${vulnStats.critical}, with ${vulnStats.slaBreached} SLA breaches across the vulnerability portfolio. Primary areas of concern include PCI-DSS Vulnerability Management (64% vs 90% target) and NIST CSF Recover function (55% vs 80% target). Immediate action is required on ${CRITICAL_FINDINGS.filter(f => f.severity === 'Critical').length} critical audit findings.`
  }, [vulnStats])

  const advanceWorkflow = () => {
    const idx = STAGE_ORDER.indexOf(workflow.currentStage)
    if (idx >= STAGE_ORDER.length - 1) return
    const next = STAGE_ORDER[idx + 1]
    const updated: WorkflowState = {
      currentStage: next,
      timestamps: { ...workflow.timestamps, [next]: new Date().toISOString() },
    }
    setWorkflow(updated)
    saveWorkflow(updated)
    setConfirmingAdvance(false)
  }

  const revertWorkflow = () => {
    const idx = STAGE_ORDER.indexOf(workflow.currentStage)
    if (idx <= 0) return
    const prev = STAGE_ORDER[idx - 1]
    const ts = { ...workflow.timestamps }
    delete ts[workflow.currentStage]
    const updated: WorkflowState = { currentStage: prev, timestamps: ts }
    setWorkflow(updated)
    saveWorkflow(updated)
  }

  // Connected integrations
  const connectedIntegrations = useMemo(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('ciso_integration_configs') ?? '{}')
      return Object.entries(stored)
        .filter(([, v]) => (v as { status: string }).status === 'connected')
        .map(([k]) => k)
    } catch { return [] }
  }, [])

  return (
    <div className="min-h-screen" style={{ background: '#0a0f1e' }}>
      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 16mm 14mm; }

          body { background: #ffffff !important; }
          nav, aside, header { display: none !important; }
          .no-print { display: none !important; }

          /* Section page breaks */
          .print-section { page-break-before: always; break-before: page; }
          .print-section:first-of-type { page-break-before: avoid; }

          /* Cards */
          .glass-card {
            background: #f9fafb !important;
            border: 1px solid #e5e7eb !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
          }

          /* Text color overrides — only prose/label text, not colored indicators */
          .text-slate-100, .text-slate-200 { color: #111827 !important; }
          .text-slate-300, .text-slate-400 { color: #374151 !important; }
          .text-slate-500, .text-slate-600, .text-slate-700 { color: #6b7280 !important; }

          /* Status/severity badges — keep color, improve contrast */
          [style*="background: rgba(239,68,68"], [style*="background: rgba(239, 68, 68"] { border: 1px solid #fca5a5 !important; }
          [style*="background: rgba(245,158,11"], [style*="background: rgba(245, 158, 11"] { border: 1px solid #fcd34d !important; }
          [style*="background: rgba(16,185,129"], [style*="background: rgba(16, 185, 129"] { border: 1px solid #6ee7b7 !important; }
          [style*="background: rgba(99,102,241"], [style*="background: rgba(99, 102, 241"] { border: 1px solid #a5b4fc !important; }

          /* Chart containers — prevent overflow clipping */
          .recharts-wrapper, .recharts-responsive-container { overflow: visible !important; }

          /* Avoid orphaned table rows */
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }

          /* Print header bar (hidden on screen, shown on print) */
          .print-doc-header { display: flex !important; }
        }

        .print-doc-header { display: none; }
      `}</style>

      {/* Print-only document header */}
      <div className="print-doc-header items-center justify-between px-0 pb-4 mb-2 border-b border-gray-300">
        <div>
          <p className="font-bold text-base text-gray-900">SecureBank Financial Group</p>
          <p className="text-xs text-gray-500 mt-0.5">CISO Command Center — Security Report</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-700">CONFIDENTIAL</p>
          <p className="text-xs text-gray-500">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Page header */}
      <div className="no-print sticky top-0 z-40 border-b border-white/[0.06] px-6 py-3 flex items-center gap-3" style={{ background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(20px)' }}>
        <FileText size={14} className="text-indigo-400" />
        <span className="text-slate-300 text-xs font-semibold">Reports</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setLastGenerated(new Date().toISOString())}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/20 transition-all">
            <RefreshCw size={12} />
            Generate Report
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
            <Printer size={12} />
            Export PDF
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">

        {/* Controls Bar */}
        <div className="no-print glass-card rounded-xl px-5 py-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs">Date Range:</span>
            {(['7d', '30d', '90d'] as DateRange[]).map(r => (
              <button key={r} onClick={() => setDateRange(r)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${dateRange === r ? 'text-indigo-300 bg-indigo-500/20 border border-indigo-500/30' : 'text-slate-600 hover:text-slate-400 border border-transparent'}`}>
                Last {r}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs">Asset Scope:</span>
            <select className="px-2 py-0.5 rounded text-xs text-slate-300 bg-white/5 border border-white/10 focus:outline-none" value={assetScope} onChange={e => setAssetScope(e.target.value as AssetScope)}>
              <option value="all">All Tiers</option>
              <option value="T0">T0 Only</option>
              <option value="T0T1">T0 + T1</option>
            </select>
          </div>
          <span className="ml-auto text-[10px] text-slate-600">Generated: {new Date(lastGenerated).toLocaleString()}</span>
        </div>

        {/* Tabs */}
        <div className="no-print flex gap-2">
          {(['risk', 'audit'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${activeTab === tab ? 'text-indigo-300 bg-indigo-500/20 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}>
              {tab === 'risk' ? 'Risk Report' : 'Audit Report'}
            </button>
          ))}
        </div>

        {/* ── RISK REPORT ── */}
        {activeTab === 'risk' && (
          <div className="space-y-6">

            {/* 1. Executive Summary */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-5 rounded-full bg-indigo-500" />
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">Executive Summary</h2>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{execSummary}</p>
              <div className="grid grid-cols-4 gap-4 mt-4">
                {[
                  { label: 'Posture Score', value: `${securityMetrics.postureScore}/100`, color: '#10b981' },
                  { label: 'ALE (USD)', value: '$4.2M', color: '#f59e0b' },
                  { label: 'Critical CVEs', value: vulnStats.critical.toLocaleString(), color: '#ef4444' },
                  { label: 'Compliance Avg', value: `${Math.round(complianceControls.reduce((a, b) => a + b.score, 0) / complianceControls.length)}%`, color: '#818cf8' },
                ].map(item => (
                  <div key={item.label} className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1">{item.label}</p>
                    <p className="text-xl font-bold" style={{ color: item.color }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Financial Exposure */}
            <div className="glass-card rounded-xl p-6 print-section">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-5 rounded-full bg-amber-500" />
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">Financial Exposure (FAIR ALE)</h2>
              </div>
              <div className="grid grid-cols-4 gap-4 mb-4">
                {[
                  { label: 'Total ALE (USD)', value: '$4.2M' },
                  { label: 'Total ALE (NPR)', value: 'NPR 556.8Cr' },
                  { label: 'T0/T1 Exposure', value: '$2.8M' },
                  { label: 'T2/T3 Exposure', value: '$1.4M' },
                ].map(item => (
                  <div key={item.label} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1">{item.label}</p>
                    <p className="text-lg font-bold text-amber-400">{item.value}</p>
                  </div>
                ))}
              </div>
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ALE_TREND} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="aleGradRpt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} domain={[3, 7]} />
                    <Tooltip contentStyle={{ background: '#0d1324', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 10 }} formatter={(v) => [`$${v}M`, 'ALE']} />
                    <Area type="monotone" dataKey="aleM" stroke="#f59e0b" strokeWidth={2} fill="url(#aleGradRpt)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. Risk Heatmap */}
            <div className="glass-card rounded-xl p-6 print-section">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-5 rounded-full bg-red-500" />
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">Risk Heatmap (5×5)</h2>
              </div>
              <div className="pl-10">
                <RiskHeatmap />
              </div>
            </div>

            {/* 4. Top 10 Risks */}
            <div className="glass-card rounded-xl overflow-hidden print-section">
              <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
                <div className="w-1 h-5 rounded-full bg-orange-500" />
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">Top 10 Risks</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                      {['Rank', 'Risk Title', 'Category', 'L', 'I', 'Inherent', 'Residual', 'Treatment', 'Owner'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-[9px] text-slate-600 font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TOP_RISKS.map(r => (
                      <tr key={r.rank} className="border-t border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 py-2.5 text-slate-400 font-bold">#{r.rank}</td>
                        <td className="px-3 py-2.5 text-slate-300 max-w-[200px]"><p className="truncate">{r.title}</p></td>
                        <td className="px-3 py-2.5"><span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: r.category === 'Cyber' ? 'rgba(239,68,68,0.15)' : r.category === 'Compliance' ? 'rgba(99,102,241,0.15)' : 'rgba(245,158,11,0.15)', color: r.category === 'Cyber' ? '#ef4444' : r.category === 'Compliance' ? '#818cf8' : '#f59e0b' }}>{r.category}</span></td>
                        <td className="px-3 py-2.5 text-slate-400 tabular-nums">{r.likelihood}</td>
                        <td className="px-3 py-2.5 text-slate-400 tabular-nums">{r.impact}</td>
                        <td className="px-3 py-2.5 font-bold tabular-nums" style={{ color: RISK_SCORE_COLOR(r.inherent) }}>{r.inherent}</td>
                        <td className="px-3 py-2.5 font-bold tabular-nums" style={{ color: RISK_SCORE_COLOR(r.residual) }}>{r.residual}</td>
                        <td className="px-3 py-2.5"><span className="text-[9px] px-1.5 py-0.5 rounded text-slate-400" style={{ background: 'rgba(255,255,255,0.05)' }}>{r.treatment}</span></td>
                        <td className="px-3 py-2.5 text-slate-500 text-[9px] font-mono">{r.owner}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. Control Effectiveness */}
            <div className="glass-card rounded-xl p-6 print-section">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-5 rounded-full bg-indigo-500" />
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">Control Effectiveness by Framework</h2>
              </div>
              <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={frameworkEffectiveness} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="framework" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                    <Tooltip contentStyle={{ background: '#0d1324', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 10 }} formatter={(v) => [`${v}%`, 'Effectiveness']} />
                    <Bar dataKey="pct" fill="#6366f1" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 6. Connected Data Sources */}
            <div className="glass-card rounded-xl overflow-hidden print-section">
              <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
                <div className="w-1 h-5 rounded-full bg-emerald-500" />
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">Connected Data Sources</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                      {['Integration', 'Status', 'Last Sync', 'Records'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[9px] text-slate-600 font-medium uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'Mock VA Scanner', status: 'connected', sync: 'Real-time', records: `${vulnerabilities.length.toLocaleString()} CVEs` },
                      { name: 'SIEM (Mock)', status: connectedIntegrations.includes('int-1') || connectedIntegrations.includes('int-2') ? 'connected' : 'mock', sync: 'Real-time', records: `${siemOffenses.length} offenses` },
                      { name: 'Threat Feeds', status: 'connected', sync: 'On-demand', records: `${threatItems.length} IOCs from ${threatSources.filter(s => s.enabled).length} sources` },
                      { name: 'Incident Management', status: 'local', sync: 'On-demand', records: `${incidentData.length} imported` },
                      { name: 'VA Reports (Imported)', status: 'connected', sync: 'Manual', records: `${openFindings.length} findings` },
                    ].map(row => (
                      <tr key={row.name} className="border-t border-white/[0.03]">
                        <td className="px-4 py-2.5 text-slate-300">{row.name}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: row.status === 'connected' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: row.status === 'connected' ? '#10b981' : '#f59e0b' }}>{row.status}</span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">{row.sync}</td>
                        <td className="px-4 py-2.5 text-slate-400">{row.records}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── AUDIT REPORT ── */}
        {activeTab === 'audit' && (
          <div className="space-y-6">

            {/* 1. Audit Scope */}
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-5 rounded-full bg-indigo-500" />
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">Audit Scope & Methodology</h2>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Audit Period</p>
                    <p className="text-slate-300 text-sm">January 1, 2026 — May 20, 2026 (140 days)</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Frameworks Assessed</p>
                    <p className="text-slate-300 text-sm">NIST CSF 2.0, SOC 2 Type II, PCI DSS v4.0</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Methodology</p>
                    <p className="text-slate-400 text-xs leading-relaxed">Combined automated continuous monitoring via SIEM, vulnerability scanners, and EDR tools with manual control testing. Evidence gathered from 5 integrated security platforms.</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Systems in Scope</p>
                  <div className="space-y-1.5">
                    {[
                      'Core Banking Platform (Temenos T24)',
                      'Payment Gateway & Settlement Engine',
                      'Customer Identity Platform (Okta)',
                      'API Gateway & Mobile Backend',
                      'Cloud Infrastructure (AWS)',
                      'SIEM & Security Operations Platform',
                    ].map((sys, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        <p className="text-slate-400 text-xs">{sys}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Compliance Status Summary */}
            <div className="glass-card rounded-xl overflow-hidden print-section">
              <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
                <div className="w-1 h-5 rounded-full bg-blue-500" />
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">Compliance Status Summary</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                      {['Framework', 'Control Domain', 'Total', 'Passed', 'Failed', 'Not Assessed', 'Score'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-[9px] text-slate-600 font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPLIANCE_STATUS.map((row, i) => (
                      <tr key={i} className="border-t border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 py-2.5"><span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>{row.framework}</span></td>
                        <td className="px-3 py-2.5 text-slate-300">{row.domain}</td>
                        <td className="px-3 py-2.5 text-slate-400 tabular-nums">{row.total}</td>
                        <td className="px-3 py-2.5 text-emerald-400 tabular-nums font-semibold">{row.passed}</td>
                        <td className="px-3 py-2.5 text-red-400 tabular-nums font-semibold">{row.failed}</td>
                        <td className="px-3 py-2.5 text-slate-500 tabular-nums">{row.notAssessed}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                              <div className="h-1.5 rounded-full" style={{ width: `${row.score}%`, background: row.score >= 80 ? '#10b981' : row.score >= 60 ? '#f59e0b' : '#ef4444' }} />
                            </div>
                            <span className="text-xs font-bold tabular-nums" style={{ color: row.score >= 80 ? '#10b981' : row.score >= 60 ? '#f59e0b' : '#ef4444' }}>{row.score}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Critical Findings */}
            <div className="glass-card rounded-xl p-6 print-section">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-5 rounded-full bg-red-500" />
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">Critical Findings</h2>
              </div>
              <div className="space-y-4">
                {CRITICAL_FINDINGS.map((finding, i) => (
                  <div key={finding.id} className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 text-sm font-bold">{i + 1}.</span>
                        <p className="text-slate-200 text-sm font-semibold">{finding.title}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: finding.severity === 'Critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)', color: finding.severity === 'Critical' ? '#ef4444' : '#f59e0b' }}>{finding.severity}</span>
                        <span className="text-[9px] text-slate-600 font-mono">{finding.frameworkRef}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Evidence</p>
                        <p className="text-slate-400 leading-relaxed">{finding.evidence}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Recommendation</p>
                        <p className="text-slate-400 leading-relaxed">{finding.recommendation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Vulnerability Assessment Summary */}
            <div className="glass-card rounded-xl overflow-hidden print-section">
              <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
                <div className="w-1 h-5 rounded-full bg-amber-500" />
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">Vulnerability Assessment Summary</h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Total CVEs', value: vulnStats.total.toLocaleString(), color: '#e2e8f0' },
                    { label: 'Critical', value: vulnStats.critical.toLocaleString(), color: '#ef4444' },
                    { label: 'SLA Breached', value: vulnStats.slaBreached.toLocaleString(), color: '#f59e0b' },
                    { label: 'Exploitable', value: vulnStats.exploitable.toLocaleString(), color: '#818cf8' },
                  ].map(item => (
                    <div key={item.label} className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1">{item.label}</p>
                      <p className="text-2xl font-bold tabular-nums" style={{ color: item.color }}>{item.value}</p>
                    </div>
                  ))}
                </div>
                {openFindings.length > 0 && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">VA Scanner Findings ({openFindings.length} open)</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                            {['CVE', 'Title', 'Severity', 'Host', 'CVSS'].map(h => <th key={h} className="px-3 py-2 text-left text-[9px] text-slate-600 font-medium uppercase tracking-wider">{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {openFindings.slice(0, 10).map(f => (
                            <tr key={f.id} className="border-t border-white/[0.03]">
                              <td className="px-3 py-2 font-mono text-indigo-400 text-[9px]">{f.cveId ?? '—'}</td>
                              <td className="px-3 py-2 text-slate-300 max-w-[200px]"><p className="truncate">{f.title}</p></td>
                              <td className="px-3 py-2"><span className="text-[9px] capitalize font-bold px-1.5 py-0.5 rounded" style={{ background: `rgba(239,68,68,0.15)`, color: '#ef4444' }}>{f.severity}</span></td>
                              <td className="px-3 py-2 font-mono text-slate-500 text-[9px]">{f.affectedHost}</td>
                              <td className="px-3 py-2 text-slate-400 tabular-nums">{f.cvssScore.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 5. SIEM & Incident Summary */}
            <div className="glass-card rounded-xl p-6 print-section">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-5 rounded-full bg-red-500" />
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">SIEM & Incident Summary</h2>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total SIEM Offenses', value: incidentStats.siemOffenses },
                  { label: 'Critical Offenses', value: incidentStats.criticalOffenses },
                  { label: 'Total Incidents', value: incidentStats.total },
                  { label: 'Open Incidents', value: incidentStats.open },
                  { label: 'Avg MTTD', value: `${incidentStats.mttd}m` },
                  { label: 'Avg MTTR', value: `${incidentStats.mttr}m` },
                ].map(item => (
                  <div key={item.label} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1">{item.label}</p>
                    <p className="text-xl font-bold text-slate-200 tabular-nums">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. Threat Intelligence Summary */}
            <div className="glass-card rounded-xl p-6 print-section">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-5 rounded-full bg-purple-500" />
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">Threat Intelligence Summary</h2>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Total IOCs', value: threatItems.length },
                  { label: 'Critical IOCs', value: threatItems.filter(i => i.severity === 'critical').length },
                  { label: 'CVE Indicators', value: threatItems.filter(i => i.iocType === 'CVE').length },
                  { label: 'Active Feeds', value: threatSources.filter(s => s.enabled).length },
                ].map(item => (
                  <div key={item.label} className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-1">{item.label}</p>
                    <p className="text-2xl font-bold text-slate-200 tabular-nums">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 7. Recommendations */}
            <div className="glass-card rounded-xl p-6 print-section">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-5 rounded-full bg-emerald-500" />
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">Recommendations</h2>
              </div>
              <div className="space-y-3">
                {RECOMMENDATIONS.map(rec => (
                  <div key={rec.id} className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 text-xs font-mono">{rec.id}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: rec.priority.includes('P1') ? 'rgba(239,68,68,0.2)' : rec.priority.includes('P2') ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)', color: rec.priority.includes('P1') ? '#ef4444' : rec.priority.includes('P2') ? '#f59e0b' : '#3b82f6' }}>{rec.priority}</span>
                        <span className="text-[9px] text-slate-500">{rec.area}</span>
                      </div>
                      <span className="text-[10px] text-slate-600 shrink-0">Target: {targetDate(rec.days)}</span>
                    </div>
                    <p className="text-slate-400 text-xs leading-relaxed">{rec.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 8. ISO 27001 Framework Crosswalk */}
            <div className="glass-card rounded-xl overflow-hidden print-section">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-5 rounded-full bg-amber-500" />
                  <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">ISO 27001:2022 Framework Crosswalk</h2>
                </div>
                <div className="flex gap-2">
                  {[{ label: 'Compliant', color: '#10b981' }, { label: 'Partial', color: '#f59e0b' }, { label: 'Gap', color: '#ef4444' }].map(s => (
                    <span key={s.label} className="text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1" style={{ background: `${s.color}20`, color: s.color, border: `1px solid ${s.color}40` }}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: s.color }} />
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                      {['NIST CSF 2.0 Function', 'Score', 'ISO 27001:2022 Control', 'ISO Domain', 'ISO Status', 'PCI-DSS v4', 'SOC 2 TSC'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-[9px] text-slate-600 font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ISO_CROSSWALK.map(row => {
                      const scoreColor = row.nistScore >= 70 ? '#10b981' : row.nistScore >= 50 ? '#f59e0b' : '#ef4444'
                      const statusColor = row.isoStatus === 'compliant' ? '#10b981' : row.isoStatus === 'partial' ? '#f59e0b' : '#ef4444'
                      return (
                        <tr key={row.nistFn} className="border-t border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                          <td className="px-3 py-3">
                            <span className="text-[9px] font-bold px-2 py-1 rounded" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>{row.nistFn}</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                <div className="h-1.5 rounded-full" style={{ width: `${row.nistScore}%`, background: scoreColor }} />
                              </div>
                              <span className="text-[10px] font-bold tabular-nums" style={{ color: scoreColor }}>{row.nistScore}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 font-mono text-amber-400 text-[10px] font-semibold">{row.iso}</td>
                          <td className="px-3 py-3 text-slate-400 max-w-[200px]"><p className="truncate">{row.isoDomain}</p></td>
                          <td className="px-3 py-3">
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded capitalize" style={{ background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}40` }}>{row.isoStatus}</span>
                          </td>
                          <td className="px-3 py-3 font-mono text-slate-400 text-[10px]">{row.pci}</td>
                          <td className="px-3 py-3 font-mono text-slate-400 text-[10px]">{row.soc2}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-white/5" style={{ background: 'rgba(255,255,255,0.01)' }}>
                <p className="text-[9px] text-slate-600 leading-relaxed">
                  Crosswalk maps NIST CSF 2.0 core functions to their primary ISO 27001:2022 Annex A control, equivalent PCI-DSS v4.0 requirement, and SOC 2 TSC criterion.
                  ISO status reflects assessment against ISO 27001:2022 Annex A controls during the current audit period.
                </p>
              </div>
            </div>

            {/* 9. Audit Sign-off Workflow */}
            <div className="glass-card rounded-xl p-6 print-section">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-5 rounded-full bg-emerald-500" />
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">Audit Sign-off Workflow</h2>
                <span className="ml-auto text-[9px] text-slate-600">
                  Audit Period: Jan 1 – May 20, 2026
                </span>
              </div>

              {/* Stage pipeline */}
              <div className="flex items-center gap-0 mb-8">
                {STAGES.map((stage, i) => {
                  const stageIdx = STAGE_ORDER.indexOf(stage.id)
                  const currentIdx = STAGE_ORDER.indexOf(workflow.currentStage)
                  const isPast = stageIdx < currentIdx
                  const isCurrent = stageIdx === currentIdx
                  const isFuture = stageIdx > currentIdx
                  return (
                    <div key={stage.id} className="flex items-center flex-1 min-w-0">
                      <div className="flex flex-col items-center flex-shrink-0">
                        {/* Circle */}
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                          style={{
                            background: isPast ? `${stage.color}30` : isCurrent ? stage.color : 'rgba(255,255,255,0.04)',
                            border: `2px solid ${isPast || isCurrent ? stage.color : 'rgba(255,255,255,0.1)'}`,
                            color: isPast || isCurrent ? (isCurrent ? '#fff' : stage.color) : '#475569',
                            boxShadow: isCurrent ? `0 0 16px ${stage.color}40` : 'none',
                          }}
                        >
                          {isPast ? '✓' : i + 1}
                        </div>
                        <p className="text-[9px] font-semibold mt-1.5 text-center whitespace-nowrap" style={{ color: isFuture ? '#475569' : stage.color }}>
                          {stage.label}
                        </p>
                        <p className="text-[8px] text-slate-700 mt-0.5 text-center max-w-[80px] leading-tight">
                          {stage.actor}
                        </p>
                        {workflow.timestamps[stage.id] && (
                          <p className="text-[8px] text-slate-700 mt-0.5 text-center">
                            {new Date(workflow.timestamps[stage.id]!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                      {/* Connector */}
                      {i < STAGES.length - 1 && (
                        <div
                          className="flex-1 h-0.5 mx-2 rounded-full transition-all"
                          style={{ background: isPast ? `${stage.color}60` : 'rgba(255,255,255,0.06)' }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Current stage details */}
              {(() => {
                const currentStage = STAGES.find(s => s.id === workflow.currentStage)!
                const isComplete = workflow.currentStage === 'board_approved'
                return (
                  <div className="rounded-xl p-5" style={{ background: `${currentStage.color}08`, border: `1px solid ${currentStage.color}25` }}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full" style={{ background: currentStage.color }} />
                          <p className="text-sm font-semibold" style={{ color: currentStage.color }}>
                            {isComplete ? 'Audit Complete' : `Current Stage: ${currentStage.label}`}
                          </p>
                        </div>
                        <p className="text-slate-400 text-xs leading-relaxed max-w-lg">{currentStage.desc}</p>
                        {workflow.timestamps[workflow.currentStage] && (
                          <p className="text-[10px] text-slate-600 mt-2">
                            Entered: {new Date(workflow.timestamps[workflow.currentStage]!).toLocaleString()}
                          </p>
                        )}
                        {isComplete && (
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-[10px] px-2 py-1 rounded-lg font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/25">
                              ✓ Audit Signed Off — Archived
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Action */}
                      {!isComplete && (
                        <div className="flex flex-col items-end gap-2">
                          {!confirmingAdvance ? (
                            <button
                              onClick={() => setConfirmingAdvance(true)}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                              style={{ background: `${currentStage.color}20`, border: `1px solid ${currentStage.color}40`, color: currentStage.color }}
                            >
                              {currentStage.action} →
                            </button>
                          ) : (
                            <div className="flex flex-col items-end gap-2 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                              <p className="text-[10px] text-slate-400">Confirm advancement to <span className="font-semibold text-slate-200">{STAGES[STAGE_ORDER.indexOf(workflow.currentStage) + 1]?.label}</span>?</p>
                              <div className="flex gap-2">
                                <button onClick={() => setConfirmingAdvance(false)} className="px-3 py-1 rounded text-[10px] text-slate-500 hover:text-slate-300 border border-white/10 transition-colors">
                                  Cancel
                                </button>
                                <button
                                  onClick={advanceWorkflow}
                                  className="px-3 py-1 rounded text-[10px] font-bold transition-all"
                                  style={{ background: `${currentStage.color}25`, border: `1px solid ${currentStage.color}50`, color: currentStage.color }}
                                >
                                  Confirm
                                </button>
                              </div>
                            </div>
                          )}
                          {STAGE_ORDER.indexOf(workflow.currentStage) > 0 && !confirmingAdvance && (
                            <button onClick={revertWorkflow} className="text-[9px] text-slate-700 hover:text-slate-500 transition-colors">
                              ← Revert to previous stage
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Sign-off log */}
              {Object.keys(workflow.timestamps).length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">Audit Trail</p>
                  <div className="space-y-1.5">
                    {STAGES.filter(s => workflow.timestamps[s.id]).map(s => (
                      <div key={s.id} className="flex items-center gap-3 text-[10px]">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <span className="font-medium" style={{ color: s.color }}>{s.label}</span>
                        <span className="text-slate-600">{s.actor}</span>
                        <span className="text-slate-700 ml-auto font-mono">{new Date(workflow.timestamps[s.id]!).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
