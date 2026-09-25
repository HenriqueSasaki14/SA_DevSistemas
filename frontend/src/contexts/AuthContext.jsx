import { useState, useEffect, useCallback } from 'react'
import { api, TOKEN_KEY, SESSAO_EXPIRADA, expiracaoDoToken } from '../services/api'
import { AuthContext } from './auth-context'

function tokenValido(token) {
  const exp = token && expiracaoDoToken(token)
  return Boolean(exp && exp > Date.now())
}

export function AuthProvider({ children }) {
  // Lê o token salvo uma única vez; se já estiver vencido, descarta na hora
  const [inicial] = useState(() => {
    const salvo = localStorage.getItem(TOKEN_KEY)
    if (salvo && !tokenValido(salvo)) {
      localStorage.removeItem(TOKEN_KEY)
      return { token: null, expirou: true }
    }
    return { token: salvo, expirou: false }
  })

  const [token, setToken] = useState(inicial.token)
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(Boolean(inicial.token))
  // 'expirada' quando a sessão caiu sozinha; a tela de login usa isso para avisar
  const [motivoSaida, setMotivoSaida] = useState(inicial.expirou ? 'expirada' : null)

  const encerrarSessao = useCallback((motivo = null) => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUsuario(null)
    setMotivoSaida(motivo)
  }, [])

  const logout = useCallback(() => encerrarSessao(), [encerrarSessao])
  const limparMotivoSaida = useCallback(() => setMotivoSaida(null), [])

  // Ao abrir o app: confirma no backend quem é o dono do token salvo
  useEffect(() => {
    if (!inicial.token) return
    api.me()
      .then((data) => setUsuario({ id: data.id, nome: data.nome, email: data.email }))
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [inicial.token])

  // Backend recusou o token em qualquer requisição -> encerra a sessão
  useEffect(() => {
    const aoExpirar = () => encerrarSessao('expirada')
    window.addEventListener(SESSAO_EXPIRADA, aoExpirar)
    return () => window.removeEventListener(SESSAO_EXPIRADA, aoExpirar)
  }, [encerrarSessao])

  // Encerra a sessão automaticamente no instante em que o token expira
  useEffect(() => {
    const exp = token && expiracaoDoToken(token)
    if (!exp) return
    const timer = setTimeout(() => encerrarSessao('expirada'), Math.min(exp - Date.now(), 2 ** 31 - 1))
    return () => clearTimeout(timer)
  }, [token, encerrarSessao])

  async function login(novoToken) {
    localStorage.setItem(TOKEN_KEY, novoToken)
    setToken(novoToken)
    setMotivoSaida(null)
    const data = await api.me()
    setUsuario({ id: data.id, nome: data.nome, email: data.email })
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, motivoSaida, login, logout, limparMotivoSaida }}>
      {children}
    </AuthContext.Provider>
  )
}
