import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../services/api'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('safecash_token')
    if (!token) {
      setCarregando(false)
      return
    }
    api.me()
      .then((data) => setUsuario({ id: data.id, nome: data.nome, email: data.email }))
      .catch(() => localStorage.removeItem('safecash_token'))
      .finally(() => setCarregando(false))
  }, [])

  async function login(token) {
    localStorage.setItem('safecash_token', token)
    const data = await api.me()
    setUsuario({ id: data.id, nome: data.nome, email: data.email })
  }

  function logout() {
    localStorage.removeItem('safecash_token')
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
