import { useMemo, useState, useRef } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { integrations } from '../data/integrationsMockData'
import type { IntegrationCategory } from '../data/integrationsMockData'
import { useIntegrationConfigs } from '../hooks/useIntegrationConfigs'
import { useVAReports, generateDemoReport, parseVAReportJSON } from '../hooks/useVAReports'
import { useIncidentIntegrations } from '../hooks/useIncidentIntegrations'
import type { Severity } from '../types/security'
import type { ServiceNowConfig, OpsgenieConfig } from '../types/incidentIntegration'
import { ChevronDown, ChevronUp, Upload, X, RefreshCw, AlertCircle } from 'lucide-react'

const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  SIEM: 'SIEM',
  VULN_SCANNER: 'Vuln Scanner',
  EDR: 'EDR',
  APPSEC: 'AppSec',
}

type ConfigStatus = 'untested' | 'connected' | 'failed' | 'testing'

const STATUS_STYLES: Record<ConfigStatus | 'connected_mock' | 'degraded' | 'disconnected' | 'syncing', { color: string; bg: string; border: string; label: string }> = {
  connected: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', label: 'Connected' },
  connected_mock: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', label: 'Connected' },
  degraded: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', label: 'Degraded' },
  disconnected: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', label: 'Disconnected' },
  syncing: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', label: 'Syncing' },
  untested: { color: '#94a3b8', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)', label: 'Not Configured' },
  failed: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', label: 'Failed' },
  testing: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', label: 'Testing...' },
}

