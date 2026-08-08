import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { ROLE_PERMISSIONS, USERS } from '../../data/users'
import { keycloak, sessionFromToken } from '../../keycloak'

const SESSION_KEY = 'sso-user'
// Which login path the session came from, so a reload only queries Keycloak
// when the session actually came from Keycloak.
const SOURCE_KEY = 'sso-auth-source'

// null, not {}: a component used outside the provider then fails loudly below
// instead of receiving an empty object and breaking later on `user.name`.
const GlobalContext = createContext(null)

export function useGlobalContext() {
  const context = useContext(GlobalContext)
  if (!context) {
    throw new Error('useGlobalContext must be used inside <GlobalContextProvider>')
  }
  return context
}

function readStoredUser() {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    sessionStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function GlobalContextProvider({ children }) {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [user, setUser] = useState(readStoredUser)

  // Gates rendering until Keycloak has answered. Without it, an SSO user
  // reloading the page is briefly redirected to /login.
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState(null)
  const didInit = useRef(false)

  const canAccess = (route) =>
    user ? ROLE_PERMISSIONS[user.role]?.includes(route) : false

  const applyKeycloakSession = () => {
    const session = sessionFromToken()
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    sessionStorage.setItem(SOURCE_KEY, 'keycloak')
    setUser(session)
  }

  const login = (email, password) => {
    const found = USERS.find(
      (u) => u.email === email.toLowerCase().trim() && u.password === password,
    )
    if (!found) return false
    const session = {
      id: found.id,
      name: found.name,
      email: found.email,
      role: found.role,
      source: 'mock',
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    sessionStorage.setItem(SOURCE_KEY, 'mock')
    setUser(session)
    return true
  }

  /** Navigates away to Keycloak's login page - nothing after this runs. */
  const loginWithKeycloak = () => {
    setAuthError(null)

    // crypto.subtle exists only in a secure context (HTTPS or localhost), and
    // keycloak-js needs it to build the PKCE challenge. Without this check the
    // failure surfaces as a button that silently does nothing.
    if (!window.isSecureContext) {
      setAuthError(
        `This page (${window.location.origin}) is not a secure context, so the ` +
          'browser withholds crypto.subtle and Keycloak cannot build its PKCE ' +
          'challenge. Open the app on http://localhost:5173 instead of the raw ' +
          'IP address, or serve it over HTTPS.',
      )
      return
    }

    sessionStorage.setItem(SOURCE_KEY, 'keycloak')
    keycloak
      .login({ redirectUri: `${window.location.origin}/dashboard` })
      .catch((error) => {
        console.error('Keycloak login failed:', error)
        setAuthError(`Could not start SSO login: ${error.message}`)
      })
  }

  const logout = () => {
    const wasKeycloak = sessionStorage.getItem(SOURCE_KEY) === 'keycloak'
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SOURCE_KEY)
    setUser(null)

    // Also end Keycloak's own session, or the next SSO login signs straight
    // back in with no prompt.
    if (wasKeycloak && keycloak.authenticated) {
      keycloak.logout({ redirectUri: `${window.location.origin}/login` })
    }
  }

  useEffect(() => {
    // keycloak-js throws if init() runs twice on one instance, and effects can
    // run twice in development.
    if (didInit.current) return
    didInit.current = true

    const cameFromKeycloak = sessionStorage.getItem(SOURCE_KEY) === 'keycloak'

    keycloak
      .init({
        // Restores an existing Keycloak session without showing a login form.
        // Skipped for mock sessions so they never pay for a redirect.
        onLoad: cameFromKeycloak ? 'check-sso' : undefined,
        pkceMethod: 'S256',
        // Needs third-party cookies, which browsers increasingly block.
        checkLoginIframe: false,
      })
      .then((authenticated) => {
        // Do not clear `user` when false - it may be a valid mock session.
        if (authenticated) applyKeycloakSession()
      })
      .catch((error) => {
        console.error('Keycloak init failed:', error)
        sessionStorage.removeItem(SOURCE_KEY)
      })
      .finally(() => setAuthReady(true))

    // Access tokens expire in minutes; refresh rather than drop the session.
    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).catch(() => logout())
    }
  }, [])

  if (!authReady) {
    return <div className="page center">Starting session…</div>
  }

  return (
    <GlobalContext.Provider
      value={{
        open,
        setOpen,
        user,
        canAccess,
        login,
        loginWithKeycloak,
        logout,
        authError,
        count,
        increment: () => setCount((c) => c + 1),
        decrement: () => setCount((c) => c - 1),
        reset: () => setCount(0),
      }}
    >
      {children}
    </GlobalContext.Provider>
  )
}
