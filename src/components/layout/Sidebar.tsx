import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Plug, Key, LogOut, ChevronLeft, ChevronRight, Shield, FileText, Settings } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import type { UserRole } from '../../types/auth'

const ROLE_COLORS: Record<UserRole, string> = {
  CISO: '#6366f1',
  SOC_ANALYST: '#ef4444',
  AUDITOR: '#f59e0b',
  EXECUTIVE: '#10b981',
}

const ROLE_LABELS: Record<UserRole, string> = {
  CISO: 'CISO',
  SOC_ANALYST: 'SOC Analyst',
  AUDITOR: 'Auditor',
  EXECUTIVE: 'Executive',
}

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
  section?: string
}

export function Sidebar() {
  const { user, logout, can } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const navItems: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { to: '/users', label: 'User Management', icon: <Users size={18} />, section: 'users' },
    { to: '/integrations', label: 'Integrations', icon: <Plug size={18} />, section: 'integrations' },
    { to: '/api', label: 'API Management', icon: <Key size={18} />, section: 'api' },
    { to: '/threat-feeds', label: 'Threat Feeds', icon: <Shield size={18} />, section: 'threat-feeds' },
    { to: '/reports', label: 'Reports', icon: <FileText size={18} />, section: 'reports' },
    { to: '/settings', label: 'Settings', icon: <Settings size={18} />, section: 'settings' },
  ]

  const visibleItems = navItems.filter(item => !item.section || can(item.section))

  const avatarInitials = user ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??'
  const roleColor = user ? ROLE_COLORS[user.role] : '#6366f1'
  const roleLabel = user ? ROLE_LABELS[user.role] : ''

  return (
    <aside
      className="flex flex-col border-r border-white/[0.06] h-screen sticky top-0 transition-all duration-200 shrink-0"
      style={{ background: 'rgba(10,15,30,0.98)', width: collapsed ? 64 : 220 }}
    >
      {/* Brand header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
          <Shield size={16} className="text-indigo-400" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-slate-100 text-xs font-bold tracking-tight whitespace-nowrap">CISO Command</p>
            <p className="text-slate-600 text-[9px] uppercase tracking-wider whitespace-nowrap">Security Ops</p>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 ring-1 ring-indigo-500/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`
            }
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 pb-2">
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/5 transition-all"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* User section */}
      <div className="border-t border-white/[0.06] p-3">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: `${roleColor}30`, border: `1px solid ${roleColor}40`, color: roleColor }}
          >
            {avatarInitials}
          </div>
          {!collapsed && user && (
            <div className="flex-1 min-w-0">
              <p className="text-slate-300 text-xs font-semibold truncate">{user.name}</p>
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: `${roleColor}20`, color: roleColor, border: `1px solid ${roleColor}30` }}
              >
                {roleLabel}
              </span>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={handleLogout}
            title="Sign out"
            className="mt-2 w-full flex items-center justify-center p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={14} />
          </button>
        )}
      </div>
    </aside>
  )
}
