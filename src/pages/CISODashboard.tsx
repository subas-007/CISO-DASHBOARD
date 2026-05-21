import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, X, Bell } from 'lucide-react'
import { ExecutiveScorecard } from '../components/sections/ExecutiveScorecard'
import { ThreatCommand } from '../components/sections/ThreatCommand'
import { VulnManagement } from '../components/sections/VulnManagement'
import { AppSecSupplyChain } from '../components/sections/AppSecSupplyChain'
import { AIBriefing } from '../components/sections/AIBriefing'
import { NotificationCenter, INITIAL_NOTIFICATIONS } from '../components/ui/NotificationCenter'
import type { Notification } from '../components/ui/NotificationCenter'
import { useFilter } from '../context/FilterContext'
import { securityMetrics } from '../data/mockData'

function LiveClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="font-mono text-slate-500 text-xs tabular-nums">
      {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  )
}

export function CISODashboard() {
  const { filter, clearFilter, hasFilter } = useFilter()
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS)

  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    const t = setInterval(() => {
      setRefreshing(true)
      setTimeout(() => {
        setLastRefresh(new Date())
        setRefreshing(false)
      }, 600)
    }, 30_000)
    return () => clearInterval(t)
  }, [])

  const handleManualRefresh = useCallback(() => {
    setRefreshing(true)
    setTimeout(() => { setLastRefresh(new Date()); setRefreshing(false) }, 600)
  }, [])

  const filterSummary = [
    filter.severity && `Severity: ${filter.severity.toUpperCase()}`,
    filter.assetTier && `Tier: ${filter.assetTier}`,
    filter.phase && `Phase: ${filter.phase}`,
    filter.slaBreached && 'SLA: Breached',
  ].filter(Boolean).join(' · ')

  return (
    <div style={{ background: '#0a0f1e' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06]" style={{ background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-[1920px] mx-auto px-6 py-3 flex items-center gap-4">
          {/* Posture score pill */}
          <div className="px-3 py-1.5 rounded-lg border flex items-center gap-2" style={{ background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.25)' }}>
            <span className="text-slate-500 text-[9px] uppercase tracking-wider">Posture</span>
            <span className="text-indigo-300 font-bold text-sm tabular-nums">{securityMetrics.postureScore}</span>
            <span className="text-slate-600 text-[9px]">/ 100</span>
          </div>

          {/* Active filter banner */}
          {hasFilter && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border flex-1 max-w-md" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' }}>
              <span className="text-red-400 text-[9px] uppercase tracking-wider font-semibold">Filter Active:</span>
              <span className="text-slate-300 text-[10px] flex-1 truncate">{filterSummary}</span>
              <button onClick={clearFilter} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X size={12} />
              </button>
            </div>
          )}

          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-slate-600">Last updated:</span>
              <span className="text-slate-400 font-mono">{lastRefresh.toLocaleTimeString()}</span>
            </div>
            <LiveClock />
            <button
              onClick={handleManualRefresh}
              className={`p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all ${refreshing ? 'animate-spin text-indigo-400' : ''}`}
            >
              <RefreshCw size={13} />
            </button>
            {/* Bell — opens Alert Center */}
            <button
              onClick={() => setNotifOpen(true)}
              className="relative p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Bell size={15} className={unreadCount > 0 ? 'text-slate-300' : 'text-slate-500'} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 rounded-full text-[7px] font-bold flex items-center justify-center text-white tabular-nums">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1920px] mx-auto px-6 py-6 space-y-8">
        <ExecutiveScorecard lastUpdated={lastRefresh.getTime()} />
        <div className="h-px bg-white/[0.04]" />
        <ThreatCommand lastUpdated={lastRefresh.getTime()} />
        <div className="h-px bg-white/[0.04]" />
        <VulnManagement lastUpdated={lastRefresh.getTime()} />
        <div className="h-px bg-white/[0.04]" />
        <AppSecSupplyChain lastUpdated={lastRefresh.getTime()} />
        <div className="h-px bg-white/[0.04]" />
        <AIBriefing lastUpdated={lastRefresh.getTime()} />
        <div className="h-12" />
      </main>

      {/* Notification slide-out */}
      <NotificationCenter
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
        onChange={setNotifications}
      />
    </div>
  )
}
