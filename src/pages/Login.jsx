import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { USERS } from '../data/users'

export default function Login() {
  const { user, login, loginWithKeycloak, authError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const from = location.state?.from?.pathname || '/dashboard'

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!login(email, password)) {
      setError('Invalid email or password.')
    } else {
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className='text-center'>Sign in</h1>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />

        {error && <p className="error">{error}</p>}

        <button type="submit" className="btn primary">
          Sign in
        </button>
      </form>
      <div className="login-card">
        <button
          type="button"
          className="btn secondary"
          onClick={loginWithKeycloak}
        >
          Log in using SSO
        </button>
        {authError && <p className="error">{authError}</p>}
        <p className="demo-note">
          Sends you to Keycloak to sign in. Try <code>alice</code> /{' '}
          <code>alice123</code> (admin), <code>eddie</code> /{' '}
          <code>eddie123</code> (editor), or <code>vera</code> /{' '}
          <code>vera123</code> (viewer).
        </p>
      </div>

      <div className="demo-box">
        <h2>Demo accounts</h2>
        <table className="demo-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Email</th>
              <th>Password</th>
            </tr>
          </thead>
          <tbody>
            {USERS.map((u) => (
              <tr key={u.id}>
                <td>
                  <span className={`role-badge ${u.role}`}>{u.role}</span>
                </td>
                <td>{u.email}</td>
                <td>
                  <code>{u.password}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="demo-note">
          admin can see everything · editor can upload content · viewer is
          read-only
        </p>
      </div>
    </div>
  )
}