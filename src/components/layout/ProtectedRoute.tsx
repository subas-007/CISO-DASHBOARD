import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function ProtectedRoute({ children, requiredSection }: { children: React.ReactNode; requiredSection?: string }) {
  const { isAuthenticated, can } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (requiredSection && !can(requiredSection)) return <Navigate to="/" replace />
  return <>{children}</>
}
