# Clerk and private library integration

Current branch: `codex/clerk-library`. Integration code is present; live Clerk sign-in and production deployment still need configuration and verification. No Clerk application or paid infrastructure was created.

## Implemented

- Welcome, branded Clerk sign-in/sign-up, account management, protected library/studio routes, and a public `/demo`.
- PostgreSQL library with create/open/rename/duplicate/delete, server-side session verification, owner-scoped queries, size/quota limits, and revision conflicts.
- First explicit save followed by debounced autosave, save-error recovery, JSON backup, navigation protection, account-scoped drafts, and explicit legacy local-project import.
- Original audio and recording filenames stay local; cloud payloads contain only musical project content.
- Signed Clerk `user.deleted` webhook cleanup with persistent deletion tombstones. Account deletion uses Clerk's profile flow; cleanup is asynchronous after webhook delivery, rather than the custom immediate deletion orchestration proposed in the plan. Configure and verify delivery before enabling account deletion for real users.

## Local setup

Use Node 24 and Docker (or an existing PostgreSQL database).

```sh
docker compose up -d db
cd app
npm ci
cp .env.example .env
```

Configure `.env` privately:

- `VITE_CLERK_PUBLISHABLE_KEY`: development publishable key from your Clerk app.
- `CLERK_SECRET_KEY`: backend secret, never a `VITE_` variable.
- `CLERK_WEBHOOK_SIGNING_SECRET`: signing secret for the `user.deleted` webhook.
- `DATABASE_URL`: the example connects to the local Compose database. Use the provider's TLS-enabled connection string for hosted PostgreSQL; do not disable certificate verification.
- `APP_ORIGINS`: exact allowed frontend origins. Defaults in the example cover localhost ports 5173 and 3001. Use the actual HTTPS origin in production.

In Clerk configure email/password, email verification, Google if desired, and account security settings. Authentication UI reflects the instance configuration; those provider features are not enabled by application code. Point the signed deletion webhook at the publicly reachable `/api/webhooks/clerk`. Local webhook delivery needs a supported tunnel or a deployed development API; no tunnel is configured here.

```sh
npm run db:migrate
npm run dev:full
```

Open `http://localhost:5173`. Alternatively `npm run build && npm start` serves frontend and API on port 3001. The server supports SPA deep links and does not return HTML for missing assets/API routes. Migration requires only the database connection; starting the API requires the other settings.

For the public demo alone: `npm run dev`, then open `/demo`. Without a publishable key, private routes show a setup message; they do not bypass authentication.

## Hosting

Deploy the repository to a Node-capable host, install dependencies in `app/`, provide environment variables, run the migration, build, and start with `npm start`. Install dev dependencies too because the current server runs through `tsx`. The frontend publishable key is embedded at build time. A static-only ZIP cannot provide the API/database library. Host/database provider and production domain have not been chosen.

Use separate Clerk production credentials and configure production OAuth/domain settings before launch. The current in-memory rate limiter is intended for one API instance and does not trust forwarded client-IP headers; evaluate proxy configuration and shared limits before scaling behind a load balancer. Database schema setup is additive/idempotent; establish versioned migrations and backups before future schema changes.

## Verification and remaining work

Local verification includes the original music suite, eight library/API cases with real disposable PostgreSQL, five cloud-editor recovery cases, and browser checks for the demo and unconfigured-route behavior. API tests inject test identities; editor tests mock the Clerk boundary. They do **not** prove live Clerk integration.

Run:

```sh
npm test
npm run build
npm run test:browser
npm run test:https
npm run format:check
```

`TEST_DATABASE_URL` optionally runs library tests against PostgreSQL instead of pg-mem. It must name a disposable database ending in `_test`: tests clear its tables. Never use a production connection.

For real Clerk verification, create two test users in the development instance, add `CLERK_TEST_USER_A` and `CLERK_TEST_USER_B` email addresses to the private environment, build with its publishable key, migrate the development database, then run `npm run test:clerk`. This suite uses Clerk's testing helpers and verifies cross-context reopening and cross-user API denial. It has not run because credentials are unavailable. Also manually verify sign-up/email verification, password recovery, Google, MFA if enabled, session expiry, cross-tab sign-out, and signed deletion-webhook delivery.

Remaining limitations: no provisioned live Clerk application, hosting, or cloud database; no real identity-provider or webhook-delivery verification; no production deployment; account deletion cleanup depends on webhook delivery/retries. Local recovery drafts are not encrypted and can remain after unexpected session loss. Physical microphone/human-hum quality and independent DAW validation remain pending. Older `review/` artifacts are explicitly the original MVP.
