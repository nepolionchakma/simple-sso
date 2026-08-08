# Simple SSO

A simple Single Sign-On demo built with **React + Vite** that shows email/password login with **role-based access control (RBAC)**.

## Features

- Login page with email + password (mock authentication)
- Role-based access control — routes are protected per role
- Unauthorized redirects to a 403 page when a role is not allowed
- Nav links are hidden for routes the user cannot access
- Session persists in `sessionStorage`
- Global state managed with a single **GlobalContext** (provider + hook in one file)

## Demo accounts

Local (mock) login — these are the values in `src/data/users.js`:

| Role    | Email               | Password   | Access                            |
| ------- | ------------------- | ---------- | --------------------------------- |
| admin   | admin@gmail.com     | admin123   | Dashboard, Editor, Admin          |
| editor  | editor@gmail.com    | editor123  | Dashboard, Editor                 |
| viewer  | viewer@gmail.com    | viewer123  | Dashboard only                    |

Keycloak SSO login — these live in the `simple-sso` realm:

| Role    | Username | Password  |
| ------- | -------- | --------- |
| admin   | alice    | alice123  |
| editor  | eddie    | eddie123  |
| viewer  | vera     | vera123   |

## Routes

| Path            | Allowed roles                 |
| --------------- | ----------------------------- |
| `/login`        | public                        |
| `/dashboard`    | admin, editor, viewer         |
| `/editor`       | admin, editor                 |
| `/admin`        | admin                         |
| `/unauthorized` | public (403 page)             |

## Project structure

```
src/
├── Context/
│   └── GlobalContext/
│       └── GlobalContext.jsx   # createContext + useGlobalContext + GlobalContextProvider
├── data/
│   └── users.js                # mock users + role permissions
├── hooks/
│   └── useAuth.js              # re-exports useGlobalContext
├── components/
│   ├── Layout.jsx              # nav with role-filtered links
│   └── RequireRole.jsx         # route guard (login redirect / 403)
├── pages/
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── Editor.jsx
│   ├── Admin.jsx
│   └── Unauthorized.jsx
├── keycloak.js                 # Keycloak instance + token -> role mapping
├── App.jsx                     # route definitions with role guards
└── main.jsx                    # BrowserRouter + GlobalContextProvider

docs/
├── development.md              # running the app, .env, troubleshooting
└── keycloak-setup.md           # VM, Docker, and admin console walkthrough

keycloak/
├── docker-compose.yml          # Keycloak 26.7 + Postgres
└── .env.example                # copy to .env; KC_HOSTNAME must be set
```

## How access control works

1. `src/data/users.js` defines mock users and a `ROLE_PERMISSIONS` map.
2. `RequireRole` (`src/components/RequireRole.jsx`) wraps routes and checks the user's role.
3. Logged-out users are redirected to `/login`; logged-in users without the required role go to `/unauthorized`.
4. The nav in `Layout.jsx` only renders links the current role can access.

## Keycloak SSO

Keycloak runs in Docker on a VirtualBox VM; the app runs locally. A compose file
is provided in [keycloak/](keycloak/). Setup instructions are in
[docs/keycloak-setup.md](docs/keycloak-setup.md), which must be completed before
SSO login works.

The client is public and uses the Authorization Code flow with PKCE. Realm roles
are named `admin`, `editor` and `viewer` to match `ROLE_PERMISSIONS` in
`src/data/users.js`. `src/keycloak.js` reads them from
`tokenParsed.realm_access.roles` and reduces them to a single role, taking the
most privileged if a user holds several.

Both login paths produce the same `user` object, so `RequireRole`, `Layout` and
the pages handle them identically. The badge in the navigation bar shows which
one the current session used.

## Getting started

```bash
yarn install
yarn dev
```

Open <http://localhost:5173>.

Use `localhost` rather than the `Network:` address Vite also prints. Browsers
expose the Web Crypto API only in a secure context (HTTPS or `localhost`), and
`keycloak-js` requires it for PKCE, so SSO login fails on an IP address.

See [docs/development.md](docs/development.md) for configuration and
troubleshooting.

## Docs

- [docs/development.md](docs/development.md) — running the app, `.env`, troubleshooting
- [docs/keycloak-setup.md](docs/keycloak-setup.md) — creating the realm, client, roles and users in the Keycloak admin console

## Scripts

```bash
yarn dev      # start dev server
yarn build    # production build
yarn lint     # eslint
yarn preview  # preview production build
```
