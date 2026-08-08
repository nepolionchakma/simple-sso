import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', route: 'dashboard' },
  { label: 'Editor', path: '/editor', route: 'editor' },
  { label: 'Admin', path: '/admin', route: 'admin' },
]

export default function Layout() {
  const { user, canAccess, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="layout">
      <nav className="nav">
        <span className="brand">Simple SSO</span>
        <ul className="nav-links">
          {NAV_ITEMS.filter((item) => canAccess(item.route)).map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="nav-user">
          <span className="user-name">{user.name}</span>
          <span className="role-badge">{user.role}</span>
          <span className="role-badge" title="Which login path this session came from">
            {user.source === 'keycloak' ? 'SSO' : 'local'}
          </span>
          <button type="button" className="btn logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}