import { useCallback, useMemo, useState } from 'react'
import './HomePage.css'
import logo from '../assets/1.png'
import { api } from '../services/api'
import { useAuth } from '../contexts/auth'
import { useToast } from '../contexts/toast'
import { useDebounce } from '../hooks/useDebounce'
import { useRequisicao } from '../hooks/useRequisicao'
import { formatarDataHoje, hojeISO, inicioDoMesISO } from '../utils/datas'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import Skeleton from '../components/ui/Skeleton'
import Paginacao from '../components/ui/Paginacao'
import GraficoMensal from '../components/dashboard/GraficoMensal'
import FiltrosTransacoes from '../components/transacoes/FiltrosTransacoes'
import TabelaTransacoes from '../components/transacoes/TabelaTransacoes'
import ModalTransacao from '../components/transacoes/ModalTransacao'
import ModalExclusao from '../components/transacoes/ModalExclusao'
import ModalAuditoria from '../components/transacoes/ModalAuditoria'

const ITENS_POR_PAGINA = 8
const MESES_GRAFICO = 6
const FILTROS_INICIAIS = { tipo: '', dataInicio: '', dataFim: '', ordenarPor: 'dataTransacao', ordem: 'desc' }

function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default function HomePage() {
  const { usuario } = useAuth()
  const toast = useToast()
  const primeiroNome = (usuario?.nome || 'Usuário').split(' ')[0]

  // `versao` muda após criar/editar/excluir e força o recarregamento (saldo em tempo real)
  const [versao, setVersao] = useState(0)
  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  // ── Filtros, busca e paginação ──
  const [busca, setBusca] = useState('')
  const buscaDebounced = useDebounce(busca.trim())
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS)
  const [pagina, setPagina] = useState(1)

  const parametros = useMemo(
    () => ({ ...filtros, busca: buscaDebounced, pagina, limite: ITENS_POR_PAGINA }),
    [filtros, buscaDebounced, pagina],
  )

  // ── Dados da API ──
  const resumo = useRequisicao(
    () => Promise.all([api.dashboard(), api.relatorioMensal(MESES_GRAFICO)]),
    `resumo-${versao}`,
  )
  const lista = useRequisicao(() => api.transacoes(parametros), `${JSON.stringify(parametros)}-${versao}`)

  const [dashboard, meses] = resumo.dados ?? []
  const transacoes = lista.dados?.dados ?? []
  const erroCarga = resumo.erro || lista.erro

  // ── Modais ──
  const [modal, setModal] = useState(null) // { tipo: 'form'|'excluir'|'auditoria', transacao?, tipoInicial? }
  const fecharModal = useCallback(() => setModal(null), [])
  const abrirNova = useCallback((tipoInicial = 'ENTRADA') => setModal({ tipo: 'form', tipoInicial }), [])
  const abrirEdicao = useCallback((transacao) => setModal({ tipo: 'form', transacao }), [])
  const abrirExclusao = useCallback((transacao) => setModal({ tipo: 'excluir', transacao }), [])
  const abrirAuditoria = useCallback((transacao) => setModal({ tipo: 'auditoria', transacao }), [])

  const aposSalvar = useCallback((mensagem) => {
    setModal(null)
    toast.sucesso(mensagem)
    recarregar()
  }, [toast, recarregar])

  // ── Handlers dos filtros (qualquer mudança volta para a página 1) ──
  const alterarBusca = useCallback((valor) => { setBusca(valor); setPagina(1) }, [])
  const alterarFiltro = useCallback((parcial) => { setFiltros((f) => ({ ...f, ...parcial })); setPagina(1) }, [])
  const limparFiltros = useCallback(() => { setFiltros(FILTROS_INICIAIS); setBusca(''); setPagina(1) }, [])

  const [exportando, setExportando] = useState(false)
  const exportarCsv = useCallback(async () => {
    const dataInicio = filtros.dataInicio || inicioDoMesISO()
    const dataFim = filtros.dataFim || hojeISO()
    setExportando(true)
    try {
      const blob = await api.baixarExtratoCsv(dataInicio, dataFim)
      const url = URL.createObjectURL(blob)
      const link = Object.assign(document.createElement('a'), { href: url, download: `extrato-${dataInicio}-a-${dataFim}.csv` })
      link.click()
      URL.revokeObjectURL(url)
      toast.sucesso(`Extrato de ${dataInicio} a ${dataFim} gerado.`)
    } catch (err) {
      toast.erro(err.message || 'Erro ao gerar o extrato.')
    } finally {
      setExportando(false)
    }
  }, [filtros.dataInicio, filtros.dataFim, toast])

  const filtrando = Boolean(buscaDebounced || filtros.tipo || filtros.dataInicio || filtros.dataFim)

  return (
    <div className="home-root">
      <Header />

      <main className="home-main">
        <div className="greeting-section anim-up">
          <div className="greeting-text">
            <p className="greeting-time">{saudacao()},</p>
            <h1 className="greeting-name">{primeiroNome}!</h1>
            <p className="greeting-sub">Controle rigoroso e rastreabilidade bancária do seu fluxo de caixa.</p>
          </div>
          <div className="greeting-date">{formatarDataHoje()}</div>
        </div>

        {erroCarga && (
          <div className="state-msg state-error" role="alert">
            ⚠ {erroCarga.message || 'Erro ao carregar dados do servidor.'}{' '}
            <button className="btn-pag" onClick={recarregar}>Tentar novamente</button>
          </div>
        )}

        {!dashboard ? (
          !erroCarga && (
            <>
              <Skeleton height="160px" borderRadius="16px" />
              <div className="stats-row">
                <Skeleton height="110px" borderRadius="10px" />
                <Skeleton height="110px" borderRadius="10px" />
                <Skeleton height="110px" borderRadius="10px" />
              </div>
              <Skeleton height="280px" borderRadius="10px" />
            </>
          )
        ) : (
          <>
            <div className="account-card anim-up">
              <div className="card-top">
                <div className="card-brand">
                  <img src={logo} alt="" className="card-logo" />
                  <span className="card-brand-name">SafeCash Core Engine</span>
                </div>
                <span className="card-type">Tesouraria Integrada</span>
              </div>
              <div className="card-balance">
                <p className="balance-label">Saldo Disponível (Consolidado pela API)</p>
                <p className="balance-value" data-testid="saldo">{dashboard.saldoTotal}</p>
                <p className="balance-delta up">● {dashboard.totalTransacoesAtivas} transações ativas</p>
              </div>
              <div className="card-bottom">
                <span className="card-holder">{usuario?.nome}</span>
                <span className="card-number">Precisão Bancária em Centavos</span>
              </div>
            </div>

            <div className="stats-row anim-up">
              <div className="stat-card">
                <span className="stat-label">Entradas (Receitas)</span>
                <span className="stat-value">{dashboard.receitas}</span>
                <span className="stat-delta up">▲ Soma das entradas ativas</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Saídas (Despesas)</span>
                <span className="stat-value">{dashboard.despesas}</span>
                <span className="stat-delta down">▼ Soma das saídas ativas</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Rastreabilidade & Regra de Ouro</span>
                <span className="stat-value">100% Auditado</span>
                <span className="stat-delta up">🔒 Soft Delete Ativo</span>
              </div>
            </div>

            <GraficoMensal meses={meses} />
          </>
        )}

        <div className="content-grid anim-up" id="transacoes">
          <div className="card">
            <div className="card-header-actions">
              <p className="card-title" style={{ margin: 0 }}>Lançamentos de Caixa</p>
              <button className="btn-primary-action" onClick={() => abrirNova('ENTRADA')}>+ Novo Lançamento</button>
            </div>

            <FiltrosTransacoes
              filtros={filtros}
              busca={busca}
              onBusca={alterarBusca}
              onFiltro={alterarFiltro}
              onLimpar={limparFiltros}
              onExportar={exportarCsv}
              exportando={exportando}
            />

            {!lista.dados && lista.carregando ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[...Array(4)].map((_, i) => <Skeleton key={i} height="52px" borderRadius="10px" />)}
              </div>
            ) : (
              <>
                <TabelaTransacoes
                  transacoes={transacoes}
                  carregando={lista.carregando}
                  filtrando={filtrando}
                  onNova={abrirNova}
                  onEditar={abrirEdicao}
                  onAuditoria={abrirAuditoria}
                  onExcluir={abrirExclusao}
                />
                <Paginacao paginacao={lista.dados?.paginacao} onMudar={setPagina} rotuloItens="lançamentos" />
              </>
            )}
          </div>

          <div className="sidebar">
            <div className="card">
              <p className="card-title">Ações Rápidas</p>
              <div className="actions-grid">
                <button className="action-btn" onClick={() => abrirNova('ENTRADA')}>
                  <div className="action-icon" style={{ background: 'var(--green)' }}>+</div>
                  <span className="action-label">Nova Entrada</span>
                </button>
                <button className="action-btn" onClick={() => abrirNova('SAIDA')}>
                  <div className="action-icon" style={{ background: 'var(--red)' }}>−</div>
                  <span className="action-label">Nova Saída</span>
                </button>
                <button className="action-btn" onClick={recarregar}>
                  <div className="action-icon">🔄</div>
                  <span className="action-label">Recarregar</span>
                </button>
                <button className="action-btn" onClick={exportarCsv} disabled={exportando}>
                  <div className="action-icon">⬇</div>
                  <span className="action-label">Extrato CSV</span>
                </button>
              </div>
            </div>

            <div className="card">
              <p className="card-title">Segurança & Regras da Tesouraria</p>
              <ul className="seg-list">
                {[
                  'Autenticação JWT & Criptografia Bcrypt',
                  'Perfis de acesso (RBAC): Admin e Usuário',
                  'Cálculo de Saldo Seguro em Centavos',
                  'Prevenção de Duplicidade por Chave Única',
                  'Regra de Ouro: Soft Delete Rastreável',
                  'Auditoria de Criação, Edição e Exclusão',
                ].map((item) => (
                  <li className="seg-item ok" key={item}><div className="seg-dot" />{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>

      {modal?.tipo === 'form' && (
        <ModalTransacao transacao={modal.transacao} tipoInicial={modal.tipoInicial} onFechar={fecharModal} onSalvo={aposSalvar} />
      )}
      {modal?.tipo === 'excluir' && (
        <ModalExclusao transacao={modal.transacao} onFechar={fecharModal} onExcluido={aposSalvar} onErro={toast.erro} />
      )}
      {modal?.tipo === 'auditoria' && <ModalAuditoria transacao={modal.transacao} onFechar={fecharModal} />}

      <Footer />
    </div>
  )
}
