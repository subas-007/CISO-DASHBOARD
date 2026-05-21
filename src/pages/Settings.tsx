import { useState } from 'react'
import { Building2, Monitor, LayoutDashboard, Info, Check } from 'lucide-react'
import { useSettings } from '../hooks/useSettings'
import type { DashboardSettings } from '../hooks/useSettings'

type Section = 'organization' | 'display' | 'dashboard' | 'about'

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'organization', label: 'Organization',  icon: <Building2 size={15} /> },
  { id: 'display',      label: 'Display',        icon: <Monitor size={15} /> },
  { id: 'dashboard',    label: 'Dashboard',      icon: <LayoutDashboard size={15} /> },
  { id: 'about',        label: 'About',          icon: <Info size={15} /> },
]

const TIMEZONES = [
  { value: 'Asia/Kathmandu',    label: 'Asia/Kathmandu (UTC+5:45)' },
  { value: 'America/New_York',  label: 'America/New_York (UTC-5)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (UTC-8)' },
  { value: 'Europe/London',     label: 'Europe/London (UTC+0)' },
  { value: 'Europe/Berlin',     label: 'Europe/Berlin (UTC+1)' },
  { value: 'Asia/Singapore',    label: 'Asia/Singapore (UTC+8)' },
  { value: 'Asia/Tokyo',        label: 'Asia/Tokyo (UTC+9)' },
]

const REFRESH_OPTIONS: { value: DashboardSettings['refreshInterval']; label: string }[] = [
  { value: 30,  label: '30s' },
  { value: 60,  label: '60s' },
  { value: 120, label: '2 min' },
  { value: 300, label: '5 min' },
]

