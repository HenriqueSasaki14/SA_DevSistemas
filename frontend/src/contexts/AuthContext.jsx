import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api, TOKEN_KEY, SESSAO_EXPIRADA, expiracaoDoToken } from '../services/api'

export const AuthContext = createContext(null)

function tokenValido(token) {
  const exp = token && expiracaoDoToken(token)
  return Boolean(exp && exp > Date.now())
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [carregando, setCarregando] = useState(() => tokenValido(localStorage.getItem(TOKEN_KEY)))

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUsuario(null)
  }, [])

  // Ao abrir o app: valida o token salvo buscando o usuário
  useEffect(() => {
    const salvo = localStorage.getItem(TOKEN_KEY)
    if (!tokenValido(salvo)) {
      localStorage.removeItem(TOKEN_KEY)
      return
    }
    api.me()
      .then((data) => setUsuario({ id: data.id, nome: data.nome, email: data.email }))
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [])

  // Backend recusou o token em qualquer requisição -> encerra a sessão
  useEffect(() => {
    window.addEventListener(SESSAO_EXPIRADA, logout)
    return () => window.removeEventListener(SESSAO_EXPIRADA, logout)
  }, [logout])

  // Encerra a sessão automaticamente quando o token expira
  useEffect(() => {
    const exp = token && expiracaoDoToken(token)
    if (!exp) return
    const timer = setTimeout(logout, Math.min(exp - Date.now(), 2 ** 31 - 1))
    return () => clearTimeout(timer)
  }, [token, logout])

  async function login(novoToken) {
    localStorage.setItem(TOKEN_KEY, novoToken)
    setToken(novoToken)
    const data = await api.me()
    setUsuario({ id: data.id, nome: data.nome, email: data.email })
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
