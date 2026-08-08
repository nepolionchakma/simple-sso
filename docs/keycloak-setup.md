# Keycloak setup

Keycloak runs in Docker on a VirtualBox VM. The React app runs on your own
machine and reaches Keycloak over a host-only network.

## Prerequisites

- VirtualBox
- Ubuntu Server 24.04 ISO

## 1. Create the VM

Create a VM with 4096 MB memory, 2 CPUs and a 25 GB disk, then install Ubuntu
Server 24.04. Select **Install OpenSSH server** during installation.

## 2. Configure networking

The VM needs two adapters:

| Adapter | Attached to | Purpose |
| --- | --- | --- |
| 1 | NAT | Outbound internet access, for pulling images |
| 2 | Host-only Adapter | Access from your machine |

Enable the second adapter under **Settings → Network → Adapter 2**.

Do not add port forwarding rules to the NAT adapter. Keycloak should be reached
at its own address rather than through `localhost`, so that development matches
a production deployment where Keycloak runs on a separate host.

Boot the VM and find its host-only address:

```bash
ip -br addr
```

The address is on the `192.168.56.0/24` network. This guide uses
`192.168.56.22` — substitute your own throughout.

## 3. Install Docker

On the VM:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Log out and back in, then verify:

```bash
docker compose version
```

## 4. Start Keycloak

Copy the compose file from the repository to the VM:

```bash
scp -r keycloak <user>@192.168.56.22:~/
```

On the VM, create the environment file:

```bash
cd ~/keycloak
cp .env.example .env
```

Set `KC_HOSTNAME` in `.env` to the address your browser uses to reach Keycloak,
including scheme and port:

```bash
KC_HOSTNAME=http://192.168.56.22:8080
```

> **Note**
> Do not use `localhost` here. Inside the VM it refers to the VM itself.
> Keycloak builds redirect URLs and the token's `iss` claim from this value, so
> an incorrect setting causes login failures that are hard to diagnose. The
> compose file will not start without it.

Change the default passwords if the VM is not a throwaway.

Start the services:

```bash
docker compose up -d
docker compose logs -f keycloak
```

The first start takes about a minute while the database schema is created.

### Verify

From your own machine:

```bash
curl http://192.168.56.22:8080/realms/master/.well-known/openid-configuration
```

The `issuer` field must match the URL you requested. If it does not, correct
`KC_HOSTNAME` and run `docker compose up -d` again before continuing.

Realms, users and clients are stored in the Postgres container, so recreating
the Keycloak container does not lose configuration.

## 5. Create the realm

Open <http://192.168.56.22:8080/admin> and sign in with the `KC_ADMIN` and
`KC_ADMIN_PASSWORD` values from `.env`.

1. Open the realm selector at the top of the left sidebar.
2. Click **Create realm**.
3. Set **Realm name** to `simple-sso`.
4. Click **Create**.

All remaining steps happen inside this realm. If a screen appears empty, check
that the realm selector still reads `simple-sso` rather than `master`.

## 6. Create the realm roles

Create three roles: `admin`, `editor` and `viewer`. For each one:

1. Go to **Realm roles** → **Create role**.
2. Enter the role name.
3. Click **Save**.

The names match the `ROLE_PERMISSIONS` keys in `src/data/users.js`, so the
application uses the role from the token directly without mapping it.

## 7. Create the client

Go to **Clients** → **Create client**.

### General settings

| Field | Value |
| --- | --- |
| Client type | OpenID Connect |
| Client ID | `simple-sso-app` |
| Name | Simple SSO Demo App |

### Capability config

| Field | Value | Reason |
| --- | --- | --- |
| Client authentication | Off | Public client; browser applications cannot hold a secret |
| Authorization | Off | Not used |
| Standard flow | Enabled | Authorization Code flow |
| Direct access grants | Disabled | Password grant; the application should never handle passwords |
| Implicit flow | Disabled | Superseded by Authorization Code with PKCE |
| Service accounts roles | Disabled | Machine-to-machine only |

### Login settings

| Field | Value |
| --- | --- |
| Root URL | `http://localhost:5173` |
| Home URL | `/` |
| Valid redirect URIs | `http://localhost:5173/*` |
| Valid post logout redirect URIs | `http://localhost:5173/*` |
| Web origins | `http://localhost:5173` |

