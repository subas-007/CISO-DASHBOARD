import { useState, useMemo } from 'react'
import { Users, CheckCircle2, XCircle, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { ROLE_PERMISSIONS } from '../types/auth'
import type { UserRole, DashboardUser } from '../types/auth'
import { activityLogs } from '../data/authMockData'
import { useUsers } from '../hooks/useUsers'

const ROLES: UserRole[] = ['CISO', 'SOC_ANALYST', 'AUDITOR', 'EXECUTIVE']

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

const CAPABILITY_ROWS = [
  { label: 'Section A - Executive Scorecard', section: 'executive' },
  { label: 'Section B - Threat Command', section: 'threat' },
  { label: 'Section C - Vuln Management', section: 'vuln' },
  { label: 'Section D - AppSec', section: 'appsec' },
  { label: 'User Management', section: 'users' },
  { label: 'Integrations', section: 'integrations' },
  { label: 'API Management', section: 'api' },
  { label: 'Export Data', section: '__export__' },
]

const SEV_STYLES = {
  info: { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: 'rgba(100,116,139,0.3)' },
  warning: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  critical: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
}

const PAGE_SIZE = 15

function fmtDate(iso: string) {
  if (iso === 'Never') return 'Never'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function canCapability(role: UserRole, section: string): boolean {
  if (section === '__export__') return ROLE_PERMISSIONS[role].canExport
  return ROLE_PERMISSIONS[role].canView.includes(section)
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ─── Style constants ──────────────────────────────────────────────────────────
const inputCls = 'w-full px-3 py-2 rounded-lg text-sm text-slate-200 bg-white/5 border border-white/10 focus:border-indigo-500/50 focus:outline-none placeholder:text-slate-600'
const labelCls = 'block text-xs font-medium text-slate-400 mb-1'
const primaryBtn = 'px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors'
const secondaryBtn = 'px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-white/10 transition-colors'
const dangerBtn = 'px-4 py-2 rounded-lg text-sm font-semibold bg-red-600/80 hover:bg-red-600 text-white transition-colors'

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
      style={{ background: on ? '#10b981' : 'rgba(100,116,139,0.4)' }}
      onClick={() => onChange(!on)}
    >
      <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: on ? '22px' : '2px' }} />
    </div>
  )
}

// ─── Create User Modal ────────────────────────────────────────────────────────
interface CreateUserModalProps {
  onClose: () => void
  onCreate: (input: { name: string; email: string; role: UserRole; mfaEnabled: boolean }) => DashboardUser
}

