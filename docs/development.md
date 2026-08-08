# Development

The React app runs locally. Keycloak runs on a separate VM — see
[keycloak-setup.md](keycloak-setup.md).

## Prerequisites

- Node.js 20 or newer
- Yarn (`corepack enable`)

## Running

```bash
yarn install
yarn dev
```

Open <http://localhost:5173>.

> **Note**
> Use `localhost` rather than the `Network:` address Vite also prints. Browsers
> expose the Web Crypto API only in a secure context (HTTPS or `localhost`),
> and `keycloak-js` requires it to build the PKCE challenge, so SSO login fails
> on an IP address. `http://localhost:5173` is also the only origin registered
> as a redirect URI in Keycloak.

## Configuration

Copy `.env.example` to `.env` in the repository root and set the values for
your environment:

```
VITE_KEYCLOAK_URL=http://192.168.56.22:8080
VITE_KEYCLOAK_REALM=simple-sso
VITE_KEYCLOAK_CLIENT_ID=simple-sso-app
```

These are not secrets. A public OIDC client has no client secret, and the
values are visible in the browser.

`VITE_KEYCLOAK_URL` must be reachable from the browser and must match
`KC_HOSTNAME` on the Keycloak server. Vite reads `.env` at startup only, so
restart the dev server after changing it.

## Authentication

The application supports two login paths. Both produce the same `user` object,
so `RequireRole`, `Layout` and the pages handle them identically. The badge in
the navigation bar shows which one the current session used.

| | Mock login | SSO |
| --- | --- | --- |
| Credentials | `src/data/users.js`, in the browser | Keycloak's login page |
| Role source | The user record | `realm_access.roles` in the access token |
| Reload handling | `sessionStorage` | `sessionStorage` and a `check-sso` call |

The mock login exists for comparison only. Passwords are in the client bundle
and role checks run entirely in the browser, so any user can grant themselves
`admin` from the developer console. A real application must validate the token
server-side on every request.

## Scripts

```bash
yarn dev      # start dev server
yarn build    # production build
yarn lint     # eslint
yarn preview  # preview production build
```

## Troubleshooting

| Symptom | Cause | Resolution |
| --- | --- | --- |
| SSO button does nothing | Not a secure context | Open the app at `localhost`, not an IP address |
| `Invalid parameter: redirect_uri` | Serving from an unregistered origin | Use `localhost:5173`, or register the origin in Keycloak |
| Login completes but the app hangs, with a CORS error | Origin missing from the client's **Web origins** | See [keycloak-setup.md](keycloak-setup.md), step 7 |
| User always lands on the 403 page | No realm role assigned | See [keycloak-setup.md](keycloak-setup.md), step 8 |
| Changes to `.env` have no effect | Vite reads it at startup only | Restart `yarn dev` |
| Stuck on "Starting session…" | `VITE_KEYCLOAK_URL` is unreachable | Check that the Keycloak VM is running |
