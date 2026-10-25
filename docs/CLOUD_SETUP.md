# Clerk and private library integration

Current branch: `codex/clerk-library`. Integration code is implemented and locally verified. Live Clerk sign-in and production deployment still need your development instance credentials and a hosting decision.

## Implemented

- Welcome, branded Clerk sign-in/sign-up, account management, protected library/studio routes, and a public `/demo`.
- PostgreSQL library with create/open/rename/duplicate/delete, server-side session verification, owner-scoped queries, size/quota limits, and revision conflicts.
- First explicit save followed by debounced autosave, save-error recovery, JSON backup, navigation protection, account-scoped drafts, and explicit legacy local-project import. After the first successful cloud save, the studio navigates to `/studio/:id`.
- Original audio and recording filenames stay local; cloud payloads contain only musical project content.
- **App-owned account deletion** at `DELETE /api/account`: Clerk reverification (`strict`), immediate write-blocking tombstone, melody removal, then Clerk identity deletion. Signed `user.deleted` webhooks remain the idempotent backup for Dashboard-initiated removals. The Account page explains consequences and requires typing `DELETE` before proceeding.
- Safe internal `redirect_url` handling after sign-in/sign-up.

## Local setup

Use Node 24. Prefer Docker Compose for PostgreSQL when Docker is available:

```sh
docker compose up -d db
cd app
npm ci
cp .env.example .env
```

Without Docker, any local PostgreSQL 17+ instance works. Create role/database credentials that match `.env` (the example uses `humline` / `local-development-only` / database `humline`). Also create a disposable `humline_test` database if you will run API tests against real PostgreSQL.

Configure `.env` privately:

- `VITE_CLERK_PUBLISHABLE_KEY`: development publishable key from your Clerk app.
- `CLERK_SECRET_KEY`: backend secret, never a `VITE_` variable.
- `CLERK_WEBHOOK_SIGNING_SECRET`: signing secret for the `user.deleted` webhook.
- `DATABASE_URL`: Compose example connects to local Postgres. Use the provider's TLS-enabled connection string for hosted PostgreSQL; do not disable certificate verification.
- `APP_ORIGINS`: exact allowed frontend origins. Defaults cover localhost ports 5173 and 3001. Use the actual HTTPS origin in production.
- Optional: `CLERK_TEST_USER_A` / `CLERK_TEST_USER_B` for `npm run test:clerk`.
- Optional: `TEST_DATABASE_URL` ending in `_test` for disposable Postgres API tests.

In Clerk (development instance):

1. Enable email/password, email verification, password recovery, and Google if desired.
2. Enable account management / MFA options you want exposed in UserProfile.
3. Add allowed origins/redirects for `http://localhost:5173` and your API origin.
4. Point a signed `user.deleted` webhook at a publicly reachable `/api/webhooks/clerk` (tunnel or deployed API). Local webhook delivery is not required for the app-owned delete path.

```sh
npm run db:migrate
npm run dev:full
```

Open `http://localhost:5173`. Alternatively `npm run build && npm start` serves frontend and API on port 3001. The server supports SPA deep links and does not return HTML for missing assets/API routes. Migration requires only the database connection; starting the API requires the other settings.

For the public demo alone: `npm run dev`, then open `/demo`. Without a publishable key, private routes show a setup message; they do not bypass authentication.

## Hosting

Deploy the repository to a Node-capable host, install dependencies in `app/`, provide environment variables, run the migration, build, and start with `npm start`. Install dev dependencies too because the current server runs through `tsx`. The frontend publishable key is embedded at build time. A static-only ZIP cannot provide the API/database library.

**Host/database provider and production domain have not been chosen — ask before provisioning paid services or deploying publicly.**

Use separate Clerk production credentials and configure production OAuth/domain settings before launch. The current in-memory rate limiter is intended for one API instance and does not trust forwarded client-IP headers; evaluate proxy configuration and shared limits before scaling behind a load balancer. Database schema setup is additive/idempotent; establish versioned migrations and backups before future schema changes.

## Verification and remaining work

Local verification (October 24, 2026, Windows Node 24.16 / Chromium via Playwright):

| Check | Result |
|---|---|
| `npm test` | PASS: 35 tests (DSP, editor/MIDI, lifecycle, 10 library/API cases including app-owned deletion, 5 cloud-editor cases). With `TEST_DATABASE_URL` → real disposable Postgres. |
| `npm run build` | PASS |
| `npm run test:browser` | PASS: 13 tests |
| `npm run test:https` | PASS (OpenSSL via Git for Windows when `openssl` is not on PATH) |
| `npm run db:migrate` | PASS against local PostgreSQL |

API tests inject test identities; editor tests mock the Clerk boundary. They do **not** prove live Clerk integration.

```sh
npm test
npm run build
npm run test:browser
npm run test:https
npm run format:check
```

`TEST_DATABASE_URL` must name a disposable database ending in `_test`: tests clear its tables. Never use a production connection.

For real Clerk verification, create two test users in the development instance, add `CLERK_TEST_USER_A` and `CLERK_TEST_USER_B` to the private environment, build with its publishable key, migrate the development database, then run `npm run test:clerk`. Also manually verify sign-up/email verification, password recovery, Google, MFA if enabled, session expiry, cross-tab sign-out, app-owned deletion, and webhook delivery for Dashboard-initiated deletes.

Remaining limitations: no provisioned live Clerk application in this environment; hosting/cloud database not chosen; `npm run test:clerk` not run without credentials; local recovery drafts are not encrypted. Physical microphone/human-hum quality and independent DAW validation remain pending. Older `review/` artifacts are the original MVP.