function CreateUserModal({ onClose, onCreate }: CreateUserModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('SOC_ANALYST')
  const [mfa, setMfa] = useState(true)
  const [created, setCreated] = useState<{ user: DashboardUser; password: string } | null>(null)

  const handleSubmit = () => {
    if (!name.trim() || !email.trim()) return
    const user = onCreate({ name: name.trim(), email: email.trim(), role, mfaEnabled: mfa })
    const password = generateTempPassword()
    setCreated({ user, password })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="max-w-lg w-full mx-4 rounded-xl flex flex-col" style={{ background: 'rgba(10,15,30,0.98)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <p className="text-slate-200 text-sm font-semibold">Add New User</p>
          <button onClick={onClose} className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"><X size={16} /></button>
        </div>

        {created ? (
          <div className="px-5 py-6 space-y-4">
            <div className="rounded-lg px-4 py-3" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <p className="text-emerald-400 text-sm font-semibold">User created successfully!</p>
              <p className="text-slate-400 text-xs mt-1">{created.user.name} ({created.user.email}) has been added.</p>
            </div>
            <div>
              <label className={labelCls}>Temporary Password <span className="text-amber-400">(shown once)</span></label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <code className="text-amber-300 text-sm font-mono flex-1">{created.password}</code>
              </div>
              <p className="text-slate-600 text-[10px] mt-1">Share this securely. User will be prompted to change on first login.</p>
            </div>
            <div className="flex justify-end">
              <button onClick={onClose} className={primaryBtn}>Done</button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className={labelCls}>Name <span className="text-red-400">*</span></label>
                <input className={inputCls} placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Email <span className="text-red-400">*</span></label>
                <input className={inputCls} type="email" placeholder="user@bank.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Role</label>
                <select className={inputCls} value={role} onChange={e => setRole(e.target.value as UserRole)}>
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <label className={labelCls + ' mb-0'}>Require MFA</label>
                <Toggle on={mfa} onChange={setMfa} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/[0.06]">
              <button onClick={onClose} className={secondaryBtn}>Cancel</button>
              <button onClick={handleSubmit} disabled={!name.trim() || !email.trim()} className={primaryBtn + ' disabled:opacity-50'}>Create User</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────
interface EditUserModalProps {
  user: DashboardUser
  onClose: () => void
  onSave: (id: string, updates: Partial<DashboardUser>) => void
}

function EditUserModal({ user, onClose, onSave }: EditUserModalProps) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState<UserRole>(user.role)
  const [mfa, setMfa] = useState(user.mfaEnabled)
  const [resetPwd, setResetPwd] = useState<string | null>(null)

  const handleSave = () => {
    onSave(user.id, { name: name.trim(), email: email.trim(), role, mfaEnabled: mfa })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="max-w-lg w-full mx-4 rounded-xl flex flex-col" style={{ background: 'rgba(10,15,30,0.98)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <p className="text-slate-200 text-sm font-semibold">Edit User</p>
          <button onClick={onClose} className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className={labelCls}>Name</label>
            <input className={inputCls} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Role</label>
            <select className={inputCls} value={role} onChange={e => setRole(e.target.value as UserRole)}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <label className={labelCls + ' mb-0'}>MFA Enabled</label>
            <Toggle on={mfa} onChange={setMfa} />
          </div>
          <div>
            <button
              className={secondaryBtn + ' text-xs py-1.5'}
              onClick={() => setResetPwd(generateTempPassword())}
            >
              Reset Password
            </button>
            {resetPwd && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <code className="text-amber-300 text-sm font-mono flex-1">{resetPwd}</code>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/[0.06]">
          <button onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button onClick={handleSave} className={primaryBtn}>Save Changes</button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
interface DeleteModalProps {
  user: DashboardUser
  onClose: () => void
  onDelete: (id: string) => void
}

function DeleteConfirmModal({ user, onClose, onDelete }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="max-w-md w-full mx-4 rounded-xl flex flex-col" style={{ background: 'rgba(10,15,30,0.98)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <p className="text-slate-200 text-sm font-semibold">Delete User</p>
          <button onClick={onClose} className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"><X size={16} /></button>
        </div>
        <div className="px-5 py-6">
          <p className="text-slate-300 text-sm">
            Are you sure you want to delete <span className="font-semibold text-white">{user.name}</span>? This action cannot be undone.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/[0.06]">
          <button onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button onClick={() => { onDelete(user.id); onClose() }} className={dangerBtn}>Delete User</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UserManagement() {
  const { users, createUser, updateUser, toggleActive, deleteUser } = useUsers()
  const [sevFilter, setSevFilter] = useState<'all' | 'info' | 'warning' | 'critical'>('all')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<DashboardUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DashboardUser | null>(null)

  const filteredLogs = useMemo(() =>
    sevFilter === 'all' ? activityLogs : activityLogs.filter(l => l.severity === sevFilter),
    [sevFilter]
  )

  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE)
  const pageLogs = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="min-h-screen" style={{ background: '#0a0f1e' }}>
      {/* Page header */}
      <div className="sticky top-0 z-40 border-b border-white/[0.06] px-6 py-3 flex items-center gap-3" style={{ background: 'rgba(10,15,30,0.95)', backdropFilter: 'blur(20px)' }}>
        <span className="text-slate-600 text-xs">Dashboard</span>
        <span className="text-slate-700 text-xs">/</span>
        <span className="text-slate-300 text-xs font-semibold">User Management</span>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-slate-500" />
            <span className="text-slate-500 text-xs">{users.length} users</span>
          </div>
          <button onClick={() => setShowCreate(true)} className={primaryBtn + ' text-xs py-1.5'}>
            + Add User
          </button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

        {/* Section 1: RBAC Role Matrix */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.05]">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">RBAC Role Permission Matrix</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <th className="px-5 py-3 text-left text-slate-600 font-medium text-[10px] uppercase tracking-wider w-64">Capability</th>
                  {ROLES.map(role => (
                    <th key={role} className="px-4 py-3 text-center" style={{ minWidth: 120 }}>
                      <span className="text-[10px] font-bold px-2 py-1 rounded" style={{ background: `${ROLE_COLORS[role]}20`, color: ROLE_COLORS[role], border: `1px solid ${ROLE_COLORS[role]}30` }}>
                        {ROLE_LABELS[role]}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CAPABILITY_ROWS.map((row, i) => (
                  <tr key={row.section} className="border-t border-white/[0.04]" style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td className="px-5 py-3 text-slate-400 font-medium">{row.label}</td>
                    {ROLES.map(role => {
                      const ok = canCapability(role, row.section)
                      return (
                        <td key={role} className="px-4 py-3 text-center">
                          {ok
                            ? <CheckCircle2 size={16} className="mx-auto text-emerald-500" />
                            : <XCircle size={16} className="mx-auto text-slate-700" />
                          }
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: User List */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.05] flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Platform Users</p>
            <span className="text-slate-600 text-[10px]">{users.filter(u => u.active).length} active · {users.filter(u => !u.active).length} inactive</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {['Name / Email', 'Role', 'Status', 'MFA', 'Last Login', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-slate-600 font-medium text-[10px] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => {
                  const rc = ROLE_COLORS[u.role]
                  return (
                    <tr key={u.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors" style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <td className="px-5 py-3">
                        <p className="text-slate-200 font-medium">{u.name}</p>
                        <p className="text-slate-500 text-[10px] font-mono">{u.email}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[10px] font-bold px-2 py-1 rounded" style={{ background: `${rc}20`, color: rc, border: `1px solid ${rc}30` }}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-[10px] font-semibold px-2 py-1 rounded"
                          style={{ background: u.active ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)', border: `1px solid ${u.active ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.2)'}`, color: u.active ? '#10b981' : '#64748b' }}>
                          {u.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {u.mfaEnabled
                          ? <CheckCircle2 size={15} className="text-emerald-500" />
                          : <XCircle size={15} className="text-red-500/60" />
                        }
                      </td>
                      <td className="px-5 py-3 text-slate-400 font-mono text-[10px]">
                        {fmtDate(u.lastLogin)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditUser(u)}
                            className="px-2 py-1 text-[10px] rounded text-indigo-400 hover:bg-indigo-500/10 transition-colors border border-indigo-500/20"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleActive(u.id)}
                            className="px-2 py-1 text-[10px] rounded text-slate-500 hover:bg-white/5 transition-colors border border-white/10"
                          >
                            {u.active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="px-2 py-1 text-[10px] rounded text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-colors border border-red-500/20"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Activity Log */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.05] flex items-center gap-4 flex-wrap">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Activity Log</p>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-slate-600 text-[10px]">Filter:</span>
              {(['all', 'info', 'warning', 'critical'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => { setSevFilter(s); setPage(1) }}
                  className={`px-2 py-1 rounded text-[10px] font-semibold capitalize transition-all ${sevFilter === s ? 'text-slate-100' : 'text-slate-600 hover:text-slate-400'}`}
                  style={sevFilter === s ? {
                    background: s === 'all' ? 'rgba(99,102,241,0.2)' : s === 'info' ? 'rgba(100,116,139,0.2)' : s === 'warning' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)',
                    border: `1px solid ${s === 'all' ? 'rgba(99,102,241,0.4)' : s === 'info' ? 'rgba(100,116,139,0.4)' : s === 'warning' ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)'}`,
                  } : { border: '1px solid transparent' }}
                >
                  {s}
                </button>
              ))}
              <span className="text-slate-600 text-[10px] ml-2">{filteredLogs.length} entries</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {['Timestamp', 'User', 'Action', 'Resource', 'IP Address', 'Severity'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-slate-600 font-medium text-[10px] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageLogs.map((log, i) => {
                  const s = SEV_STYLES[log.severity]
                  return (
                    <tr key={log.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors" style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <td className="px-5 py-3 text-slate-500 font-mono text-[10px] whitespace-nowrap">{fmtDate(log.timestamp)}</td>
                      <td className="px-5 py-3 text-slate-300 whitespace-nowrap">{log.userName}</td>
                      <td className="px-5 py-3 text-slate-400 max-w-xs truncate">{log.action}</td>
                      <td className="px-5 py-3 text-slate-500 text-[10px]">{log.resource}</td>
                      <td className="px-5 py-3 text-slate-600 font-mono text-[10px]">{log.ipAddress}</td>
                      <td className="px-5 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize"
                          style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                          {log.severity}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="px-5 py-3 border-t border-white/[0.05] flex items-center justify-between">
            <span className="text-slate-600 text-[10px]">
              Page {page} of {totalPages} · {filteredLogs.length} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded text-slate-500 hover:text-slate-300 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded text-slate-500 hover:text-slate-300 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreate={createUser}
        />
      )}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={updateUser}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDelete={deleteUser}
        />
      )}
    </div>
  )
}