These are the application's addresses, not Keycloak's. `http://localhost:5173`
is where Vite serves the app. If you serve it from another origin, add that
origin to all three fields.

Click **Save**.

Reference:

- **Valid redirect URIs** — allowlist of addresses Keycloak will return the
  login result to. Unlisted addresses are rejected with
  `Invalid parameter: redirect_uri`.
- **Valid post logout redirect URIs** — the same allowlist, applied after
  logout.
- **Web origins** — CORS allowlist for the token endpoint. If an origin is
  missing, login completes but the token request fails with a CORS error.

### Enable PKCE

PKCE is configured after the client is created, not in the creation wizard.

1. Open the `simple-sso-app` client.
2. Go to the **Advanced** tab.
3. Under **Advanced settings**, set **Proof Key for Code Exchange Code
   Challenge Method** to `S256`.
4. Click **Save**.

## 8. Create the users

Create three users under **Users** → **Add user**:

| Username | First name | Last name | Email | Role | Password |
| --- | --- | --- | --- | --- | --- |
| `alice` | Alice | Admin | alice@example.com | `admin` | `alice123` |
| `eddie` | Eddie | Editor | eddie@example.com | `editor` | `eddie123` |
| `vera` | Vera | Viewer | vera@example.com | `viewer` | `vera123` |

For each user:

1. Enter the username, email, first name and last name, set **Email verified**
   to On, and click **Create**.
2. On the **Credentials** tab, click **Set password**, enter the password, set
   **Temporary** to Off, and save.
3. On the **Role mapping** tab, click **Assign role**, change the filter to
   **Filter by realm roles**, select the role, and click **Assign**.

> **Note**
> Leaving **Temporary** on On forces a password change at first login. The role
> assignment dialog defaults to client roles, so the list appears empty until
> the filter is changed to realm roles.

## 9. Configure the application

Copy `.env.example` to `.env` in the repository root and set:

```
VITE_KEYCLOAK_URL=http://192.168.56.22:8080
VITE_KEYCLOAK_REALM=simple-sso
VITE_KEYCLOAK_CLIENT_ID=simple-sso-app
```

`VITE_KEYCLOAK_URL` must match `KC_HOSTNAME`. Vite reads `.env` at startup, so
restart the dev server after changing it.

```bash
yarn install
yarn dev
```

Open <http://localhost:5173> and sign in with **Log in using SSO** as `vera` /
`vera123`. The dashboard shows the `viewer` role, the Editor and Admin links
are hidden, and `/admin` returns the 403 page. Signing in as `alice` /
`alice123` shows all three links.

## Roles in the token

Realm roles appear in the access token under `realm_access.roles`:

```json
{
  "iss": "http://192.168.56.22:8080/realms/simple-sso",
  "preferred_username": "alice",
  "name": "Alice Admin",
  "realm_access": { "roles": ["offline_access", "admin", "uma_authorization"] }
}
```

`offline_access`, `uma_authorization` and `default-roles-simple-sso` are
Keycloak defaults and are ignored. `src/keycloak.js` selects the first matching
role from `admin`, `editor`, `viewer`, in that order.

## Troubleshooting

| Symptom | Cause | Resolution |
| --- | --- | --- |
| SSO button does nothing | The page is not a secure context, so `crypto.subtle` is unavailable and PKCE cannot be computed | Open the app at `http://localhost:5173` rather than an IP address |
| Browser redirected to an unreachable address | `KC_HOSTNAME` does not match the address the browser uses | Correct it in `keycloak/.env` and restart the container (step 4) |
| `Invalid parameter: redirect_uri` | The application's origin is not registered | Add the origin to **Valid redirect URIs** (step 7) |
| Login completes but the app hangs, with a CORS error | Origin missing from **Web origins** | Add the origin (step 7) |
| User always lands on the 403 page | No realm role assigned, or the name does not match | Assign the role (step 8) |
| Password change prompt at first login | **Temporary** was left on | Reset the password with **Temporary** off (step 8) |
| Role list empty when assigning | Filter set to client roles | Change to **Filter by realm roles** |
| SSO signs in without prompting | The Keycloak session is still active | Use the application's Logout, which also ends the Keycloak session |
| `docker compose up` reports a missing variable | `KC_HOSTNAME` is unset | Set it in `keycloak/.env` (step 4) |
