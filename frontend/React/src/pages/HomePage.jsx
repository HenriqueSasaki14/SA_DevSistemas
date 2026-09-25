import { useState, useEffect } from 'react'
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

const ICONES = {
  entrada:   '+',
  saida:     '−',
  rendimento:'%',
  tarifa:    '−',
}

export default function HomePage() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  const primeiroNome = (usuario?.nome || usuario?.email?.split('@')[0] || 'Usuário')
    .split(' ')[0]

  const [dashboard,  setDashboard]  = useState(null)
  const [transacoes, setTransacoes] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro,       setErro]       = useState('')

  useEffect(() => {
    if (!usuario) return
    setCarregando(true)
    setErro('')
    Promise.all([api.dashboard(), api.transacoes()])
      .then(([dash, trans]) => { setDashboard(dash); setTransacoes(trans) })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false))
  }, [usuario])

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
          <a href="#" className="nav-link">Transações</a>
          <a href="#" className="nav-link">Investimentos</a>
          <a href="#" className="nav-link">Relatórios</a>
        </nav>

        <div className="header-user">
          {usuario ? (
            <>
              <div className="user-avatar">{primeiroNome[0].toUpperCase()}</div>
              <span className="user-name">{primeiroNome}</span>
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
            <p className="greeting-sub">Aqui está um resumo da sua conta hoje.</p>
          </div>
          <div className="greeting-date">{dataFormatada()}</div>
        </div>

        {/* ── Skeletons de carregamento ── */}
        {carregando && (
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

        {erro && (
          <div className="state-msg state-error">{erro}</div>
        )}

        {!carregando && !erro && dashboard && (
          <>
            <div className="account-card anim-up">
              <div className="card-top">
                <div className="card-brand">
                  <img src={logo} alt="SafeCash" className="card-logo" />
                  <span className="card-brand-name">SafeCash</span>
                </div>
                <span className="card-type">Conta Digital</span>
              </div>

              <div className="card-balance">
                <p className="balance-label">Saldo disponível</p>
                <p className="balance-value">{dashboard.saldoTotal}</p>
                <p className="balance-delta up">▲ {dashboard.saldoDelta}</p>
              </div>

              <div className="card-bottom">
                <span className="card-holder">{primeiroNome}</span>
                <span className="card-number">•••• •••• •••• 4521</span>
              </div>
            </div>

            {/* ── Stats ── */}
            <div className="stats-row anim-up">
              <div className="stat-card">
                <span className="stat-label">Receitas</span>
                <span className="stat-value">{dashboard.receitas}</span>
                <span className="stat-delta up">▲ {dashboard.receitasDelta}</span>
                <div className="stat-bar"><div className="stat-bar-fill green" style={{ width: '72%' }} /></div>
              </div>
              <div className="stat-card">
                <span className="stat-label">Despesas</span>
                <span className="stat-value">{dashboard.despesas}</span>
                <span className="stat-delta down">▼ {dashboard.despesasDelta}</span>
                <div className="stat-bar"><div className="stat-bar-fill red" style={{ width: '28%' }} /></div>
              </div>
              <div className="stat-card">
                <span className="stat-label">Investimentos</span>
                <span className="stat-value">{dashboard.investimentos}</span>
                <span className="stat-delta up">▲ {dashboard.investimentosDelta}</span>
                <div className="stat-bar"><div className="stat-bar-fill" style={{ width: '64%' }} /></div>
              </div>
            </div>

            {/* ── Grid de conteúdo ── */}
            <div className="content-grid anim-up">

              {/* Transações */}
              <div className="card">
                <p className="card-title">Transações Recentes</p>
                <div className="trans-list">
                  {transacoes.length === 0 ? (
                    <div className="state-msg">
                      <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📭</p>
                      <p>Nenhuma transação encontrada</p>
                    </div>
                  ) : transacoes.map((t, i) => (
                    <div className="trans-item" key={i}>
                      <div className={`trans-icon ${t.tipo}`}>
                        {ICONES[t.tipo] ?? '?'}
                      </div>
                      <div className="trans-info">
                        <p className="trans-desc">{t.desc}</p>
                        <div className="trans-meta">
                          <span className="trans-date">{t.data}</span>
                          <span className={`trans-badge ${t.tipo}`}>
                            {t.tipo === 'entrada'    ? 'Entrada'    :
                             t.tipo === 'saida'      ? 'Saída'      :
                             t.tipo === 'rendimento' ? 'Rendimento' : 'Tarifa'}
                          </span>
                        </div>
                      </div>
                      <span className={`trans-value ${t.tipo}`}>{t.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar */}
              <div className="sidebar">

                {/* Acesso rápido */}
                <div className="card">
                  <p className="card-title">Acesso Rápido</p>
                  <div className="actions-grid">
                    {[
                      { icon: '↑', label: 'Transferir' },
                      { icon: '↓', label: 'Receber' },
                      { icon: 'P',  label: 'PIX'       },
                      { icon: '≡', label: 'Extrato'   },
                    ].map((a, i) => (
                      <button className="action-btn" key={i}>
                        <div className="action-icon">{a.icon}</div>
                        <span className="action-label">{a.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Segurança */}
                <div className="card">
                  <p className="card-title">Status de Segurança</p>
                  <ul className="seg-list">
                    <li className="seg-item ok">
                      <div className="seg-dot" />
                      Autenticação ativa
                    </li>
                    <li className="seg-item ok">
                      <div className="seg-dot" />
                      Criptografia AES-256
                    </li>
                    <li className="seg-item ok">
                      <div className="seg-dot" />
                      Sessão verificada
                    </li>
                  </ul>
                </div>

              </div>
            </div>
          </>
        )}

      </main>

      <footer className="home-footer">
        <span className="footer-brand">SafeCash</span>
        <span>© 2026 — Todos os direitos reservados. CNPJ 00.000.000/0001-00</span>
      </footer>
    </div>
  )
}
