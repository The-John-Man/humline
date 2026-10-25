# Humline handoff

Last updated: October 25, 2026. Inspect Git, the current conversation, and live PR state before acting.

## Current state

Humline is a React/TypeScript/Vite browser music studio plus Clerk accounts and a private PostgreSQL melody library on **`main`**.

Working loop: Record/import → Convert → Piano-roll edit → Instrument playback → MIDI export. Audio analysis runs locally in a worker with Pitchy. Cloud saves store notes/settings only.

**Public static demo (GitHub Pages):** https://the-john-man.github.io/humline/demo/ — studio only; no Clerk, API, or Postgres. Deployed by `.github/workflows/pages.yml` on push to `main` (Pages build type = workflow).

Integration history: Clerk/library, app-owned account deletion with reverification, post-save studio navigation, safer auth redirects, Windows-friendly browser/HTTPS verification, louder default playback volume, and MIDI export copy for DAWs (including GarageBand).

## User decisions

1. Challenge rules preserved in [requirements](CHALLENGE_REQUIREMENTS.md).
2. Clerk accounts with a **private cloud melody library**.
3. Implementation authorized; `main` is public on GitHub.
4. Static GitHub Pages demo authorized; do not provision paid Node/Postgres hosts without instruction.

## Open blockers

1. **Clerk development instance** — rotate keys that were shared in chat; webhook signing secret and `npm run test:clerk` still optional for local full-stack checks.
2. **Full-stack hosting** — Node host + managed Postgres (or equivalent) and production Clerk instance not selected. Pages does not replace this.
3. Human microphone / human-hum quality and independent DAW checks remain user participation items.

## Local verification (this environment)

- `npm test`: 35 passed (includes library API with optional real `humline_test` Postgres).
- `npm run build`: passed.
- `npm run test:browser`: 13 passed.
- `npm run test:https`: passed.
- `npm run db:migrate`: applied `accounts` / `melodies` schema.
- `npm run test:clerk`: **not run** against a fully configured development instance in CI.

## File map

| Location | Context |
|---|---|
| `app/src/Root.tsx` | Clerk provider, routes, welcome/auth/account shell; public `/demo` |
| `app/src/cloud/` | Library, cloud studio, API client, deletion UI |
| `app/src/App.tsx` | Studio state, recording/conversion/playback |
| `app/server/` | Express API, repository, schema, Clerk auth/webhooks |
| `.github/workflows/pages.yml` | Static demo → GitHub Pages |
| `compose.yaml` | Local Postgres 17 |
| `docs/CLOUD_SETUP.md` | Setup, deletion, verification |
| `docs/CLERK_AUTH_PLAN.md` | Design reference |
| `humline-build-context/` | Immutable original specification and fixtures |
| `review/` | Original MVP static artifacts |

## Next steps

1. Confirm GitHub Pages source is **GitHub Actions** and the demo URL loads.
2. Rotate Clerk keys; run `npm run test:clerk` if full auth verification is needed.
3. Choose Node + Postgres host only if a live accounts/library deploy is required.
