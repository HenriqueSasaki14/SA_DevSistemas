import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './HomePage.css'
import logo from '../assets/1.png'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import Skeleton from '../components/ui/Skeleton'

function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function dataFormatada() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
}

export default function HomePage() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  const primeiroNome = (usuario?.nome || usuario?.email?.split('@')[0] || 'Usuário')
    .split(' ')[0]

  const [dashboard, setDashboard] = useState(null)
  const [transacoes, setTransacoes] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  // Estados dos Modais
  const [modalAberto, setModalAberto] = useState(false)
  const [modalModo, setModalModo] = useState('criar') // 'criar' | 'editar'
  const [transacaoSelecionada, setTransacaoSelecionada] = useState(null)

  // Estado do formulário
  const [formTipo, setFormTipo] = useState('ENTRADA')
  const [formDescricao, setFormDescricao] = useState('')
  const [formValor, setFormValor] = useState('')
  const [formData, setFormData] = useState(new Date().toISOString().split('T')[0])
  const [formChaveUnica, setFormChaveUnica] = useState('')
  const [formErro, setFormErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Estado do Modal de Confirmação de Exclusão (Soft Delete)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [transacaoParaExcluir, setTransacaoParaExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)

  // Estado do Modal de Auditoria
  const [modalAuditoriaAberto, setModalAuditoriaAberto] = useState(false)
  const [auditorias, setAuditorias] = useState([])
  const [carregandoAuditoria, setCarregandoAuditoria] = useState(false)

  // Carrega Dashboard e Transações da API
  const carregarDados = useCallback(async () => {
    if (!usuario) return
    setCarregando(true)
    setErro('')
    try {
      const [dash, trans] = await Promise.all([api.dashboard(), api.transacoes()])
      setDashboard(dash)
      setTransacoes(trans)
    } catch (e) {
      setErro(e.message || 'Erro ao carregar dados do servidor.')
    } finally {
      setCarregando(false)
    }
  }, [usuario])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Abre modal para criação
  const abrirModalCriar = (tipoInicial = 'ENTRADA') => {
    setModalModo('criar')
    setTransacaoSelecionada(null)
    setFormTipo(tipoInicial)
    setFormDescricao('')
    setFormValor('')
    setFormData(new Date().toISOString().split('T')[0])
    setFormChaveUnica(`TX-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`)
    setFormErro('')
    setModalAberto(true)
  }

  // Abre modal para edição
  const abrirModalEditar = (t) => {
    setModalModo('editar')
    setTransacaoSelecionada(t)
    setFormTipo(t.tipo)
    setFormDescricao(t.descricao)
    // Converte centavos para formato com vírgula para edição
    setFormValor((t.valorCentavos / 100).toFixed(2).replace('.', ','))
    setFormData(new Date(t.dataTransacao).toISOString().split('T')[0])
    setFormChaveUnica(t.chaveUnica || '')
    setFormErro('')
    setModalAberto(true)
  }

  // Submissão do Formulário de Transação (Criação ou Edição)
  const salvarTransacao = async (e) => {
    e.preventDefault()
    setFormErro('')

    if (!formDescricao.trim()) {
      setFormErro('Por favor, informe a descrição.')
      return
    }

    // Sanitiza e valida o valor em Reais e converte para centavos inteiros
    const valorNumerico = parseFloat(formValor.replace(/\./g, '').replace(',', '.'))
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      setFormErro('Informe um valor válido e positivo (maior que zero).')
      return
    }

    const valorCentavos = Math.round(valorNumerico * 100)

    setSalvando(true)
    try {
      if (modalModo === 'criar') {
        await api.criarTransacao({
          tipo: formTipo,
          descricao: formDescricao.trim(),
          valorCentavos,
          dataTransacao: new Date(formData).toISOString(),
          chaveUnica: formChaveUnica.trim(),
        })
        setSucesso('Transação cadastrada com sucesso!')
      } else {
        await api.atualizarTransacao(transacaoSelecionada.id, {
          tipo: formTipo,
          descricao: formDescricao.trim(),
          valorCentavos,
          dataTransacao: new Date(formData).toISOString(),
        })
        setSucesso('Transação atualizada com sucesso (alteração auditada)!')
      }

      setModalAberto(false)
      setTimeout(() => setSucesso(''), 4000)
      await carregarDados()
    } catch (err) {
      if (err.status === 409) {
        setFormErro('Lançamento duplicado! Uma transação com esta chave única já foi cadastrada.')
      } else {
        setFormErro(err.message || 'Erro ao processar a operação.')
      }
    } finally {
      setSalvando(false)
    }
  }

  // Confirmação e Execução de Soft Delete
  const abrirModalExcluir = (t) => {
    setTransacaoParaExcluir(t)
    setModalExcluirAberto(true)
  }

  const confirmarExclusao = async () => {
    if (!transacaoParaExcluir) return
    setExcluindo(true)
    try {
      await api.excluirTransacao(transacaoParaExcluir.id)
      setModalExcluirAberto(false)
      setTransacaoParaExcluir(null)
      setSucesso('Transação removida com sucesso (Soft Delete com auditoria).')
      setTimeout(() => setSucesso(''), 4000)
      await carregarDados()
    } catch (err) {
      setErro(err.message || 'Erro ao excluir transação.')
    } finally {
      setExcluindo(false)
    }
  }

  // Visualização da Trilha de Auditoria
  const abrirAuditoria = async (t) => {
    setTransacaoSelecionada(t)
    setAuditorias([])
    setModalAuditoriaAberto(true)
    setCarregandoAuditoria(true)
    try {
      const logs = await api.auditoriaTransacao(t.id)
      setAuditorias(logs)
    } catch (err) {
      console.error(err)
    } finally {
      setCarregandoAuditoria(false)
    }
  }

  return (
    <div className="home-root">

      {/* ── Header ── */}
      <header className="home-header">
        <div className="header-brand">
          <img src={logo} alt="SafeCash" className="header-logo" />
          <span className="header-brand-name">SafeCash</span>
        </div>

        <nav className="header-nav">
          <a href="#" className="nav-link active">Dashboard</a>
          <a href="#transacoes" className="nav-link">Transações</a>
          <a href="#auditoria" className="nav-link" onClick={(e) => { e.preventDefault(); if (transacoes[0]) abrirAuditoria(transacoes[0]) }}>Auditoria</a>
        </nav>

        <div className="header-user">
          {usuario ? (
            <>
              <div className="user-avatar">{primeiroNome[0].toUpperCase()}</div>
              <span className="user-name">{usuario.nome || primeiroNome}</span>
              <button className="btn-sair" onClick={() => { logout(); navigate('/login') }}>Sair</button>
            </>
          ) : (
            <button className="btn-login" onClick={() => navigate('/login')}>Entrar</button>
          )}
        </div>
      </header>

      <main className="home-main">

        {/* ── Saudação ── */}
        <div className="greeting-section anim-up">
          <div className="greeting-text">
            <p className="greeting-time">{saudacao()},</p>
            <h1 className="greeting-name">{primeiroNome}!</h1>
            <p className="greeting-sub">Controle rigoroso e rastreabilidade bancária do seu fluxo de caixa.</p>
          </div>
          <div className="greeting-date">{dataFormatada()}</div>
        </div>

        {/* Feedback visual de sucesso */}
        {sucesso && (
          <div className="modal-alert success anim-up">
            ✓ {sucesso}
          </div>
        )}

        {/* Feedback visual de erro */}
        {erro && (
          <div className="state-msg state-error anim-up">
            ⚠ {erro}
          </div>
        )}

        {/* ── Skeletons de carregamento ── */}
        {carregando && !dashboard && (
          <>
            <Skeleton height="160px" borderRadius="16px" />
            <div className="stats-row">
              <Skeleton height="110px" borderRadius="10px" />
              <Skeleton height="110px" borderRadius="10px" />
              <Skeleton height="110px" borderRadius="10px" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[...Array(4)].map((_, i) => <Skeleton key={i} height="52px" borderRadius="10px" />)}
            </div>
          </>
        )}

        {dashboard && (
          <>
            {/* Card Principal de Saldo */}
            <div className="account-card anim-up">
              <div className="card-top">
                <div className="card-brand">
                  <img src={logo} alt="SafeCash" className="card-logo" />
                  <span className="card-brand-name">SafeCash Core Engine</span>
                </div>
                <span className="card-type">Tesouraria Integrada</span>
              </div>

              <div className="card-balance">
                <p className="balance-label">Saldo Disponível (Consolidado pela API)</p>
                <p className="balance-value">{dashboard.saldoTotal}</p>
                <p className="balance-delta up">● {dashboard.totalTransacoesAtivas} transações ativas</p>
              </div>

              <div className="card-bottom">
                <span className="card-holder">{usuario?.nome || primeiroNome}</span>
                <span className="card-number">Precisão Bancária em Centavos</span>
              </div>
            </div>

            {/* ── Stats Consolidados ── */}
            <div className="stats-row anim-up">
              <div className="stat-card">
                <span className="stat-label">Entradas (Receitas)</span>
                <span className="stat-value" style={{ color: 'var(--green)' }}>{dashboard.receitas}</span>
                <span className="stat-delta up">▲ Soma das entradas ativas</span>
                <div className="stat-bar"><div className="stat-bar-fill green" style={{ width: '100%' }} /></div>
              </div>
              <div className="stat-card">
                <span className="stat-label">Saídas (Despesas)</span>
                <span className="stat-value" style={{ color: 'var(--red)' }}>{dashboard.despesas}</span>
                <span className="stat-delta down">▼ Soma das saídas ativas</span>
                <div className="stat-bar"><div className="stat-bar-fill red" style={{ width: '100%' }} /></div>
              </div>
              <div className="stat-card">
                <span className="stat-label">Rastreabilidade & Regra de Ouro</span>
                <span className="stat-value">100% Auditado</span>
                <span className="stat-delta up">🔒 Soft Delete Ativo</span>
                <div className="stat-bar"><div className="stat-bar-fill" style={{ width: '100%' }} /></div>
              </div>
            </div>

            {/* ── Grid de Conteúdo ── */}
            <div className="content-grid anim-up" id="transacoes">

              {/* Transações */}
              <div className="card">
                <div className="card-header-actions">
                  <p className="card-title" style={{ margin: 0 }}>Lançamentos de Caixa</p>
                  <button className="btn-primary-action" onClick={() => abrirModalCriar('ENTRADA')}>
                    + Novo Lançamento
                  </button>
                </div>

                <div className="trans-list">
                  {transacoes.length === 0 ? (
                    <div className="state-msg">
                      <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📭</p>
                      <p>Nenhuma transação ativa cadastrada.</p>
                      <button 
                        className="btn-primary-action" 
                        style={{ margin: '1rem auto 0' }}
                        onClick={() => abrirModalCriar('ENTRADA')}
                      >
                        Cadastrar Primeiro Lançamento
                      </button>
                    </div>
                  ) : transacoes.map((t) => {
                    const tipoFormatado = (t.tipo || '').toLowerCase()
                    const dataExtenso = t.dataTransacao 
                      ? new Date(t.dataTransacao).toLocaleDateString('pt-BR') 
                      : '-'

                    return (
                      <div className="trans-item" key={t.id}>
                        <div className={`trans-icon ${tipoFormatado}`}>
                          {t.tipo === 'ENTRADA' ? '+' : '−'}
                        </div>
                        <div className="trans-info">
                          <p className="trans-desc">{t.descricao}</p>
                          <div className="trans-meta">
                            <span className="trans-date">{dataExtenso}</span>
                            <span className={`trans-badge ${tipoFormatado}`}>
                              {t.tipo}
                            </span>
                            <span className="trans-date" title={`Chave única anti-duplicação: ${t.chaveUnica}`}>
                              🔑 {t.chaveUnica ? t.chaveUnica.substring(0, 10) + '...' : ''}
                            </span>
                          </div>
                        </div>

                        <span className={`trans-value ${tipoFormatado}`}>
                          {t.tipo === 'ENTRADA' ? '+ ' : '- '}{t.valorFormatado}
                        </span>

                        {/* Botões de Ação do CRUD */}
                        <div className="trans-actions">
                          <button 
                            className="btn-icon-action" 
                            title="Editar Lançamento" 
                            onClick={() => abrirModalEditar(t)}
                          >
                            ✏️
                          </button>
                          <button 
                            className="btn-icon-action audit" 
                            title="Ver Trilha de Auditoria" 
                            onClick={() => abrirAuditoria(t)}
                          >
                            📋
                          </button>
                          <button 
                            className="btn-icon-action delete" 
                            title="Excluir Lançamento (Soft Delete)" 
                            onClick={() => abrirModalExcluir(t)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Sidebar */}
              <div className="sidebar">

                {/* Acesso rápido */}
                <div className="card">
                  <p className="card-title">Ações Rápidas</p>
                  <div className="actions-grid">
                    <button className="action-btn" onClick={() => abrirModalCriar('ENTRADA')}>
                      <div className="action-icon" style={{ background: 'var(--green)' }}>+</div>
                      <span className="action-label">Nova Entrada</span>
                    </button>
                    <button className="action-btn" onClick={() => abrirModalCriar('SAIDA')}>
                      <div className="action-icon" style={{ background: 'var(--red)' }}>−</div>
                      <span className="action-label">Nova Saída</span>
                    </button>
                    <button className="action-btn" onClick={() => carregarDados()}>
                      <div className="action-icon">🔄</div>
                      <span className="action-label">Recarregar</span>
                    </button>
                    <button className="action-btn" onClick={() => { if (transacoes[0]) abrirAuditoria(transacoes[0]) }}>
                      <div className="action-icon">📜</div>
                      <span className="action-label">Auditorias</span>
                    </button>
                  </div>
                </div>

                {/* Segurança & Conformidade */}
                <div className="card">
                  <p className="card-title">Segurança & Regras da Tesouraria</p>
                  <ul className="seg-list">
                    <li className="seg-item ok">
                      <div className="seg-dot" />
                      Autenticação JWT & Criptografia Bcrypt
                    </li>
                    <li className="seg-item ok">
                      <div className="seg-dot" />
                      Cálculo de Saldo Seguro em Centavos
                    </li>
                    <li className="seg-item ok">
                      <div className="seg-dot" />
                      Prevenção de Duplicidade por Chave Única
                    </li>
                    <li className="seg-item ok">
                      <div className="seg-dot" />
                      Regra de Ouro: Soft Delete Rastreável
                    </li>
                    <li className="seg-item ok">
                      <div className="seg-dot" />
                      Auditoria de Criação, Edição e Exclusão
                    </li>
                  </ul>
                </div>

              </div>
            </div>
          </>
        )}

      </main>

      {/* ── Modal de Criação / Edição de Transação ── */}
      {modalAberto && (
        <div className="modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalModo === 'criar' ? 'Novo Lançamento de Caixa' : 'Editar Lançamento'}
              </h3>
              <button className="btn-modal-close" onClick={() => setModalAberto(false)}>✕</button>
            </div>

            <form onSubmit={salvarTransacao}>
              <div className="modal-body">
                {formErro && (
                  <div className="modal-alert error">
                    ⚠ {formErro}
                  </div>
                )}

                {/* Seleção do Tipo */}
                <div className="form-group">
                  <label>Tipo da Operação</label>
                  <div className="type-selector">
                    <button
                      type="button"
                      className={`type-btn entrada ${formTipo === 'ENTRADA' ? 'active' : ''}`}
                      onClick={() => setFormTipo('ENTRADA')}
                    >
                      + ENTRADA (Receita)
                    </button>
                    <button
                      type="button"
                      className={`type-btn saida ${formTipo === 'SAIDA' ? 'active' : ''}`}
                      onClick={() => setFormTipo('SAIDA')}
                    >
                      − SAÍDA (Despesa)
                    </button>
                  </div>
                </div>

                {/* Descrição */}
                <div className="form-group">
                  <label>Descrição do Lançamento</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Pagamento de Aluguel, Venda de Mercadorias..."
                    value={formDescricao}
                    onChange={(e) => setFormDescricao(e.target.value)}
                    required
                  />
                </div>

                {/* Valor */}
                <div className="form-group">
                  <label>Valor em Reais (R$)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: 2.000,00"
                    value={formValor}
                    onChange={(e) => setFormValor(e.target.value)}
                    required
                  />
                  <span className="input-hint">
                    Armazenado no banco com precisão de centavos inteiros (ex: R$ 2.000,00 = 200000). Valores negativos não são permitidos.
                  </span>
                </div>

                {/* Data */}
                <div className="form-group">
                  <label>Data da Transação</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData}
                    onChange={(e) => setFormData(e.target.value)}
                    required
                  />
                </div>

                {/* Chave Única (Anti-Duplicação) */}
                {modalModo === 'criar' && (
                  <div className="form-group">
                    <label>Chave Única de Idempotência</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formChaveUnica}
                      onChange={(e) => setFormChaveUnica(e.target.value)}
                      required
                    />
                    <span className="input-hint">
                      Evita lançamentos duplicados caso o botão seja clicado mais de uma vez.
                    </span>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-modal-cancel" onClick={() => setModalAberto(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-modal-submit" disabled={salvando}>
                  {salvando ? 'Salvando...' : modalModo === 'criar' ? 'Registrar Lançamento' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal de Confirmação de Exclusão (Soft Delete) ── */}
      {modalExcluirAberto && (
        <div className="modal-overlay" onClick={() => setModalExcluirAberto(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: 'var(--red)' }}>Confirmar Exclusão</h3>
              <button className="btn-modal-close" onClick={() => setModalExcluirAberto(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                Deseja realmente excluir o lançamento <strong>"{transacaoParaExcluir?.descricao}"</strong> no valor de <strong>{transacaoParaExcluir?.valorFormatado}</strong>?
              </p>
              <div className="modal-alert error" style={{ fontSize: '0.78rem' }}>
                🔒 <strong>Regra de Ouro (H1):</strong> O registro passará por exclusão lógica (Soft Delete). Ele não será apagado fisicamente do banco de dados para garantir a rastreabilidade e auditoria da tesouraria.
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-modal-cancel" onClick={() => setModalExcluirAberto(false)}>
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn-modal-submit" 
                style={{ background: 'var(--red)' }}
                onClick={confirmarExclusao}
                disabled={excluindo}
              >
                {excluindo ? 'Excluindo...' : 'Confirmar Soft Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Visualização de Auditoria ── */}
      {modalAuditoriaAberto && (
        <div className="modal-overlay" onClick={() => setModalAuditoriaAberto(false)}>
          <div className="modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Trilha de Auditoria (Rastreabilidade)</h3>
              <button className="btn-modal-close" onClick={() => setModalAuditoriaAberto(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Histórico imutável de alterações da transação: <strong>{transacaoSelecionada?.descricao}</strong>
              </p>

              {carregandoAuditoria ? (
                <p style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                  Carregando registros de auditoria...
                </p>
              ) : auditorias.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                  Nenhum registro de auditoria encontrado.
                </p>
              ) : (
                <div className="audit-timeline">
                  {auditorias.map((a) => (
                    <div className="audit-entry" key={a.id}>
                      <div className="audit-header">
                        <span className={`audit-badge ${a.tipoAcao}`}>
                          {a.tipoAcao}
                        </span>
                        <span className="audit-date">
                          {new Date(a.dataAcao).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="audit-author">
                        Responsável: <strong>{a.usuario?.nome || 'Usuário'}</strong> ({a.usuario?.email || '-'})
                      </div>
                      <pre className="audit-diff">
                        {JSON.stringify(a.dadosAlterados, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-modal-cancel" onClick={() => setModalAuditoriaAberto(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="home-footer">
        <span className="footer-brand">SafeCash – FinTech Flow</span>
        <span>© 2026 — Sistema de Tesouraria Integrada. Todos os direitos reservados.</span>
      </footer>
    </div>
  )
}
