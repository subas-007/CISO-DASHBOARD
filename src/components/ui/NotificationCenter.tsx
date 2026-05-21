import { X, Bell, AlertTriangle, Shield, Activity, Info, CheckCircle, BellOff } from 'lucide-react'

type NotifType = 'critical_cve' | 'sla_breach' | 'incident' | 'compliance_drift' | 'system'

export interface Notification {
  id: string
  type: NotifType
  title: string
  body: string
  time: string
  read: boolean
}

export const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'critical_cve',    title: 'CVE-2024-3400 Detected',           body: 'Critical PAN-OS vuln confirmed in T0 asset core-banking-api. Exploit PoC public.',              time: '2 min ago',  read: false },
  { id: 'n2', type: 'sla_breach',      title: 'SLA Breach Threshold Exceeded',    body: '908 vulnerabilities past remediation SLA — 5% above policy limit (SEC-P-003).',              time: '18 min ago', read: false },
  { id: 'n3', type: 'incident',        title: 'P1 Incident Created: INC-0047',    body: 'Suspicious lateral movement detected in payment-service namespace. SOC engaged.',             time: '1 hr ago',   read: false },
  { id: 'n4', type: 'compliance_drift',title: 'PCI-DSS Compliance Drift',         body: 'Vulnerability Management score dropped to 64% (target 90%). Q2 QSA audit at risk.',           time: '3 hr ago',   read: true  },
  { id: 'n5', type: 'system',          title: 'Threat Feed Refreshed',            body: 'AlienVault OTX: 23 new IOCs added matching SWIFT / banking sector TTPs.',                    time: '5 hr ago',   read: true  },
  { id: 'n6', type: 'critical_cve',    title: 'New Critical CVE Published',       body: 'CVE-2025-1789 (CVSS 9.8) — affects OpenSSL versions present in 3 T1 repos.',                time: '8 hr ago',   read: true  },
  { id: 'n7', type: 'sla_breach',      title: 'Vendor SLA Overdue',              body: 'Core Banking SaaS — unencrypted API key finding overdue since Apr 30, 2026.',                time: '1 day ago',  read: true  },
]

const TYPE_CONFIG: Record<NotifType, { icon: React.ReactNode; color: string }> = {
  critical_cve:     { icon: <AlertTriangle size={13} />, color: '#ef4444' },
  sla_breach:       { icon: <Shield size={13} />,        color: '#f59e0b' },
  incident:         { icon: <Activity size={13} />,      color: '#ec4899' },
  compliance_drift: { icon: <Info size={13} />,          color: '#6366f1' },
  system:           { icon: <CheckCircle size={13} />,   color: '#10b981' },
}

interface Props {
  open: boolean
  onClose: () => void
  notifications: Notification[]
  onChange: (n: Notification[]) => void
}

export function NotificationCenter({ open, onClose, notifications, onChange }: Props) {
  const unreadCount = notifications.filter(n => !n.read).length

  const markAllRead = () => onChange(notifications.map(n => ({ ...n, read: true })))
  const dismiss = (id: string) => onChange(notifications.filter(n => n.id !== id))
  const markRead = (id: string) => onChange(notifications.map(n => n.id === id ? { ...n, read: true } : n))

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.35)' }}
          onClick={onClose}
        />
      )}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{
          width: 380,
          background: '#0d1324',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: open ? '-8px 0 40px rgba(0,0,0,0.5)' : 'none',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
          <Bell size={15} className="text-indigo-400" />
          <span className="text-slate-200 text-sm font-semibold">Alert Center</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
              {unreadCount} unread
            </span>
          )}
          <div className="ml-auto flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600">
              <BellOff size={32} />
              <p className="text-sm">All clear — no notifications</p>
            </div>
          ) : (
            notifications.map(n => {
              const cfg = TYPE_CONFIG[n.type]
              return (
                <div
                  key={n.id}
                  className="px-4 py-3 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer"
                  style={{ background: n.read ? 'transparent' : 'rgba(99,102,241,0.05)' }}
                  onClick={() => markRead(n.id)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="mt-0.5 p-1.5 rounded-lg flex-shrink-0"
                      style={{ background: `${cfg.color}18` }}
                    >
                      <span style={{ color: cfg.color }}>{cfg.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-xs font-semibold leading-tight ${n.read ? 'text-slate-400' : 'text-slate-200'}`}>
                          {n.title}
                        </p>
                        <button
                          onClick={e => { e.stopPropagation(); dismiss(n.id) }}
                          className="text-slate-700 hover:text-slate-400 flex-shrink-0 mt-0.5 transition-colors"
                        >
                          <X size={11} />
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] text-slate-700">{n.time}</span>
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/[0.06] flex-shrink-0">
          <p className="text-[9px] text-slate-700 text-center">
            Sources: SIEM · Vulnerability Scanner · Compliance Engine · Threat Feeds
          </p>
        </div>
      </div>
    </>
  )
}