const VENDOR_COLORS: Record<string, string> = {
  Splunk: '#ef4444',
  Microsoft: '#3b82f6',
  Qualys: '#f59e0b',
  Wiz: '#6366f1',
  CrowdStrike: '#ef4444',
  SentinelOne: '#8b5cf6',
  Snyk: '#10b981',
  GitHub: '#64748b',
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function fmtNum(n: number): string {
  return n.toLocaleString()
}

function makeSparkline(seed: number): { v: number }[] {
  let s = seed
  const next = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
  return Array.from({ length: 12 }, () => ({ v: Math.round(next() * 1000) }))
}

const CATEGORIES: IntegrationCategory[] = ['SIEM', 'VULN_SCANNER', 'EDR', 'APPSEC']

const HEALTH_ERRORS = [
  {
    id: 'err-1',
    integrationName: 'Splunk Enterprise',
    vendor: 'Splunk',
    error: 'Connection timeout after 30s — host unreachable (ECONNREFUSED)',
    code: 'ECONNREFUSED',
    timestamp: '2026-05-21T07:43:12Z',
    retryCount: 3,
  },
  {
    id: 'err-2',
    integrationName: 'QRadar SIEM',
    vendor: 'IBM',
    error: 'Authentication failed — SEC token expired or invalid (HTTP 401)',
    code: 'AUTH_FAILED',
    timestamp: '2026-05-21T06:15:45Z',
    retryCount: 1,
  },
  {
    id: 'err-3',
    integrationName: 'CrowdStrike Falcon',
    vendor: 'CrowdStrike',
    error: 'Rate limit exceeded — retry window: 60s (HTTP 429)',
    code: 'RATE_LIMITED',
    timestamp: '2026-05-21T05:52:30Z',
    retryCount: 0,
  },
]

function IntegrationHealthLog() {
  const [retrying, setRetrying] = useState<Record<string, 'idle' | 'retrying' | 'failed'>>({})

  const handleRetry = (id: string) => {
    setRetrying(r => ({ ...r, [id]: 'retrying' }))
    setTimeout(() => setRetrying(r => ({ ...r, [id]: 'failed' })), 2000)
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06]">
        <AlertCircle size={14} className="text-red-400" />
        <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Integration Health — Recent Errors</p>
        <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/25">
          {HEALTH_ERRORS.length} errors
        </span>
      </div>
      <div className="divide-y divide-white/[0.03]">
        {HEALTH_ERRORS.map(err => {
          const status = retrying[err.id] ?? 'idle'
          const ts = new Date(err.timestamp)
          return (
            <div key={err.id} className="px-5 py-3 flex items-start gap-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-slate-300 text-xs font-semibold">{err.integrationName}</p>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/25 flex-shrink-0">{err.code}</span>
                  {err.retryCount > 0 && (
                    <span className="text-[8px] text-slate-600 flex-shrink-0">{err.retryCount}× retried</span>
                  )}
                </div>
                <p className="text-slate-500 text-[10px] font-mono leading-relaxed">{err.error}</p>
                <p className="text-slate-700 text-[9px] mt-1">
                  {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {ts.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div className="flex-shrink-0">
                {status === 'retrying' ? (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] text-indigo-400 border border-indigo-500/25 bg-indigo-500/10">
                    <RefreshCw size={10} className="animate-spin" />
                    Retrying…
                  </span>
                ) : status === 'failed' ? (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] text-red-400 border border-red-500/25 bg-red-500/10">
                    <X size={10} />
                    Still failing
                  </span>
                ) : (
                  <button
                    onClick={() => handleRetry(err.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium text-slate-400 hover:text-slate-200 border border-white/[0.08] hover:border-white/20 hover:bg-white/5 transition-all"
                  >
                    <RefreshCw size={10} />
                    Retry
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Toggle Component ────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
      style={{ background: on ? '#10b981' : 'rgba(100,116,139,0.4)' }}
      onClick={() => onChange(!on)}
    >
      <div
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
        style={{ left: on ? '22px' : '2px' }}
      />
    </div>
  )
}

// ─── Input helpers ────────────────────────────────────────────────────────────
const inputCls = 'w-full px-3 py-2 rounded-lg text-sm text-slate-200 bg-white/5 border border-white/10 focus:border-indigo-500/50 focus:outline-none placeholder:text-slate-600'
const labelCls = 'block text-xs font-medium text-slate-400 mb-1'
const primaryBtn = 'px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors'
const secondaryBtn = 'px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-white/10 transition-colors'

// ─── Config field types ───────────────────────────────────────────────────────
interface ConfigFields {
  [key: string]: string | boolean | string[]
}

// ─── Per-integration form components ─────────────────────────────────────────
function SplunkForm({ fields, onChange }: { fields: ConfigFields; onChange: (f: ConfigFields) => void }) {
  const sev = (fields['alertSeverities'] as string[] | undefined) ?? ['Critical', 'High', 'Medium']
  const toggleSev = (s: string) => {
    const next = sev.includes(s) ? sev.filter(x => x !== s) : [...sev, s]
    onChange({ ...fields, alertSeverities: next })
  }
  return (
    <div className="space-y-4">
      <div><label className={labelCls}>Server URL <span className="text-red-400">*</span></label>
        <input className={inputCls} placeholder="https://splunk.company.com:8089" value={String(fields['url'] ?? '')} onChange={e => onChange({ ...fields, url: e.target.value })} /></div>
      <div><label className={labelCls}>Username</label>
        <input className={inputCls} placeholder="admin" value={String(fields['username'] ?? '')} onChange={e => onChange({ ...fields, username: e.target.value })} /></div>
      <div><label className={labelCls}>Password</label>
        <input className={inputCls} type="password" placeholder="••••••••" value={String(fields['password'] ?? '')} onChange={e => onChange({ ...fields, password: e.target.value })} /></div>
      <div><label className={labelCls}>Search Index</label>
        <input className={inputCls} placeholder="index=notable" value={String(fields['searchIndex'] ?? 'index=notable')} onChange={e => onChange({ ...fields, searchIndex: e.target.value })} /></div>
      <div>
        <label className={labelCls}>Alert Severity Filter</label>
        <div className="flex gap-3 flex-wrap">
          {['Critical', 'High', 'Medium', 'Low'].map(s => (
            <label key={s} className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={sev.includes(s)} onChange={() => toggleSev(s)} className="accent-indigo-500" />
              <span className="text-xs text-slate-300">{s}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

function QRadarForm({ fields, onChange }: { fields: ConfigFields; onChange: (f: ConfigFields) => void }) {
  return (
    <div className="space-y-4">
      <div><label className={labelCls}>Console URL <span className="text-red-400">*</span></label>
        <input className={inputCls} placeholder="https://qradar.company.com" value={String(fields['url'] ?? '')} onChange={e => onChange({ ...fields, url: e.target.value })} /></div>
      <div><label className={labelCls}>SEC Token (API Token)</label>
        <input className={inputCls} type="password" placeholder="••••••••" value={String(fields['secToken'] ?? '')} onChange={e => onChange({ ...fields, secToken: e.target.value })} /></div>
      <div className="text-[10px] text-slate-600 text-center">— OR —</div>
      <div><label className={labelCls}>Username</label>
        <input className={inputCls} placeholder="admin" value={String(fields['username'] ?? '')} onChange={e => onChange({ ...fields, username: e.target.value })} /></div>
      <div><label className={labelCls}>Password</label>
        <input className={inputCls} type="password" placeholder="••••••••" value={String(fields['password'] ?? '')} onChange={e => onChange({ ...fields, password: e.target.value })} /></div>
      <div><label className={labelCls}>Offense Severity Threshold</label>
        <select className={inputCls} value={String(fields['severityThreshold'] ?? 'All')} onChange={e => onChange({ ...fields, severityThreshold: e.target.value })}>
          <option value="All">All</option>
          <option value="High+">High+</option>
          <option value="Critical only">Critical only</option>
        </select>
      </div>
      <div><label className={labelCls}>Max Offenses to Pull</label>
        <select className={inputCls} value={String(fields['maxOffenses'] ?? '50')} onChange={e => onChange({ ...fields, maxOffenses: e.target.value })}>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>
    </div>
  )
}

function CrowdStrikeForm({ fields, onChange }: { fields: ConfigFields; onChange: (f: ConfigFields) => void }) {
  const pull = (fields['dataToPull'] as string[] | undefined) ?? ['Detections', 'Incidents']
  const togglePull = (s: string) => {
    const next = pull.includes(s) ? pull.filter(x => x !== s) : [...pull, s]
    onChange({ ...fields, dataToPull: next })
  }
  return (
    <div className="space-y-4">
      <div><label className={labelCls}>Client ID</label>
        <input className={inputCls} placeholder="Client ID" value={String(fields['clientId'] ?? '')} onChange={e => onChange({ ...fields, clientId: e.target.value })} /></div>
      <div><label className={labelCls}>Client Secret</label>
        <input className={inputCls} type="password" placeholder="••••••••" value={String(fields['clientSecret'] ?? '')} onChange={e => onChange({ ...fields, clientSecret: e.target.value })} /></div>
      <div><label className={labelCls}>API Base URL</label>
        <select className={inputCls} value={String(fields['apiBase'] ?? 'US-1')} onChange={e => onChange({ ...fields, apiBase: e.target.value })}>
          <option value="US-1">US-1 (api.crowdstrike.com)</option>
          <option value="US-2">US-2</option>
          <option value="EU-1">EU-1</option>
          <option value="Gov">Gov</option>
        </select>
      </div>
      <div>
        <label className={labelCls}>Data to Pull</label>
        <div className="flex gap-3 flex-wrap">
          {['Detections', 'Incidents', 'Spotlight Vulnerabilities', 'Host Inventory'].map(s => (
            <label key={s} className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={pull.includes(s)} onChange={() => togglePull(s)} className="accent-indigo-500" />
              <span className="text-xs text-slate-300">{s}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

function QualysForm({ fields, onChange }: { fields: ConfigFields; onChange: (f: ConfigFields) => void }) {
  return (
    <div className="space-y-4">
      <div><label className={labelCls}>API Server</label>
        <select className={inputCls} value={String(fields['apiServer'] ?? 'US1')} onChange={e => onChange({ ...fields, apiServer: e.target.value })}>
          <option value="US1">US1 (qualysapi.qualys.com)</option>
          <option value="US2">US2</option>
          <option value="EU1">EU1</option>
          <option value="IN1">IN1</option>
          <option value="CA1">CA1</option>
        </select>
      </div>
      <div><label className={labelCls}>Username</label>
        <input className={inputCls} placeholder="username" value={String(fields['username'] ?? '')} onChange={e => onChange({ ...fields, username: e.target.value })} /></div>
      <div><label className={labelCls}>Password</label>
        <input className={inputCls} type="password" placeholder="••••••••" value={String(fields['password'] ?? '')} onChange={e => onChange({ ...fields, password: e.target.value })} /></div>
      <div><label className={labelCls}>Asset Tag Filter <span className="text-slate-600">(optional)</span></label>
        <input className={inputCls} placeholder="Production,Critical" value={String(fields['assetTagFilter'] ?? '')} onChange={e => onChange({ ...fields, assetTagFilter: e.target.value })} /></div>
      <div className="flex items-center justify-between">
        <label className={labelCls + ' mb-0'}>Pull Completed Reports</label>
        <Toggle on={fields['pullReports'] !== false} onChange={v => onChange({ ...fields, pullReports: v })} />
      </div>
    </div>
  )
}

function TenableForm({ fields, onChange }: { fields: ConfigFields; onChange: (f: ConfigFields) => void }) {
  const platform = String(fields['platform'] ?? 'Tenable.io')
  const showUrl = platform !== 'Tenable.io'
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Platform</label>
        <div className="flex gap-3">
          {['Tenable.io', 'Nessus', 'Tenable.sc'].map(p => (
            <label key={p} className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="platform" checked={platform === p} onChange={() => onChange({ ...fields, platform: p })} className="accent-indigo-500" />
              <span className="text-xs text-slate-300">{p}</span>
            </label>
          ))}
        </div>
      </div>
      {showUrl && <div><label className={labelCls}>Server URL</label>
        <input className={inputCls} placeholder="https://nessus.company.com:8834" value={String(fields['url'] ?? '')} onChange={e => onChange({ ...fields, url: e.target.value })} /></div>}
      <div><label className={labelCls}>{platform === 'Tenable.io' ? 'Access Key' : 'Username'}</label>
        <input className={inputCls} placeholder={platform === 'Tenable.io' ? 'Access Key' : 'username'} value={String(fields['accessKey'] ?? '')} onChange={e => onChange({ ...fields, accessKey: e.target.value })} /></div>
      <div><label className={labelCls}>{platform === 'Tenable.io' ? 'Secret Key' : 'Password'}</label>
        <input className={inputCls} type="password" placeholder="••••••••" value={String(fields['secretKey'] ?? '')} onChange={e => onChange({ ...fields, secretKey: e.target.value })} /></div>
    </div>
  )
}

function WizForm({ fields, onChange }: { fields: ConfigFields; onChange: (f: ConfigFields) => void }) {
  const pull = (fields['dataToPull'] as string[] | undefined) ?? ['Issues', 'Vulnerabilities']
  const togglePull = (s: string) => {
    const next = pull.includes(s) ? pull.filter(x => x !== s) : [...pull, s]
    onChange({ ...fields, dataToPull: next })
  }
  return (
    <div className="space-y-4">
      <div><label className={labelCls}>Client ID</label>
        <input className={inputCls} placeholder="Client ID" value={String(fields['clientId'] ?? '')} onChange={e => onChange({ ...fields, clientId: e.target.value })} /></div>
      <div><label className={labelCls}>Client Secret</label>
        <input className={inputCls} type="password" placeholder="••••••••" value={String(fields['clientSecret'] ?? '')} onChange={e => onChange({ ...fields, clientSecret: e.target.value })} /></div>
      <div><label className={labelCls}>Tenant URL</label>
        <input className={inputCls} placeholder="https://api.wiz.io" value={String(fields['url'] ?? 'https://api.wiz.io')} onChange={e => onChange({ ...fields, url: e.target.value })} /></div>
      <div>
        <label className={labelCls}>Data to Pull</label>
        <div className="flex gap-3 flex-wrap">
          {['Issues', 'Vulnerabilities', 'Misconfiguration'].map(s => (
            <label key={s} className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={pull.includes(s)} onChange={() => togglePull(s)} className="accent-indigo-500" />
              <span className="text-xs text-slate-300">{s}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

function SentinelForm({ fields, onChange }: { fields: ConfigFields; onChange: (f: ConfigFields) => void }) {
  const sev = (fields['alertSeverities'] as string[] | undefined) ?? ['High', 'Medium']
  const toggleSev = (s: string) => {
    const next = sev.includes(s) ? sev.filter(x => x !== s) : [...sev, s]
    onChange({ ...fields, alertSeverities: next })
  }
  return (
    <div className="space-y-4">
      <div><label className={labelCls}>Workspace ID</label>
        <input className={inputCls} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={String(fields['workspaceId'] ?? '')} onChange={e => onChange({ ...fields, workspaceId: e.target.value })} /></div>
      <div><label className={labelCls}>Primary Key</label>
        <input className={inputCls} type="password" placeholder="••••••••" value={String(fields['primaryKey'] ?? '')} onChange={e => onChange({ ...fields, primaryKey: e.target.value })} /></div>
      <div><label className={labelCls}>Subscription ID</label>
        <input className={inputCls} placeholder="Subscription ID" value={String(fields['subscriptionId'] ?? '')} onChange={e => onChange({ ...fields, subscriptionId: e.target.value })} /></div>
      <div><label className={labelCls}>Resource Group</label>
        <input className={inputCls} placeholder="resource-group-name" value={String(fields['resourceGroup'] ?? '')} onChange={e => onChange({ ...fields, resourceGroup: e.target.value })} /></div>
      <div>
        <label className={labelCls}>Alert Severity Filter</label>
        <div className="flex gap-3 flex-wrap">
          {['High', 'Medium', 'Low'].map(s => (
            <label key={s} className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={sev.includes(s)} onChange={() => toggleSev(s)} className="accent-indigo-500" />
              <span className="text-xs text-slate-300">{s}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

function SnykForm({ fields, onChange }: { fields: ConfigFields; onChange: (f: ConfigFields) => void }) {
  return (
    <div className="space-y-4">
      <div><label className={labelCls}>API Token</label>
        <input className={inputCls} type="password" placeholder="••••••••" value={String(fields['apiToken'] ?? '')} onChange={e => onChange({ ...fields, apiToken: e.target.value })} /></div>
      <div><label className={labelCls}>Organization ID</label>
        <input className={inputCls} placeholder="org-id" value={String(fields['orgId'] ?? '')} onChange={e => onChange({ ...fields, orgId: e.target.value })} /></div>
      <div className="flex items-center justify-between">
        <label className={labelCls + ' mb-0'}>Scan on Push</label>
        <Toggle on={Boolean(fields['scanOnPush'])} onChange={v => onChange({ ...fields, scanOnPush: v })} />
      </div>
    </div>
  )
}

function GitHubForm({ fields, onChange }: { fields: ConfigFields; onChange: (f: ConfigFields) => void }) {
  return (
    <div className="space-y-4">
      <div><label className={labelCls}>Personal Access Token</label>
        <input className={inputCls} type="password" placeholder="ghp_••••••••" value={String(fields['pat'] ?? '')} onChange={e => onChange({ ...fields, pat: e.target.value })} /></div>
      <div><label className={labelCls}>Organization Name</label>
        <input className={inputCls} placeholder="my-org" value={String(fields['orgName'] ?? '')} onChange={e => onChange({ ...fields, orgName: e.target.value })} /></div>
      <div><label className={labelCls}>Repositories <span className="text-slate-600">(one per line or comma-separated)</span></label>
        <textarea className={inputCls + ' resize-none'} rows={3} placeholder="repo-1&#10;repo-2&#10;repo-3" value={String(fields['repos'] ?? '')} onChange={e => onChange({ ...fields, repos: e.target.value })} /></div>
    </div>
  )
}

function getFormComponent(id: string, vendor: string, name: string, fields: ConfigFields, onChange: (f: ConfigFields) => void) {
  if (id === 'int-1' || vendor === 'Splunk') return <SplunkForm fields={fields} onChange={onChange} />
  if (id === 'int-2' || name.includes('Sentinel')) return <SentinelForm fields={fields} onChange={onChange} />
  if (id === 'int-3' || vendor === 'Qualys') return <QualysForm fields={fields} onChange={onChange} />
  if (id === 'int-4' || vendor === 'Wiz') return <WizForm fields={fields} onChange={onChange} />
  if (id === 'int-5' || vendor === 'CrowdStrike') return <CrowdStrikeForm fields={fields} onChange={onChange} />
  if (id === 'int-7' || vendor === 'Snyk') return <SnykForm fields={fields} onChange={onChange} />
  if (id === 'int-8' || vendor === 'GitHub') return <GitHubForm fields={fields} onChange={onChange} />
  if (name.includes('Tenable') || name.includes('Nessus')) return <TenableForm fields={fields} onChange={onChange} />
  if (name.includes('QRadar')) return <QRadarForm fields={fields} onChange={onChange} />
  return <SentinelForm fields={fields} onChange={onChange} />
}

// ─── Config Modal ─────────────────────────────────────────────────────────────
interface ConfigModalProps {
  integration: typeof integrations[0]
  initialFields: ConfigFields
  currentStatus: ConfigStatus
  testedAt?: string
  errorMessage?: string
  onSave: (fields: ConfigFields) => void
  onTest: () => Promise<boolean>
  onClose: () => void
}

function ConfigModal({ integration, initialFields, currentStatus, testedAt, errorMessage, onSave, onTest, onClose }: ConfigModalProps) {
  const [fields, setFields] = useState<ConfigFields>(initialFields)
  const [testResult, setTestResult] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle')
  const [testError, setTestError] = useState<string>('')
  const vendorColor = VENDOR_COLORS[integration.vendor] ?? '#6366f1'

  const statusKey = currentStatus === 'untested' ? 'untested' : currentStatus
  const st = STATUS_STYLES[statusKey]

  const handleTest = async () => {
    onSave(fields)         // persist fields locally so the hook can read them
    setTestResult('testing')
    setTestError('')
    const ok = await onTest()
    setTestResult(ok ? 'success' : 'failed')
    if (!ok) setTestError('Connection refused — check URL and credentials.')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="max-w-lg w-full mx-4 rounded-xl flex flex-col max-h-[90vh]" style={{ background: 'rgba(10,15,30,0.98)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs"
              style={{ background: `${vendorColor}20`, border: `1px solid ${vendorColor}30`, color: vendorColor }}>
              {integration.vendor.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-slate-200 text-sm font-semibold">{integration.name}</p>
              <p className="text-slate-600 text-[10px]">Configure integration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5"
              style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />
              {st.label}
            </span>
            <button onClick={onClose} className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {testedAt && (
            <p className="text-slate-600 text-[10px] mb-3">Last tested: {relativeTime(testedAt)}</p>
          )}
          {getFormComponent(integration.id, integration.vendor, integration.name, fields, setFields)}
        </div>

        {/* Test result banners */}
        {testResult === 'success' && (
          <div className="mx-5 mb-2 px-3 py-2 rounded-lg text-xs font-medium" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}>
            Connected — credentials verified and saved. Data will sync every 15 minutes.
          </div>
        )}
        {testResult === 'failed' && (
          <div className="mx-5 mb-2 px-3 py-2 rounded-lg text-xs font-medium" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
            {testError || errorMessage || 'Connection failed.'}
          </div>
        )}
        {currentStatus === 'failed' && testResult === 'idle' && errorMessage && (
          <div className="mx-5 mb-2 px-3 py-2 rounded-lg text-xs font-medium" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
            {errorMessage}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/[0.06]">
          <button onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button
            onClick={handleTest}
            disabled={testResult === 'testing'}
            className={primaryBtn + ' disabled:opacity-60'}
          >
            {testResult === 'testing' ? 'Connecting...' : testResult === 'success' ? '✓ Connected' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── VA Report Sub-Panel ──────────────────────────────────────────────────────
const SEV_COLORS: Record<Severity, string> = { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#10b981' }

function VAReportPanel({ scanner }: { scanner: 'Qualys' | 'Tenable' | 'Nessus' }) {
  const { reports, importReport, clearReports } = useVAReports()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const raw = JSON.parse(ev.target?.result as string)
        const report = parseVAReportJSON(raw, scanner)
        if (report) {
          importReport(report)
          setUploadMsg(`Imported ${report.findings.length} findings from ${file.name}`)
        } else {
          setUploadMsg('Could not parse file — ensure it is a valid JSON report.')
        }
      } catch {
        setUploadMsg('Failed to read file — check JSON syntax.')
      }
      setUploading(false)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const scannerReports = reports.filter(r => r.scanner === scanner)

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">VA Reports</p>

      {scannerReports.length === 0 ? (
        <p className="text-slate-600 text-xs">No reports imported yet.</p>
      ) : (
        <div className="space-y-2">
          {scannerReports.map(r => {
            const bySev = { critical: 0, high: 0, medium: 0, low: 0 }
            r.findings.forEach(f => { bySev[f.severity] = (bySev[f.severity] ?? 0) + 1 })
            return (
              <div key={r.id} className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-slate-300 text-xs font-medium truncate">{r.scanName}</p>
                <p className="text-slate-600 text-[10px] mt-0.5">{new Date(r.importedAt).toLocaleDateString()} · {r.findings.length} findings</p>
                <div className="flex gap-2 mt-1">
                  {(['critical', 'high', 'medium', 'low'] as Severity[]).map(s => bySev[s] > 0 && (
                    <span key={s} className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${SEV_COLORS[s]}20`, color: SEV_COLORS[s] }}>{bySev[s]} {s.slice(0,4)}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Upload zone */}
      <div
        className="rounded-lg border-2 border-dashed border-white/[0.08] p-4 text-center cursor-pointer hover:border-indigo-500/40 transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        <Upload size={16} className="mx-auto text-slate-600 mb-1" />
        <p className="text-slate-600 text-[10px]">{uploading ? 'Uploading...' : 'Drop JSON report here or click to upload'}</p>
        <input ref={fileRef} type="file" accept=".json,.csv" className="hidden" onChange={handleFile} />
      </div>

      {uploadMsg && (
        <p className="text-[10px] text-slate-400">{uploadMsg}</p>
      )}

      <div className="flex gap-2">
        <button
          className={primaryBtn + ' text-[11px] py-1.5 flex-1'}
          onClick={() => { importReport(generateDemoReport(scanner)); setUploadMsg(`Loaded demo ${scanner} report.`) }}
        >
          Load Demo Report
        </button>
        {scannerReports.length > 0 && (
          <button
            className={secondaryBtn + ' text-[11px] py-1.5'}
            onClick={() => { clearReports(); setUploadMsg('') }}
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Integration Card ─────────────────────────────────────────────────────────
interface IntegrationCardProps {
  integration: typeof integrations[0]
  onConfigure: () => void
  onTest: () => Promise<boolean>
  onSync?: () => Promise<void>
  onDisconnect?: () => Promise<void>
  configStatus: ConfigStatus
  testedAt?: string
}

function IntegrationCard({ integration, onConfigure, onTest, onSync, onDisconnect, configStatus }: IntegrationCardProps) {
  const sparkline = useMemo(() => makeSparkline(integration.id.charCodeAt(integration.id.length - 1) * 13), [integration.id])
  const vendorColor = VENDOR_COLORS[integration.vendor] ?? '#6366f1'
  const [vaOpen, setVaOpen] = useState(false)
  const isVulnScanner = integration.category === 'VULN_SCANNER'

  // Determine display status: if user has configured+connected via hook, use that; otherwise use mock data status
  const effectiveStatus = configStatus !== 'untested' ? configStatus : (integration.status as string === 'connected' ? 'connected_mock' : integration.status)
  const st = STATUS_STYLES[effectiveStatus as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.disconnected

  const scannerName = integration.vendor === 'Qualys' ? 'Qualys' : integration.name.includes('Nessus') ? 'Nessus' : 'Tenable'

  return (
    <div className="glass-card rounded-xl p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{ background: `${vendorColor}20`, border: `1px solid ${vendorColor}30`, color: vendorColor }}>
            {integration.vendor.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-slate-200 text-sm font-semibold leading-tight">{integration.name}</p>
            <p className="text-slate-600 text-[10px] mt-0.5">v{integration.version}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 ${effectiveStatus === 'testing' ? 'animate-pulse' : ''}`}
            style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />
            {st.label}
          </span>
          <span className="text-slate-600 text-[10px]">Synced {relativeTime(integration.lastSync)}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-2">{integration.description}</p>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 py-2 border-y border-white/[0.04]">
        {integration.category === 'SIEM' && <>
          <div><p className="text-[9px] text-slate-600 uppercase tracking-wider">Events/hr</p><p className="text-slate-300 text-sm font-bold tabular-nums">{fmtNum(integration.eventsPerHour)}</p></div>
          <div><p className="text-[9px] text-slate-600 uppercase tracking-wider">Alerts</p><p className="text-slate-300 text-sm font-bold tabular-nums">{fmtNum(integration.alertsIngested)}</p></div>
          <div><p className="text-[9px] text-slate-600 uppercase tracking-wider">Error Rate</p><p className={`text-sm font-bold tabular-nums ${integration.errorRate > 2 ? 'text-red-400' : integration.errorRate > 1 ? 'text-amber-400' : 'text-emerald-400'}`}>{integration.errorRate}%</p></div>
        </>}
        {integration.category === 'VULN_SCANNER' && <>
          <div><p className="text-[9px] text-slate-600 uppercase tracking-wider">Assets</p><p className="text-slate-300 text-sm font-bold tabular-nums">{fmtNum(integration.assetsManaged)}</p></div>
          <div><p className="text-[9px] text-slate-600 uppercase tracking-wider">Findings</p><p className="text-slate-300 text-sm font-bold tabular-nums">{fmtNum(integration.alertsIngested)}</p></div>
          <div><p className="text-[9px] text-slate-600 uppercase tracking-wider">Last Scan</p><p className="text-slate-300 text-sm font-bold">{relativeTime(integration.lastSync)}</p></div>
        </>}
        {integration.category === 'EDR' && <>
          <div><p className="text-[9px] text-slate-600 uppercase tracking-wider">Agents</p><p className="text-slate-300 text-sm font-bold tabular-nums">{fmtNum(integration.assetsManaged)}</p></div>
          <div><p className="text-[9px] text-slate-600 uppercase tracking-wider">Detections</p><p className="text-slate-300 text-sm font-bold tabular-nums">{fmtNum(integration.alertsIngested)}</p></div>
          <div><p className="text-[9px] text-slate-600 uppercase tracking-wider">Health</p><p className={`text-sm font-bold tabular-nums ${integration.errorRate > 3 ? 'text-amber-400' : 'text-emerald-400'}`}>{(100 - integration.errorRate).toFixed(1)}%</p></div>
        </>}
        {integration.category === 'APPSEC' && <>
          <div><p className="text-[9px] text-slate-600 uppercase tracking-wider">Repos</p><p className="text-slate-300 text-sm font-bold tabular-nums">{integration.assetsManaged}</p></div>
          <div><p className="text-[9px] text-slate-600 uppercase tracking-wider">Alerts</p><p className="text-slate-300 text-sm font-bold tabular-nums">{integration.alertsIngested}</p></div>
          <div><p className="text-[9px] text-slate-600 uppercase tracking-wider">Last Scan</p><p className="text-slate-300 text-sm font-bold">{relativeTime(integration.lastSync)}</p></div>
        </>}
      </div>

      {/* Sparkline */}
      <div style={{ height: 36 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparkline} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <Line type="monotone" dataKey="v" stroke={vendorColor} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {effectiveStatus === 'connected' || effectiveStatus === 'connected_mock' ? (
          <>
            <button
              onClick={onSync ? async () => { await onSync() } : undefined}
              className="flex-1 py-1.5 text-[11px] font-medium rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-all border border-emerald-500/20 flex items-center justify-center gap-1"
            >
              <RefreshCw size={10} />
              Sync Now
            </button>
            <button
              onClick={onDisconnect}
              className="flex-1 py-1.5 text-[11px] font-medium rounded-lg text-red-400 hover:bg-red-500/10 transition-all border border-red-500/20"
            >
              Disconnect
            </button>
          </>
        ) : (
          <>
            <button onClick={onConfigure} className="flex-1 py-1.5 text-[11px] font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all border border-white/[0.06]">
              Configure
            </button>
            <button
              onClick={onTest}
              disabled={effectiveStatus === 'testing'}
              className="flex-1 py-1.5 text-[11px] font-medium rounded-lg text-indigo-400 hover:bg-indigo-500/10 transition-all border border-indigo-500/20 disabled:opacity-50"
            >
              {effectiveStatus === 'testing' ? 'Connecting...' : 'Connect'}
            </button>
          </>
        )}
      </div>

      {/* VA Reports panel (vuln scanners only) */}
      {isVulnScanner && (
        <div>
          <button
            className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 hover:text-slate-300 transition-colors"
            onClick={() => setVaOpen(v => !v)}
          >
            {vaOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            VA Reports
          </button>
          {vaOpen && <VAReportPanel scanner={scannerName as 'Qualys' | 'Tenable' | 'Nessus'} />}
        </div>
      )}
    </div>
  )
}

// ─── Incident Management Section ─────────────────────────────────────────────
function IncidentManagementSection() {
  const { serviceNowConfig, opsgenieConfig, incidents, isSyncing, lastSynced, saveServiceNowConfig, saveOpsgenieConfig, syncIncidents } = useIncidentIntegrations()
  const [openModal, setOpenModal] = useState<'servicenow' | 'opsgenie' | null>(null)

  // ServiceNow form state
  const [snFields, setSnFields] = useState<ServiceNowConfig>({
    instanceUrl: serviceNowConfig?.instanceUrl ?? '',
    username: serviceNowConfig?.username ?? '',
    password: serviceNowConfig?.password ?? '',
    table: serviceNowConfig?.table ?? 'incident',
    sysparmQuery: serviceNowConfig?.sysparmQuery ?? 'category=security^state!=7',
    maxRecords: serviceNowConfig?.maxRecords ?? 50,
  })

  // Opsgenie form state
  const [ogFields, setOgFields] = useState<OpsgenieConfig>({
    apiKey: opsgenieConfig?.apiKey ?? '',
    baseUrl: opsgenieConfig?.baseUrl ?? 'https://api.opsgenie.com',
    teamId: opsgenieConfig?.teamId ?? '',
    query: opsgenieConfig?.query ?? 'status: open AND tag: security',
  })

  const [testResult, setTestResult] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle')

  const handleTestSN = async () => {
    setTestResult('testing')
    await new Promise(r => setTimeout(r, 1500))
    const ok = snFields.instanceUrl.startsWith('https://')
    setTestResult(ok ? 'success' : 'failed')
  }

  const handleTestOG = async () => {
    setTestResult('testing')
    await new Promise(r => setTimeout(r, 1500))
    const ok = ogFields.apiKey.length > 5
    setTestResult(ok ? 'success' : 'failed')
  }

  const relT = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    return `${Math.floor(m / 60)}h ago`
  }

  const snIncidents = incidents.filter(i => i.source === 'ServiceNow').length
  const ogIncidents = incidents.filter(i => i.source === 'Opsgenie').length

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-1 h-5 rounded-full bg-purple-500" />
        <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Incident Management</h2>
        <div className="flex-1 h-px bg-white/5" />
        <span className="text-slate-600 text-[10px]">2 integrations</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* ServiceNow Card */}
        <div className="glass-card rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm" style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}>SN</div>
              <div>
                <p className="text-slate-200 text-sm font-semibold">ServiceNow</p>
                <p className="text-slate-600 text-[10px]">ITSM / Incident Management</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5"
              style={{ background: serviceNowConfig ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)', color: serviceNowConfig ? '#10b981' : '#94a3b8', border: `1px solid ${serviceNowConfig ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.3)'}` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: serviceNowConfig ? '#10b981' : '#94a3b8' }} />
              {serviceNowConfig ? 'Configured' : 'Not Configured'}
            </span>
          </div>
          <p className="text-slate-500 text-[11px] leading-relaxed">Pull security incidents from ServiceNow ITSM. Supports custom table queries and automated sync.</p>
          <div className="grid grid-cols-3 gap-2 py-2 border-y border-white/[0.04]">
            <div><p className="text-[9px] text-slate-600 uppercase tracking-wider">Incidents</p><p className="text-slate-300 text-sm font-bold tabular-nums">{snIncidents}</p></div>
            <div><p className="text-[9px] text-slate-600 uppercase tracking-wider">Last Sync</p><p className="text-slate-300 text-sm font-bold">{lastSynced ? relT(lastSynced) : '—'}</p></div>
            <div><p className="text-[9px] text-slate-600 uppercase tracking-wider">Max Records</p><p className="text-slate-300 text-sm font-bold tabular-nums">{serviceNowConfig?.maxRecords ?? 50}</p></div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setTestResult('idle'); setOpenModal('servicenow') }} className="flex-1 py-1.5 text-[11px] font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-white/[0.06] transition-all">Configure</button>
            <button onClick={syncIncidents} disabled={isSyncing || !serviceNowConfig} className="flex-1 py-1.5 text-[11px] font-medium rounded-lg text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1">
              <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
              Sync Incidents
            </button>
          </div>
        </div>

        {/* Opsgenie Card */}
        <div className="glass-card rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm" style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>OG</div>
              <div>
                <p className="text-slate-200 text-sm font-semibold">Opsgenie</p>
                <p className="text-slate-600 text-[10px]">Alert & Incident Management</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5"
              style={{ background: opsgenieConfig ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)', color: opsgenieConfig ? '#10b981' : '#94a3b8', border: `1px solid ${opsgenieConfig ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.3)'}` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: opsgenieConfig ? '#10b981' : '#94a3b8' }} />
              {opsgenieConfig ? 'Configured' : 'Not Configured'}
            </span>
          </div>
          <p className="text-slate-500 text-[11px] leading-relaxed">Import security alerts from Opsgenie. Filter by team, tag, or custom query for security-relevant incidents.</p>
          <div className="grid grid-cols-3 gap-2 py-2 border-y border-white/[0.04]">
            <div><p className="text-[9px] text-slate-600 uppercase tracking-wider">Incidents</p><p className="text-slate-300 text-sm font-bold tabular-nums">{ogIncidents}</p></div>
            <div><p className="text-[9px] text-slate-600 uppercase tracking-wider">Last Sync</p><p className="text-slate-300 text-sm font-bold">{lastSynced ? relT(lastSynced) : '—'}</p></div>
            <div><p className="text-[9px] text-slate-600 uppercase tracking-wider">Team ID</p><p className="text-slate-300 text-sm font-bold">{opsgenieConfig?.teamId ? opsgenieConfig.teamId.slice(0, 8) + '...' : '—'}</p></div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setTestResult('idle'); setOpenModal('opsgenie') }} className="flex-1 py-1.5 text-[11px] font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-white/[0.06] transition-all">Configure</button>
            <button onClick={syncIncidents} disabled={isSyncing || !opsgenieConfig} className="flex-1 py-1.5 text-[11px] font-medium rounded-lg text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1">
              <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
              Sync Incidents
            </button>
          </div>
        </div>
      </div>

      {/* ServiceNow Config Modal */}
      {openModal === 'servicenow' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="max-w-lg w-full rounded-xl flex flex-col max-h-[90vh]" style={{ background: 'rgba(10,15,30,0.98)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <p className="text-slate-200 text-sm font-semibold">Configure ServiceNow</p>
              <button onClick={() => setOpenModal(null)} className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div><label className={labelCls}>Instance URL <span className="text-red-400">*</span></label>
                <input className={inputCls} placeholder="https://company.service-now.com" value={snFields.instanceUrl} onChange={e => setSnFields(f => ({ ...f, instanceUrl: e.target.value }))} /></div>
              <div><label className={labelCls}>Username</label>
                <input className={inputCls} placeholder="admin" value={snFields.username} onChange={e => setSnFields(f => ({ ...f, username: e.target.value }))} /></div>
              <div><label className={labelCls}>Password</label>
                <input className={inputCls} type="password" placeholder="••••••••" value={snFields.password} onChange={e => setSnFields(f => ({ ...f, password: e.target.value }))} /></div>
              <div><label className={labelCls}>Table Name</label>
                <input className={inputCls} placeholder="incident" value={snFields.table} onChange={e => setSnFields(f => ({ ...f, table: e.target.value }))} /></div>
              <div><label className={labelCls}>Filter Query (sysparm_query)</label>
                <input className={inputCls} placeholder="category=security^state!=7" value={snFields.sysparmQuery} onChange={e => setSnFields(f => ({ ...f, sysparmQuery: e.target.value }))} /></div>
              <div><label className={labelCls}>Max Records</label>
                <input className={inputCls} type="number" value={snFields.maxRecords} onChange={e => setSnFields(f => ({ ...f, maxRecords: parseInt(e.target.value) || 50 }))} /></div>
              {testResult === 'success' && <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}>Connection test successful.</div>}
              {testResult === 'failed' && <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>Connection test failed — check URL format (must start with https://).</div>}
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-white/[0.06]">
              <button onClick={() => setOpenModal(null)} className={secondaryBtn}>Cancel</button>
              <button onClick={handleTestSN} disabled={testResult === 'testing'} className={secondaryBtn + ' text-indigo-400 border-indigo-500/30'}>{testResult === 'testing' ? 'Testing...' : 'Test Connection'}</button>
              <button onClick={() => { saveServiceNowConfig(snFields); setOpenModal(null) }} className={primaryBtn}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Opsgenie Config Modal */}
      {openModal === 'opsgenie' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="max-w-lg w-full rounded-xl flex flex-col max-h-[90vh]" style={{ background: 'rgba(10,15,30,0.98)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <p className="text-slate-200 text-sm font-semibold">Configure Opsgenie</p>
              <button onClick={() => setOpenModal(null)} className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div><label className={labelCls}>API Key <span className="text-red-400">*</span></label>
                <input className={inputCls} type="password" placeholder="••••••••" value={ogFields.apiKey} onChange={e => setOgFields(f => ({ ...f, apiKey: e.target.value }))} /></div>
              <div><label className={labelCls}>Base URL</label>
                <input className={inputCls} placeholder="https://api.opsgenie.com" value={ogFields.baseUrl} onChange={e => setOgFields(f => ({ ...f, baseUrl: e.target.value }))} /></div>
              <div><label className={labelCls}>Team ID <span className="text-slate-600">(optional)</span></label>
                <input className={inputCls} placeholder="team-uuid" value={ogFields.teamId ?? ''} onChange={e => setOgFields(f => ({ ...f, teamId: e.target.value }))} /></div>
              <div><label className={labelCls}>Alert Query</label>
                <input className={inputCls} placeholder="status: open AND tag: security" value={ogFields.query} onChange={e => setOgFields(f => ({ ...f, query: e.target.value }))} /></div>
              {testResult === 'success' && <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}>Connection test successful.</div>}
              {testResult === 'failed' && <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>Connection test failed — API key must be at least 6 characters.</div>}
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-white/[0.06]">
              <button onClick={() => setOpenModal(null)} className={secondaryBtn}>Cancel</button>
              <button onClick={handleTestOG} disabled={testResult === 'testing'} className={secondaryBtn + ' text-indigo-400 border-indigo-500/30'}>{testResult === 'testing' ? 'Testing...' : 'Test Connection'}</button>
              <button onClick={() => { saveOpsgenieConfig(ogFields); setOpenModal(null) }} className={primaryBtn}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Integrations() {
  const { configs, saveConfig, testConnection, syncNow, disconnect, getConfig } = useIntegrationConfigs()
  const [openModal, setOpenModal] = useState<string | null>(null)

  const connected = integrations.filter(i => {
    const cfg = configs[i.id]
    if (cfg) return cfg.status === 'connected'
    return i.status === 'connected'
  }).length
  const degraded = integrations.filter(i => {
    const cfg = configs[i.id]
    if (cfg) return false
    return i.status === 'degraded'
  }).length
  const disconnected = integrations.filter(i => {
    const cfg = configs[i.id]
    if (cfg) return cfg.status === 'failed'
    return i.status === 'disconnected'
  }).length
  const totalEventsPerHour = integrations.reduce((a: number, b) => a + b.eventsPerHour, 0)

  return (
    <div className="min-h-screen" style={{ background: '#0a0f1e' }}>
      {/* Page header */}
      <div className="sticky top-0 z-40 border-b border-white/[0.06] px-6 py-3 flex items-center gap-3" style={{ background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(20px)' }}>
        <span className="text-slate-600 text-xs">Dashboard</span>
        <span className="text-slate-700 text-xs">/</span>
        <span className="text-slate-300 text-xs font-semibold">Integrations</span>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

        {/* Health Summary Banner */}
        <div className="glass-card rounded-xl px-6 py-4">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-[9px] text-slate-600 uppercase tracking-wider">Total</p>
              <p className="text-2xl font-bold text-slate-100 tabular-nums">{integrations.length}</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <p className="text-[9px] text-slate-600 uppercase tracking-wider">Connected</p>
              <p className="text-2xl font-bold text-emerald-400 tabular-nums">{connected}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-600 uppercase tracking-wider">Degraded</p>
              <p className="text-2xl font-bold text-amber-400 tabular-nums">{degraded}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-600 uppercase tracking-wider">Disconnected</p>
              <p className="text-2xl font-bold text-red-400 tabular-nums">{disconnected}</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <p className="text-[9px] text-slate-600 uppercase tracking-wider">Total Events/hr</p>
              <p className="text-2xl font-bold text-indigo-300 tabular-nums">{fmtNum(totalEventsPerHour)}</p>
            </div>
          </div>
        </div>

        {/* Integration health error log */}
        <IntegrationHealthLog />

        {/* Category sections */}
        {CATEGORIES.map(cat => {
          const items = integrations.filter(i => i.category === cat)
          if (items.length === 0) return null
          return (
            <div key={cat}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1 h-5 rounded-full bg-indigo-500" />
                <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-widest">{CATEGORY_LABELS[cat]}</h2>
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-slate-600 text-[10px]">{items.length} integration{items.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map(int => {
                  const cfg = getConfig(int.id)
                  const cfgStatus = cfg ? cfg.status : 'untested'
                  return (
                    <IntegrationCard
                      key={int.id}
                      integration={int}
                      configStatus={cfgStatus}
                      testedAt={cfg?.testedAt}
                      onConfigure={() => setOpenModal(int.id)}
                      onTest={() => testConnection(int.id)}
                      onSync={syncNow ? async () => { await syncNow(int.id) } : undefined}
                      onDisconnect={disconnect ? async () => { await disconnect(int.id) } : undefined}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Incident Management Section */}
      <IncidentManagementSection />

      {/* Config Modal */}
      {openModal && (() => {
        const int = integrations.find(i => i.id === openModal)!
        const cfg = getConfig(openModal)
        return (
          <ConfigModal
            integration={int}
            initialFields={cfg?.fields ?? {}}
            currentStatus={cfg?.status ?? 'untested'}
            testedAt={cfg?.testedAt}
            errorMessage={cfg?.errorMessage}
            onSave={(fields) => saveConfig(openModal, fields)}
            onTest={() => testConnection(openModal)}
            onClose={() => setOpenModal(null)}
          />
        )
      })()}
    </div>
  )
}
