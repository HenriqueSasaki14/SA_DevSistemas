import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './RegisterPage.css'
import logo from '../assets/2.png'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export default function RegisterPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [carregando, setCarregando] = useState(false)

  const limparErro = () => { if (erro) setErro('') }
  const senhaOk     = senha.length >= 6
  const senhasBatem = senha && confirmar && senha === confirmar

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')

    if (!nome.trim() || !email || !senha || !confirmar) { setErro('Preencha todos os campos.'); return }
    if (nome.trim().length < 3)                          { setErro('O nome deve ter pelo menos 3 caracteres.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))      { setErro('Digite um e-mail válido.'); return }
    if (!senhaOk)                                         { setErro('A senha deve ter pelo menos 6 caracteres.'); return }
    if (!senhasBatem)                                     { setErro('As senhas não coincidem.'); return }

    setCarregando(true)
    try {
      const data = await api.register(nome.trim(), email, senha)
      await login(data.token)
      setSucesso(true)
      setTimeout(() => navigate('/'), 1600)
    } catch (err) {
      setErro(err.message || 'Erro ao criar conta. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="register-page">

      {/* ── Painel Esquerdo ── */}
      <aside className="register-panel">
        <div className="panel-brand">
          <img src={logo} alt="SafeCash" className="panel-logo" />
          <span className="panel-brand-name">SafeCash</span>
        </div>

        <div className="panel-body">
          <div>
            <h1 className="panel-headline">
              Comece sua<br />
              <em>jornada financeira.</em>
            </h1>
            <p className="panel-sub">
              Criar sua conta leva menos de 2 minutos. Depois disso, seu dinheiro começa a trabalhar por você.
            </p>
          </div>

          <div className="reg-steps">
            <div className="reg-step">
              <div className="step-circle active">01</div>
              <div className="step-info">
                <strong>Crie sua conta</strong>
                <span>Nome, e-mail e senha segura</span>
              </div>
            </div>
            <div className="reg-step">
              <div className="step-circle dim">02</div>
              <div className="step-info dim">
                <strong>Verifique seu e-mail</strong>
                <span>Confirme sua identidade</span>
              </div>
            </div>
            <div className="reg-step">
              <div className="step-circle dim">03</div>
              <div className="step-info dim">
                <strong>Acesse a plataforma</strong>
                <span>Dashboard completo disponível</span>
              </div>
            </div>
          </div>
        </div>

        <p className="panel-footer">
          SafeCash — Seus dados protegidos por criptografia AES-256.
        </p>
      </aside>

      {/* ── Painel Direito: formulário ── */}
      <main className="register-form-panel">
        <div className="register-box">

          <div className="register-mobile-brand">
            <img src={logo} alt="SafeCash" />
            <span>SafeCash</span>
          </div>

          {sucesso ? (
            <div className="sucesso-wrap">
              <div className="sucesso-check">✓</div>
              <h2 className="sucesso-titulo">Conta criada com sucesso!</h2>
              <p className="sucesso-sub">Preparando seu dashboard...</p>
            </div>
          ) : (
            <>
              <h2 className="register-heading">Vamos começar!</h2>
              <p className="register-sub">Preencha os dados abaixo para criar sua conta</p>

              <form onSubmit={handleSubmit} className="register-form" noValidate>
                <div className="field">
                  <label htmlFor="nome">Nome completo</label>
                  <input
                    id="nome"
                    name="nome"
                    type="text"
                    value={nome}
                    onChange={(e) => { setNome(e.target.value); limparErro() }}
                    placeholder="Como prefere ser chamado?"
                    autoComplete="name"
                    autoFocus
                  />
                </div>

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
                  />
                </div>

                <div className="field-row">
                  <div className="field">
                    <label htmlFor="senha">Senha</label>
                    <div className="field-senha">
                      <input
                        id="senha"
                        name="senha"
                        type={mostrarSenha ? 'text' : 'password'}
                        value={senha}
                        onChange={(e) => { setSenha(e.target.value); limparErro() }}
                        placeholder="Mínimo 6 caracteres"
                        autoComplete="new-password"
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

                  <div className="field">
                    <label htmlFor="confirmar">Confirmar senha</label>
                    <div className="field-senha">
                      <input
                        id="confirmar"
                        name="confirmar"
                        type={mostrarSenha ? 'text' : 'password'}
                        value={confirmar}
                        onChange={(e) => { setConfirmar(e.target.value); limparErro() }}
                        placeholder="Repita a senha"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                </div>

                <div className="pass-hints">
                  <span className={`hint ${senhaOk ? 'ok' : ''}`}>Mínimo 6 caracteres</span>
                  <span className={`hint ${senhasBatem ? 'ok' : ''}`}>Senhas coincidem</span>
                </div>

                {erro && (
                  <div className="form-error" role="alert">
                    <div className="form-error-icon">!</div>
                    {erro}
                  </div>
                )}

                <button type="submit" className="btn-primary" disabled={carregando}>
                  {carregando ? <span className="spinner" /> : 'Criar minha conta'}
                </button>
              </form>

              <div className="form-footer">
                Já tem conta?{' '}
                <button type="button" onClick={() => navigate('/login')}>Faça login</button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
