const BASE = import.meta.env.VITE_API_URL ?? ''

async function request(path, options = {}) {
  const token = localStorage.getItem('safecash_token')
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.erro ?? body.message ?? `Erro ${res.status}`)
  return body
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
