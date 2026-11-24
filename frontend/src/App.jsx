import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastProvider'
import { useAuth } from './contexts/auth'
import './styles/shared.css'
import './styles/componentes.css'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import AdminPage from './pages/AdminPage'

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <span className="spinner-dark" />
    </div>
  )
}

/** Exige login; com `perfil`, exige também o perfil (RBAC no frontend - o backend valida de novo). */
function PrivateRoute({ children, perfil }) {
  const { usuario, carregando } = useAuth()
  if (carregando) return <LoadingScreen />
  if (!usuario) return <Navigate to="/login" replace />
  if (perfil && usuario.perfil !== perfil) return <Navigate to="/" replace />
  return children
}

function PublicRoute({ children }) {
  const { usuario, carregando } = useAuth()
  if (carregando) return <LoadingScreen />
  return usuario ? <Navigate to="/" replace /> : children
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute perfil="ADMIN"><AdminPage /></PrivateRoute>} />
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
