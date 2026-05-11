import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import './styles/shared.css'
import LoginPage    from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage     from './pages/HomePage'

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <span className="spinner-dark" />
    </div>
  )
}

function PrivateRoute({ children }) {
  const { usuario, carregando } = useAuth()
  if (carregando) return <LoadingScreen />
  return usuario ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { usuario, carregando } = useAuth()
  if (carregando) return <LoadingScreen />
  return usuario ? <Navigate to="/" replace /> : children
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
