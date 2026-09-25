const BASE = import.meta.env.VITE_API_URL ?? ''
export const TOKEN_KEY = 'safecash_token'

// Disparado quando o backend recusa o token (expirado, inválido ou usuário removido)
export const SESSAO_EXPIRADA = 'safecash:sessao-expirada'

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const body = await res.json().catch(() => ({}))
  if (res.status === 401 && token) {
    localStorage.removeItem(TOKEN_KEY)
    window.dispatchEvent(new Event(SESSAO_EXPIRADA))
  }
  if (!res.ok) throw new Error(body.erro ?? body.message ?? `Erro ${res.status}`)
  return body
}

// Lê a data de expiração (em ms) do payload do JWT, sem validar a assinatura
export function expiracaoDoToken(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(atob(payload))
    return exp ? exp * 1000 : null
  } catch {
    return null
  }
}

export const api = {
  login: (email, senha) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) }),
  register: (nome, email, senha) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify({ nome, email, senha }) }),
  me: () => request('/api/me'),
  dashboard: () => request('/api/dashboard'),
  transacoes: () => request('/api/transacoes'),
}