export default function Settings() {
  const { settings, updateSetting, resetSettings } = useSettings()
  const [activeSection, setActiveSection] = useState<Section>('organization')
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [resetMsg, setResetMsg] = useState(false)

  function save<K extends keyof DashboardSettings>(key: K, value: DashboardSettings[K]) {
    updateSetting(key, value)
    setSavedKey(key)
    setTimeout(() => setSavedKey(null), 1500)
  }

  function handleReset() {
    resetSettings()
    setResetMsg(true)
    setTimeout(() => setResetMsg(false), 2000)
  }

  const fieldClass = 'w-full bg-[#0d1324] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50'
  const labelClass = 'block text-xs font-medium text-slate-400 mb-1.5'
  const fieldRow = 'space-y-1.5'

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-200">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0f1e]/95 backdrop-blur border-b border-white/[0.06] px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-100">Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">Organisation configuration and display preferences</p>
      </div>

      <div className="flex gap-6 p-6 max-w-5xl">
        {/* Left nav */}
        <nav className="w-44 shrink-0 space-y-1">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left ${
                activeSection === s.id
                  ? 'bg-indigo-600/20 text-indigo-300 ring-1 ring-indigo-500/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 space-y-4">

          {/* ── Organization ───────────────────────────────────────── */}
          {activeSection === 'organization' && (
            <div className="glass-card rounded-xl p-6 space-y-6">
              <h2 className="text-sm font-semibold text-slate-200">Organisation</h2>

              <div className={fieldRow}>
                <label className={labelClass}>Organisation Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={settings.orgName}
                    onChange={e => save('orgName', e.target.value)}
                    className={fieldClass}
                  />
                  {savedKey === 'orgName' && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-400 flex items-center gap-1">
                      <Check size={10} /> Saved
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600">Used in report headers and PDF exports.</p>
              </div>

              <div className={fieldRow}>
                <label className={labelClass}>Timezone</label>
                <select
                  value={settings.timezone}
                  onChange={e => save('timezone', e.target.value)}
                  className={fieldClass}
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
                {savedKey === 'timezone' && <span className="text-[10px] text-emerald-400 flex items-center gap-1"><Check size={10} /> Saved</span>}
              </div>

              <div className={fieldRow}>
                <label className={labelClass}>Date Format</label>
                <div className="flex gap-3">
                  {(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'] as const).map(fmt => (
                    <label key={fmt} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="dateFormat"
                        value={fmt}
                        checked={settings.dateFormat === fmt}
                        onChange={() => save('dateFormat', fmt)}
                        className="accent-indigo-500"
                      />
                      <span className="text-xs text-slate-400 font-mono">{fmt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Display ────────────────────────────────────────────── */}
          {activeSection === 'display' && (
            <div className="glass-card rounded-xl p-6 space-y-6">
              <h2 className="text-sm font-semibold text-slate-200">Display Preferences</h2>

              <div className={fieldRow}>
                <label className={labelClass}>Currency Display</label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { v: 'USD',  label: 'USD Only',  example: '$4,200,000' },
                    { v: 'NPR',  label: 'NPR Only',  example: 'NPR 556.8 Cr' },
                    { v: 'BOTH', label: 'Both',      example: '$4.2M / NPR 556.8 Cr', recommended: true },
                  ] as const).map(opt => (
                    <button
                      key={opt.v}
                      onClick={() => save('currency', opt.v)}
                      className={`relative p-3 rounded-lg border text-left transition-all ${
                        settings.currency === opt.v
                          ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                          : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/20'
                      }`}
                    >
                      {'recommended' in opt && opt.recommended && (
                        <span className="absolute top-2 right-2 text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                          Recommended
                        </span>
                      )}
                      <p className="text-xs font-medium mb-1">{opt.label}</p>
                      <p className="text-[10px] font-mono opacity-70">{opt.example}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-white/[0.06]">
                <div>
                  <p className="text-xs font-medium text-slate-300">Show Data Freshness Badges</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">Show "As of HH:MM" timestamps on data panels</p>
                </div>
                <button
                  onClick={() => save('showFreshnessBadges', !settings.showFreshnessBadges)}
                  className={`relative w-10 h-5.5 rounded-full transition-colors ${settings.showFreshnessBadges ? 'bg-indigo-600' : 'bg-white/10'}`}
                  style={{ height: 22 }}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${settings.showFreshnessBadges ? 'translate-x-5' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* ── Dashboard ──────────────────────────────────────────── */}
          {activeSection === 'dashboard' && (
            <div className="glass-card rounded-xl p-6 space-y-6">
              <h2 className="text-sm font-semibold text-slate-200">Dashboard Behaviour</h2>

              <div className={fieldRow}>
                <label className={labelClass}>Auto-Refresh Interval</label>
                <div className="grid grid-cols-4 gap-2">
                  {REFRESH_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => save('refreshInterval', opt.value)}
                      className={`py-2 rounded-lg text-xs font-medium transition-all border ${
                        settings.refreshInterval === opt.value
                          ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                          : 'border-white/[0.08] text-slate-500 hover:text-slate-300 hover:border-white/20'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={fieldRow}>
                <label className={labelClass}>Default Asset Tier Filter</label>
                <select
                  value={settings.defaultAssetTier}
                  onChange={e => save('defaultAssetTier', e.target.value as DashboardSettings['defaultAssetTier'])}
                  className={fieldClass}
                >
                  <option value="ALL">All Tiers</option>
                  <option value="T0">T0 Critical Only</option>
                  <option value="T0_T1">T0 + T1</option>
                </select>
              </div>

              <div className={fieldRow}>
                <label className={labelClass}>Default Report Date Range</label>
                <select
                  value={settings.defaultReportScope}
                  onChange={e => save('defaultReportScope', e.target.value as DashboardSettings['defaultReportScope'])}
                  className={fieldClass}
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>
            </div>
          )}

          {/* ── About ──────────────────────────────────────────────── */}
          {activeSection === 'about' && (
            <div className="glass-card rounded-xl p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-200">About</h2>
              <div className="space-y-2">
                {[
                  { label: 'Application',  value: 'CISO Executive Dashboard' },
                  { label: 'Version',      value: '2.0 (Sprint 1)' },
                  { label: 'Frameworks',   value: 'NIST CSF 2.0, ISO 27001:2022, SOC 2, PCI-DSS, FAIR' },
                  { label: 'Stack',        value: 'React 19 + TypeScript + Tailwind CSS v4' },
                  { label: 'Build',        value: 'Phase 4 Complete' },
                ].map(row => (
                  <div key={row.label} className="flex gap-4 py-2 border-b border-white/[0.04] last:border-0">
                    <span className="text-xs text-slate-500 w-28 shrink-0">{row.label}</span>
                    <span className="text-xs text-slate-300">{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-lg border border-rose-500/30 text-rose-400 text-xs font-medium hover:bg-rose-500/10 transition-all"
                >
                  Reset All Settings to Defaults
                </button>
                {resetMsg && (
                  <p className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
                    <Check size={12} /> Settings reset to defaults
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
