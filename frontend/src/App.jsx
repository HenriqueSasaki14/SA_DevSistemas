import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/auth-context'
import './styles/shared.css'
import LoginPage    from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage     from './pages/HomePage'

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-marca">
        <span className="spinner-dark" />
        <span className="loading-texto">SafeCash</span>
      </div>
    </div>
  )
}

// Reanima o conteúdo a cada troca de rota
function TransicaoRota({ children }) {
  const { pathname } = useLocation()
  return <div className="route-fade" key={pathname}>{children}</div>
}

function PrivateRoute({ children }) {
  const { usuario, carregando } = useAuth()
  if (carregando) return <LoadingScreen />
  return usuario ? <TransicaoRota>{children}</TransicaoRota> : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { usuario, carregando } = useAuth()
  if (carregando) return <LoadingScreen />
  return usuario ? <Navigate to="/" replace /> : <TransicaoRota>{children}</TransicaoRota>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"         element={<PrivateRoute><HomePage /></PrivateRoute>} />
          <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="*"         element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
