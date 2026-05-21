import { useState, useCallback } from 'react'
import { mockUsers } from '../data/authMockData'
import type { DashboardUser, UserRole } from '../types/auth'

export interface CreateUserInput {
  name: string
  email: string
  role: UserRole
  mfaEnabled: boolean
}

export function useUsers() {
  const [users, setUsers] = useState<DashboardUser[]>(mockUsers)

  const createUser = useCallback((input: CreateUserInput) => {
    const newUser: DashboardUser = {
      id: `u${Date.now()}`,
      name: input.name,
      email: input.email,
      role: input.role,
      lastLogin: 'Never',
      createdAt: new Date().toISOString().slice(0, 10),
      active: true,
      mfaEnabled: input.mfaEnabled,
    }
    setUsers(prev => [...prev, newUser])
    return newUser
  }, [])

  const updateUser = useCallback((id: string, updates: Partial<DashboardUser>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u))
  }, [])

  const toggleActive = useCallback((id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, active: !u.active } : u))
  }, [])

  const deleteUser = useCallback((id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id))
  }, [])

  return { users, createUser, updateUser, toggleActive, deleteUser }
}
