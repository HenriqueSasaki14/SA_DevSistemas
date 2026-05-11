import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './LoginPage.css'
import logo from '../assets/2.png'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const limparErro = () => { if (erro) setErro('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')

    if (!email || !senha) { setErro('Preencha e-mail e senha.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErro('Digite um e-mail válido.'); return }
    if (senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return }

    setCarregando(true)
    try {
      const data = await api.login(email, senha)
      await login(data.token)
      navigate('/')
    } catch (err) {
      setErro(err.message || 'Credenciais inválidas. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="login-page">

      {/* ── Painel Esquerdo: narrativa da marca ── */}
      <aside className="login-panel">
        <div className="panel-brand">
          <img src={logo} alt="SafeCash" className="panel-logo" />
          <span className="panel-brand-name">SafeCash</span>
        </div>

        <div className="panel-body">
          <div>
            <h1 className="panel-headline">
              Seu patrimônio,<br />
              <em>com inteligência.</em>
            </h1>
            <p className="panel-sub">
              Uma plataforma financeira construída para quem leva o dinheiro a sério.
              Simples na superfície, poderosa por baixo.
            </p>
          </div>

          <div className="panel-features">
            <div className="panel-feature">
              <div className="feature-dot" />
              <div className="feature-text">
                <strong>Segurança bancária</strong>
                <span>Criptografia de ponta a ponta em todas as operações</span>
              </div>
            </div>
            <div className="panel-feature">
              <div className="feature-dot" />
              <div className="feature-text">
                <strong>Investimentos automáticos</strong>
                <span>Rendimentos acima do CDI com liquidez diária</span>
              </div>
            </div>
            <div className="panel-feature">
              <div className="feature-dot" />
              <div className="feature-text">
                <strong>Suporte especializado 24h</strong>
                <span>Time financeiro disponível sempre que precisar</span>
              </div>
            </div>
          </div>
        </div>

        <p className="panel-footer">
          SafeCash — Instituição financeira regulada pelo Banco Central do Brasil.<br />
          CNPJ 00.000.000/0001-00
        </p>
      </aside>

      {/* ── Painel Direito: formulário ── */}
      <main className="login-form-panel">
        <div className="login-box">

          <div className="login-mobile-brand">
            <img src={logo} alt="SafeCash" />
            <span>SafeCash</span>
          </div>

          <h2 className="login-heading">Olá, bem-vindo de volta!</h2>
          <p className="login-sub">Acesse sua conta com segurança</p>

          <form onSubmit={handleSubmit} className="form-stack" noValidate>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); limparErro() }}
                placeholder="seu@email.com"
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="field">
              <label htmlFor="senha">Senha</label>
              <div className="field-senha">
                <input
                  id="senha"
                  name="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => { setSenha(e.target.value); limparErro() }}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-senha"
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                >
                  {mostrarSenha ? '○' : '●'}
                </button>
              </div>
            </div>

            <div className="form-link-row">
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  // TODO: implementar POST /api/auth/forgot-password
                }}
              >
                Esqueci minha senha
              </button>
            </div>

            {erro && (
              <div className="form-error" role="alert">
                <div className="form-error-icon">!</div>
                {erro}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={carregando}>
              {carregando ? <span className="spinner" /> : 'Acessar minha conta'}
            </button>
          </form>

          <div className="security-badge">
            <div className="security-dot" />
            Conexão segura — SSL 256-bit
          </div>

          <div className="form-footer">
            Ainda não tem conta?{' '}
            <button type="button" onClick={() => navigate('/register')}>Solicite seu acesso</button>
          </div>
        </div>
      </main>
    </div>
  )
}
