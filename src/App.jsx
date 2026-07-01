import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import FirebaseSetupNotice from './components/FirebaseSetupNotice.jsx'
import Navbar from './components/Navbar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { AuthProvider } from './contexts/AuthProvider.jsx'
import { useAuth } from './contexts/useAuth.js'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminUsers from './pages/AdminUsers.jsx'
import FirebaseDiagnostics from './pages/FirebaseDiagnostics.jsx'
import Login from './pages/Login.jsx'
import PieceDetails from './pages/PieceDetails.jsx'
import PieceForm from './pages/PieceForm.jsx'
import PublicHome from './pages/PublicHome.jsx'
import Register from './pages/Register.jsx'
import './styles/global.css'

function AppRoutes() {
  const { isFirebaseConfigured } = useAuth()

  if (!isFirebaseConfigured) {
    return <FirebaseSetupNotice />
  }

  return (
    <Routes>
      <Route path="/" element={<PublicHome />} />
      <Route path="/peca/:id" element={<PieceDetails />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Register />} />
      <Route path="/diagnostico" element={<FirebaseDiagnostics />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pecas/nova"
        element={
          <ProtectedRoute>
            <PieceForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pecas/:id/editar"
        element={
          <ProtectedRoute>
            <PieceForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/professores"
        element={
          <ProtectedRoute requireSuperAdmin>
            <AdminUsers />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <main className="app-shell">
          <AppRoutes />
        </main>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
