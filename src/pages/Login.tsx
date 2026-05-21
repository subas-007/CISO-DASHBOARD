import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const DEMO_ACCOUNTS = [
  { email: 'sarah.chen@bank.com', role: 'CISO', access: 'Full access' },
  { email: 'marcus.osei@bank.com', role: 'SOC Analyst', access: 'Threat + Vuln only' },
  { email: 'david.kim@bank.com', role: 'Auditor', access: 'Executive + Vuln + Users' },
  { email: 'elena.voss@bank.com', role: 'Executive', access: 'Scorecard only' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const success = await login(email, password)
    setLoading(false)
    if (success) {
      navigate('/', { replace: true })
    } else {
      setError('Invalid email or account not found. Try one of the demo accounts below.')
      setShake(true)
      setTimeout(() => setShake(false), 600)
    }
  }

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail)
    setPassword('demo')
    setError('')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: '#0a0f1e' }}
    >
      <div className="w-full max-w-md">
        {/* Card */}
        <div
          className={`glass-card rounded-2xl p-8 transition-all ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
          style={shake ? { animation: 'shake 0.5s ease-in-out' } : {}}
        >
          {/* Logo + Title */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-4">
              <Shield size={28} className="text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">CISO Command Center</h1>
            <p className="text-slate-500 text-sm mt-1">Enterprise Security Operations</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg border text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.25)' }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="user@bank.com"
                required
                className="w-full px-4 py-2.5 rounded-lg text-slate-200 text-sm placeholder-slate-600 outline-none focus:ring-1 focus:ring-indigo-500/60 transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Any password (demo)"
                required
                className="w-full px-4 py-2.5 rounded-lg text-slate-200 text-sm placeholder-slate-600 outline-none focus:ring-1 focus:ring-indigo-500/60 transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{ background: loading ? 'rgba(99,102,241,0.6)' : '#6366f1' }}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo accounts helper */}
          <div className="mt-6 pt-5 border-t border-white/[0.06]">
            <p className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold mb-3">Demo Accounts (any password)</p>
            <div className="rounded-lg overflow-hidden border border-white/[0.06]">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <th className="px-3 py-2 text-left text-slate-600 font-medium text-[10px] uppercase tracking-wider">Email</th>
                    <th className="px-3 py-2 text-left text-slate-600 font-medium text-[10px] uppercase tracking-wider">Role</th>
                    <th className="px-3 py-2 text-left text-slate-600 font-medium text-[10px] uppercase tracking-wider">Access</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_ACCOUNTS.map((acc, i) => (
                    <tr
                      key={acc.email}
                      onClick={() => fillDemo(acc.email)}
                      className="cursor-pointer hover:bg-white/[0.03] transition-colors border-t border-white/[0.04]"
                      style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
                    >
                      <td className="px-3 py-2 text-indigo-400 font-mono text-[10px]">{acc.email}</td>
                      <td className="px-3 py-2 text-slate-300">{acc.role}</td>
                      <td className="px-3 py-2 text-slate-500 text-[10px]">{acc.access}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-slate-600 text-[10px] mt-2 text-center">Click a row to auto-fill email</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-4px); }
          90% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  )
}
