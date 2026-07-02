import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth.js'

export default function ProtectedRoute({ children, requireSuperAdmin = false }) {
  const { isAdmin, isSuperAdmin, loading, profile } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="grid min-h-[calc(100vh-73px)] place-items-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-500 shadow-soft">
          Verificando permissão...
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/admin" replace />
  }

  if (profile?.mustChangePassword && location.pathname !== '/alterar-senha') {
    return <Navigate to="/alterar-senha" replace state={{ from: location.pathname }} />
  }

  if (!profile?.mustChangePassword && location.pathname === '/alterar-senha') {
    return <Navigate to="/admin" replace />
  }

  return children
}



