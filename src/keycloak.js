import Keycloak from 'keycloak-js'

// Module scope on purpose: keycloak-js holds the tokens and refresh timers
// internally, so a second instance would mean two competing sessions.
export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
})

// Most privileged first: a user holding several roles gets the strongest one.
const ROLE_PRIORITY = ['admin', 'editor', 'viewer']

export function roleFromToken() {
  // Realm roles. Client roles would be under resource_access[clientId].roles.
  const roles = keycloak.tokenParsed?.realm_access?.roles ?? []
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? null
}

// Same shape the mock login produces, so RequireRole, Layout and the pages
// cannot tell the two apart.
export function sessionFromToken() {
  const claims = keycloak.tokenParsed ?? {}
  return {
    id: claims.sub,
    name: claims.name ?? claims.preferred_username,
    email: claims.email,
    role: roleFromToken(),
    source: 'keycloak',
  }
}
