import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { DashboardUser } from '../types/auth'
import { ROLE_PERMISSIONS } from '../types/auth'
import { mockUsers } from '../data/authMockData'

interface AuthContextValue {
  user: DashboardUser | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
  can: (section: string) => boolean
  canExport: boolean
  canManageUsers: boolean
  canManageIntegrations: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Default to null — user must log in
  const [user, setUser] = useState<DashboardUser | null>(null)

  const login = useCallback(async (email: string, _password: string): Promise<boolean> => {
    // Simulate async auth (replace with real API call)
    await new Promise(r => setTimeout(r, 800))
    const found = mockUsers.find(u => u.email === email && u.active)
    if (found) { setUser(found); return true }
    return false
  }, [])

  const logout = useCallback(() => setUser(null), [])

  const can = useCallback((section: string): boolean => {
    if (!user) return false
    return ROLE_PERMISSIONS[user.role].canView.includes(section)
  }, [user])

  const perms = user ? ROLE_PERMISSIONS[user.role] : { canExport: false, canManageUsers: false, canManageIntegrations: false }

  return (
    <AuthContext.Provider value={{
      user, login, logout,
      isAuthenticated: !!user,
      can,
      canExport: perms.canExport,
      canManageUsers: perms.canManageUsers,
      canManageIntegrations: perms.canManageIntegrations,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
