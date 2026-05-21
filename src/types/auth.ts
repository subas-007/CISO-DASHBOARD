export type UserRole = 'CISO' | 'SOC_ANALYST' | 'AUDITOR' | 'EXECUTIVE'

export interface DashboardUser {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  lastLogin: string
  createdAt: string
  active: boolean
  mfaEnabled: boolean
}

export interface ActivityLog {
  id: string
  userId: string
  userName: string
  action: string
  resource: string
  timestamp: string
  ipAddress: string
  userAgent: string
  severity: 'info' | 'warning' | 'critical'
}

export interface RolePermission {
  role: UserRole
  canView: string[]   // section/page names
  canExport: boolean
  canManageUsers: boolean
  canManageIntegrations: boolean
}

// RBAC permission map
export const ROLE_PERMISSIONS: Record<UserRole, RolePermission> = {
  CISO: {
    role: 'CISO',
    canView: ['executive', 'threat', 'vuln', 'appsec', 'users', 'integrations', 'api', 'threat-feeds', 'reports', 'settings'],
    canExport: true,
    canManageUsers: true,
    canManageIntegrations: true,
  },
  SOC_ANALYST: {
    role: 'SOC_ANALYST',
    canView: ['threat', 'vuln', 'appsec', 'threat-feeds'],
    canExport: false,
    canManageUsers: false,
    canManageIntegrations: false,
  },
  AUDITOR: {
    role: 'AUDITOR',
    canView: ['executive', 'vuln', 'users', 'reports'],
    canExport: true,
    canManageUsers: false,
    canManageIntegrations: false,
  },
  EXECUTIVE: {
    role: 'EXECUTIVE',
    canView: ['executive', 'reports'],
    canExport: false,
    canManageUsers: false,
    canManageIntegrations: false,
  },
}
