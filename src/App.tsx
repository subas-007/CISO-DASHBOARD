import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { FilterProvider } from './context/FilterContext'
import { AuthProvider } from './context/AuthContext'
import { DrillDownProvider } from './context/DrillDownContext'
import { DrillDownPanel } from './components/ui/DrillDownPanel'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import PageSkeleton from './components/ui/PageSkeleton'

const CISODashboard  = lazy(() => import('./pages/CISODashboard').then(m => ({ default: m.CISODashboard })))
const Login          = lazy(() => import('./pages/Login'))
const UserManagement = lazy(() => import('./pages/UserManagement'))
const Integrations   = lazy(() => import('./pages/Integrations'))
const APIManagement  = lazy(() => import('./pages/APIManagement'))
const ThreatFeeds    = lazy(() => import('./pages/ThreatFeeds'))
const Reports        = lazy(() => import('./pages/Reports'))
const Settings       = lazy(() => import('./pages/Settings'))

export default function App() {
  return (
    <AuthProvider>
      <FilterProvider>
        <DrillDownProvider>
          <BrowserRouter>
            <DrillDownPanel />
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route index element={<CISODashboard />} />
                  <Route path="users"        element={<ProtectedRoute requiredSection="users"><UserManagement /></ProtectedRoute>} />
                  <Route path="integrations" element={<ProtectedRoute requiredSection="integrations"><Integrations /></ProtectedRoute>} />
                  <Route path="api"          element={<ProtectedRoute requiredSection="api"><APIManagement /></ProtectedRoute>} />
                  <Route path="threat-feeds" element={<ProtectedRoute requiredSection="threat-feeds"><ThreatFeeds /></ProtectedRoute>} />
                  <Route path="reports"      element={<ProtectedRoute requiredSection="reports"><Reports /></ProtectedRoute>} />
                  <Route path="settings"     element={<ProtectedRoute requiredSection="settings"><Settings /></ProtectedRoute>} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </DrillDownProvider>
      </FilterProvider>
    </AuthProvider>
  )
}
