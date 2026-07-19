# Keygen CE — self-hosted license server + this dashboard

One stack: Keygen CE (web + worker) with its own Postgres and Redis, plus
this repo's admin dashboard (`ui`), built and run alongside it.

## Prerequisites

- Docker + Docker Compose on the server
- DNS: your chosen API domain (e.g. `license.example.com`) → server IP
  (**before** setup — license-file URLs bake in the host)
- A reverse proxy (Traefik/nginx/caddy) terminating TLS in front of whichever
  service(s) you expose publicly (see "Exposing this stack" below)

## First-time setup

Setup runs automatically as part of `docker compose up -d` — a `setup`
service bootstraps the database and the admin account exactly once (gated by
a marker file + a live check that `accounts` is actually empty, so it can
never re-run destructively against a database that already has data — see
the comment on the `setup` service in `docker-compose.yml`), then `web`/
`worker` wait for it to finish before starting. There's no separate manual
step.

1. Copy the env template, set a **URL-safe** DB password, and generate the
   secrets (required BEFORE first boot — Rails won't run `setup` without
   them):

   ```sh
   cp .env.example .env
   echo "KEYGEN_ACCOUNT_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')"
   echo "SECRET_KEY_BASE=$(openssl rand -hex 64)"
   echo "ENCRYPTION_DETERMINISTIC_KEY=$(openssl rand -hex 32)"
   echo "ENCRYPTION_PRIMARY_KEY=$(openssl rand -hex 32)"
   echo "ENCRYPTION_KEY_DERIVATION_SALT=$(openssl rand -hex 32)"
   ```

   Paste the values into `.env` (or your platform's environment settings)
   and back them up — the `ENCRYPTION_*` keys encrypt data at rest.
   `KEYGEN_ACCOUNT_ID` has to be decided **before** setup runs — the `setup`
   service can't prompt interactively (no TTY in a container), so it aborts
   loudly if this (or `KEYGEN_ADMIN_EMAIL`/`KEYGEN_ADMIN_PASSWORD`) is
   missing on a truly fresh database.

2. Also set `KEYGEN_ADMIN_EMAIL` and `KEYGEN_ADMIN_PASSWORD` in `.env` —
   only needed for this first boot; safe to remove afterward (see step 4).

3. Bring the whole stack up (this also builds the dashboard image from the
   repo root — expect the first `up` to take longer than later ones):

   ```sh
   docker compose up -d
   ```

   Watch it bootstrap: `docker compose logs -f setup`.

4. Once it's up, remove `KEYGEN_ADMIN_EMAIL` / `KEYGEN_ADMIN_PASSWORD` from
   `.env` — they're only read on the one boot where the marker is absent and
   the database is empty; every boot after this is a no-op for `setup`
   regardless of whether they're still set, but there's no reason to leave
   the admin password sitting in `.env` longer than it has to.

5. Verify the API: `curl -s https://<your-api-domain>/v1/ping`.
   Verify the dashboard by loading whatever domain you exposed `ui` on (see
   below) and logging in with the admin email/password from step 2.

## After setup

- Log into the dashboard to create a **Product**, a **Policy**, and
  per-customer **Licenses**.
- The account's **Ed25519 public key** — needed by any client that verifies
  signed license files offline — is on the dashboard's Settings page.

## Exposing this stack

Two services can need public routing, handled the same way as every other
service here — via container labels your platform attaches based on which
service/port you designate, not via anything written into this compose
file. No nginx or explicit routing rules are needed for the public-facing
side:

- **`ui`** (port 3000) — the dashboard. Point your admin domain at it.
- **`web`** (port 3000, same image different command) — the raw Keygen API,
  if you want your API domain to serve traffic directly (license activation,
  checkouts, etc. from licensed applications and other clients). This is the
  one that needs the DNS host from "Prerequisites."

The dashboard does **not** call the API through its own public URL — see
"How the dashboard reaches the API" below, and don't expose the dashboard
without an IP allowlist or basic-auth in front of it; it has no login
rate-limiting of its own beyond what Keygen's API already does.

### How the dashboard reaches the API

`ui` and `web` are both services in *this same* compose file, so they
already share a Docker network directly — `ui`'s build arg points straight
at `http://web:3000/v1`, no shim in between.

The one obstacle a direct `http://web:3000` request hits is Rails' own
`Host` authorization and `force_ssl`: `force_ssl` 301-redirects a plain HTTP
request to HTTPS, and the `Host` header from a raw compose service-name
request won't match Keygen's configured `KEYGEN_HOST`. The dashboard's proxy
route (`src/app/api/keygen/[...path]/route.ts`) sets `Host` and
`X-Forwarded-Proto` on that one outbound request itself, whenever
`KEYGEN_INTERNAL_HOST` is set (see that service's `environment:` in
`docker-compose.yml`) — reproducing exactly what a real HTTPS request
through the public domain looks like, entirely in application code, no
extra container needed.

If some *other* service ever needs to reach this account's API the same
way, it needs the same two things: a shared Docker network with `web`, and
to set those two headers itself on its own outbound request.

## Artifact storage (external S3-compatible server)

Release artifacts (application update binaries) are stored on an
**externally managed** S3-compatible server via Keygen's S3 backend
(`AWS_ENDPOINT` + `AWS_FORCE_PATH_STYLE=true`). That server is a separate
deployment — this stack only consumes it through the `AWS_*` env vars.

Requirements on the external server:

- Publicly reachable with TLS at `${AWS_ENDPOINT}` — Keygen hands out
  **presigned URLs**, so clients (downloads) and the admin browser
  (uploads) talk to it directly. Without the public route, artifact
  upload/download fails even though Keygen itself works.
- The `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` here must match its
  access/secret key, and `${AWS_BUCKET}` must name a bucket on it.

The Keygen account's storage backend was set to `S3` at account creation
(`account.backend`) — no Keygen-side data change needed. Migrating to real
S3/R2 later = repoint the `AWS_*` values.

## Deploying non-interactively (e.g. Dokploy, or any platform-managed compose)

- If your platform deploys with `docker compose -p <app-name>`, that
  **overrides** the `name:` in this file. Any manual `docker compose
  run`/`exec` on the server must pass the same project name, or compose
  silently creates a parallel stack with its own postgres/volumes.
- Setup (the `setup` service) runs non-interactively off `KEYGEN_ACCOUNT_ID`,
  `KEYGEN_ADMIN_EMAIL`, and `KEYGEN_ADMIN_PASSWORD` — set them as regular
  environment variables for this app, same as any other var here, no manual
  `docker compose run` needed (see "First-time setup" above). If you ever do
  need to invoke it by hand (e.g. to inspect its output live), match your
  platform's project name or it'll spin up a parallel stack with its own
  postgres/volumes:

  ```sh
  docker compose -p <app-name> run --rm setup
  ```
- After first boot, remove `KEYGEN_ADMIN_EMAIL` / `KEYGEN_ADMIN_PASSWORD`
  from the environment — they're not needed again (`setup` no-ops on every
  boot after the marker exists).

## Upgrades

```sh
docker compose pull        # pulls a newer keygen/api image; ui rebuilds from source
docker compose build ui    # if you've changed dashboard code
docker compose run --rm web release   # run pending DB migrations — NOT `migrate`;
                                       # the image's entrypoint only recognizes
                                       # "release" for this (bundle exec rails
                                       # db:migrate), confirmed against its
                                       # actual entrypoint script.
docker compose up -d
```

## Backup

Back up the `keygen_pgdata` volume (or `pg_dump` the `keygen` DB) and the
`.env` file — the encryption keys in `.env` are required to read the
database; losing them loses the install.
