import { NavLink, useNavigate } from 'react-router-dom'
import logo from '../../assets/1.png'
import { useAuth } from '../../contexts/auth'

export default function Header() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const nome = usuario?.nome || usuario?.email || 'Usuário'

  return (
    <header className="home-header">
      <div className="header-brand">
        <img src={logo} alt="SafeCash" className="header-logo" />
        <span className="header-brand-name">SafeCash</span>
      </div>

      <nav className="header-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Dashboard
        </NavLink>
        {usuario?.perfil === 'ADMIN' && (
          <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Administração
          </NavLink>
        )}
      </nav>

      <div className="header-user">
        <div className="user-avatar">{nome[0].toUpperCase()}</div>
        <span className="user-name">
          {nome}
          {usuario?.perfil === 'ADMIN' && <span className="perfil-badge">ADMIN</span>}
        </span>
        <button className="btn-sair" onClick={() => { logout(); navigate('/login') }}>Sair</button>
      </div>
    </header>
  )
}
