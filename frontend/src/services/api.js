const BASE = import.meta.env.VITE_API_URL ?? ''
export const TOKEN_KEY = 'safecash_token'

// Disparado quando o backend recusa o token (expirado, inválido ou usuário removido)
export const SESSAO_EXPIRADA = 'safecash:sessao-expirada'

/** Monta "?a=1&b=2" ignorando parâmetros vazios. */
function queryString(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ).toString()
  return qs ? `?${qs}` : ''
}

async function enviar(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY)
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401 && token) {
    localStorage.removeItem(TOKEN_KEY)
    window.dispatchEvent(new Event(SESSAO_EXPIRADA))
  }
  return res
}

async function request(path, options = {}) {
  const res = await enviar(path, options)
  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    const erro = new Error(body.erro ?? body.message ?? `Erro ${res.status}`)
    erro.status = res.status
    erro.body = body
    throw erro
  }

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
  // Autenticação (bcrypt + JWT)
  login: (email, senha) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) }),
  register: (nome, email, senha, cpf, telefone) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify({ nome, email, senha, cpf, telefone }) }),
  me: () => request('/api/me'),

  // Dashboard consolidado e relatórios
  dashboard: () => request('/api/dashboard'),
  relatorioMensal: (meses = 6) => request(`/api/relatorios/mensal${queryString({ meses })}`),
  baixarExtratoCsv: async (dataInicio, dataFim) => {
    const res = await enviar(`/api/relatorios/extrato${queryString({ dataInicio, dataFim, formato: 'csv' })}`)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.erro ?? `Erro ${res.status}`)
    }
    return res.blob()
  },

  // CRUD Inteligente de Transações (com filtros, busca e paginação)
  transacoes: (filtros) => request(`/api/transacoes${queryString(filtros)}`),
  obterTransacao: (id) => request(`/api/transacoes/${id}`),
  criarTransacao: (dados) =>
    request('/api/transacoes', { method: 'POST', body: JSON.stringify(dados) }),
  atualizarTransacao: (id, dados) =>
    request(`/api/transacoes/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  excluirTransacao: (id) =>
    request(`/api/transacoes/${id}`, { method: 'DELETE' }),

  // Trilha de Auditoria
  auditoriaTransacao: (id) =>
    request(`/api/transacoes/${id}/auditoria`),

  // Administração (somente perfil ADMIN)
  admin: {
    dashboard: () => request('/api/admin/dashboard'),
    usuarios: (params) => request(`/api/admin/usuarios${queryString(params)}`),
    alterarPerfil: (id, perfil) =>
      request(`/api/admin/usuarios/${id}/perfil`, { method: 'PATCH', body: JSON.stringify({ perfil }) }),
    auditoria: (params) => request(`/api/admin/auditoria${queryString(params)}`),
    metricas: () => request('/api/admin/metricas'),
  },
}
