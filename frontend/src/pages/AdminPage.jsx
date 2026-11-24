import { useCallback, useState } from 'react'
import './HomePage.css'
import { api } from '../services/api'
import { useAuth } from '../contexts/auth'
import { useToast } from '../contexts/toast'
import { useDebounce } from '../hooks/useDebounce'
import { useRequisicao } from '../hooks/useRequisicao'
import { formatarData } from '../utils/datas'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import Skeleton from '../components/ui/Skeleton'
import Paginacao from '../components/ui/Paginacao'
import ListaAuditoria from '../components/transacoes/ListaAuditoria'

const POR_PAGINA = 10

function ResumoGlobal() {
  const { dados, erro } = useRequisicao(() => api.admin.dashboard(), 'admin-dashboard')
  if (erro) return <div className="state-msg state-error" role="alert">⚠ {erro.message}</div>
  if (!dados) return <Skeleton height="110px" borderRadius="10px" />

  const cards = [
    ['Saldo de toda a empresa', dados.saldoTotal],
    ['Entradas', dados.receitas],
    ['Saídas', dados.despesas],
    ['Usuários', dados.usuarios],
    ['Transações ativas', dados.transacoesAtivas],
    ['Excluídas (Soft Delete)', dados.transacoesExcluidas],
  ]
  return (
    <div className="stats-row admin-stats">
      {cards.map(([rotulo, valor]) => (
        <div className="stat-card" key={rotulo}>
          <span className="stat-label">{rotulo}</span>
          <span className="stat-value">{valor}</span>
        </div>
      ))}
    </div>
  )
}

function Usuarios() {
  const { usuario: eu } = useAuth()
  const toast = useToast()
  const [busca, setBusca] = useState('')
  const buscaDebounced = useDebounce(busca.trim())
  const [pagina, setPagina] = useState(1)
  const [versao, setVersao] = useState(0)

  const params = { pagina, limite: POR_PAGINA, busca: buscaDebounced }
  const { dados, erro, carregando } = useRequisicao(() => api.admin.usuarios(params), `${JSON.stringify(params)}-${versao}`)

  const alterarPerfil = useCallback(async (u, perfil) => {
    try {
      await api.admin.alterarPerfil(u.id, perfil)
      toast.sucesso(`${u.nome} agora é ${perfil}.`)
      setVersao((v) => v + 1)
    } catch (err) {
      toast.erro(err.message)
    }
  }, [toast])

  return (
    <div className="card">
      <div className="card-header-actions">
        <p className="card-title" style={{ margin: 0 }}>Usuários e perfis de acesso</p>
        <input type="search" className="form-input filtro-busca" placeholder="🔍 Nome ou e-mail..." aria-label="Buscar usuário"
          value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1) }} />
      </div>

      {erro && <div className="state-msg state-error" role="alert">⚠ {erro.message}</div>}
      {!dados ? <Skeleton height="120px" borderRadius="8px" /> : (
        <>
          <div className={`tabela-scroll ${carregando ? 'carregando' : ''}`}>
            <table className="tabela">
              <thead>
                <tr><th>Nome</th><th>E-mail</th><th>Cadastro</th><th className="num">Transações</th><th>Perfil</th></tr>
              </thead>
              <tbody>
                {dados.dados.map((u) => (
                  <tr key={u.id}>
                    <td>{u.nome}</td>
                    <td>{u.email}</td>
                    <td>{formatarData(u.criadoEm)}</td>
                    <td className="num">{u.transacoesAtivas}</td>
                    <td>
                      <select className="form-input select-compacto" value={u.perfil} aria-label={`Perfil de ${u.nome}`}
                        disabled={u.id === eu?.id} title={u.id === eu?.id ? 'Você não pode alterar o seu próprio perfil' : undefined}
                        onChange={(e) => alterarPerfil(u, e.target.value)}>
                        <option value="USUARIO">USUARIO</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacao paginacao={dados.paginacao} onMudar={setPagina} rotuloItens="usuários" />
        </>
      )}
    </div>
  )
}

function AuditoriaGlobal() {
  const [tipoAcao, setTipoAcao] = useState('')
  const [pagina, setPagina] = useState(1)
  const params = { pagina, limite: POR_PAGINA, tipoAcao }
  const { dados, erro, carregando } = useRequisicao(() => api.admin.auditoria(params), JSON.stringify(params))

  return (
    <div className="card">
      <div className="card-header-actions">
        <p className="card-title" style={{ margin: 0 }}>Trilha de auditoria global</p>
        <select className="form-input select-compacto" aria-label="Filtrar por ação" value={tipoAcao}
          onChange={(e) => { setTipoAcao(e.target.value); setPagina(1) }}>
          <option value="">Todas as ações</option>
          <option value="CRIACAO">Criação</option>
          <option value="EDICAO">Edição</option>
          <option value="EXCLUSAO">Exclusão</option>
        </select>
      </div>
      {erro && <div className="state-msg state-error" role="alert">⚠ {erro.message}</div>}
      {!dados ? <Skeleton height="160px" borderRadius="8px" /> : (
        <div className={carregando ? 'carregando' : ''}>
          <ListaAuditoria registros={dados.dados} mostrarTransacao />
          <Paginacao paginacao={dados.paginacao} onMudar={setPagina} rotuloItens="registros" />
        </div>
      )}
    </div>
  )
}

function Metricas() {
  const [versao, setVersao] = useState(0)
  const { dados, erro } = useRequisicao(() => api.admin.metricas(), `metricas-${versao}`)

  return (
    <div className="card">
      <div className="card-header-actions">
        <div>
          <p className="card-title" style={{ margin: 0 }}>Métricas de desempenho da API</p>
          {dados && <p className="grafico-sub">Desde a última inicialização do servidor ({Math.round(dados.uptimeSegundos / 60)} min)</p>}
        </div>
        <button className="btn-pag" onClick={() => setVersao((v) => v + 1)}>🔄 Atualizar</button>
      </div>
      {erro && <div className="state-msg state-error" role="alert">⚠ {erro.message}</div>}
      {!dados ? <Skeleton height="120px" borderRadius="8px" /> : (
        <div className="tabela-scroll">
          <table className="tabela">
            <thead><tr><th>Rota</th><th className="num">Chamadas</th><th className="num">Média (ms)</th><th className="num">Máx. (ms)</th><th className="num">Erros 5xx</th></tr></thead>
            <tbody>
              {dados.rotas.map((r) => (
                <tr key={r.rota}>
                  <td><code>{r.rota}</code></td>
                  <td className="num">{r.chamadas}</td>
                  <td className="num">{r.mediaMs.toLocaleString('pt-BR')}</td>
                  <td className="num">{r.maxMs.toLocaleString('pt-BR')}</td>
                  <td className="num">{r.erros5xx}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
  return (
    <div className="home-root">
      <Header />
      <main className="home-main">
        <div className="greeting-section anim-up">
          <div className="greeting-text">
            <p className="greeting-time">Área restrita · perfil ADMIN</p>
            <h1 className="greeting-name">Administração</h1>
            <p className="greeting-sub">Visão de toda a empresa, perfis de acesso, auditoria global e desempenho da API.</p>
          </div>
        </div>
        <ResumoGlobal />
        <Usuarios />
        <AuditoriaGlobal />
        <Metricas />
      </main>
      <Footer />
    </div>
  )
}
