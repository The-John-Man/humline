# Humline handoff

Last updated: October 24, 2026. Inspect Git, the current conversation, and live PR state before acting.

## Current state

Humline is a React/TypeScript/Vite browser music studio plus Clerk accounts and a private PostgreSQL melody library on branch `codex/clerk-library`.

Working loop: Record/import → Convert → Piano-roll edit → Instrument playback → MIDI export. Audio analysis runs locally in a worker with Pitchy. Cloud saves store notes/settings only.

Integration commit base: `19d9028` (Clerk/library). Follow-up work on this branch adds app-owned account deletion with reverification, post-save studio navigation, safer auth redirects, Windows-friendly browser/HTTPS verification, and documentation updates.

[PR #1](https://github.com/The-John-Man/humline/pull/1) — original music MVP (`codex/humline-mvp` → `main`).  
[PR #2](https://github.com/The-John-Man/humline/pull/2) — Clerk/library integration (`codex/clerk-library`). Inspect its base: it was stacked on the MVP branch. Do not merge without explicit instruction.

## User decisions

1. Challenge rules preserved in [requirements](CHALLENGE_REQUIREMENTS.md).
2. Clerk accounts with a **private cloud melody library**.
3. Implementation authorized after the plan-first phase; continue fixing and finishing integration.
4. Do not provision paid services, deploy publicly, or merge PRs without instruction.

## Open blockers

1. **Clerk development instance** — need publishable key, secret key, webhook signing secret, and two test users for `npm run test:clerk`. Configure email verification, recovery, Google, and optional MFA in the Clerk Dashboard.
2. **Hosting choice** — Node host + managed Postgres (or equivalent). Production domain and Clerk production instance not selected.
3. Human microphone / human-hum quality and independent DAW checks remain user participation items.

## Local verification (this environment)

- `npm test`: 35 passed (includes library API with optional real `humline_test` Postgres).
- `npm run build`: passed.
- `npm run test:browser`: 13 passed.
- `npm run test:https`: passed.
- `npm run db:migrate`: applied `accounts` / `melodies` schema.
- `npm run test:clerk`: **not run** (credentials unavailable).

## File map

| Location | Context |
|---|---|
| `app/src/Root.tsx` | Clerk provider, routes, welcome/auth/account shell |
| `app/src/cloud/` | Library, cloud studio, API client, deletion UI |
| `app/src/App.tsx` | Studio state, recording/conversion/playback |
| `app/server/` | Express API, repository, schema, Clerk auth/webhooks |
| `compose.yaml` | Local Postgres 17 |
| `docs/CLOUD_SETUP.md` | Setup, deletion, verification |
| `docs/CLERK_AUTH_PLAN.md` | Design reference |
| `humline-build-context/` | Immutable original specification and fixtures |
| `review/` | Original MVP static artifacts |

## Next steps

1. User supplies Clerk development keys and confirms Dashboard auth options.
2. Run `npm run test:clerk` and manual auth/deletion checks.
3. User chooses hosting; prepare deployment docs for that host only after approval.
4. Update PR #2 description with results and known limitations; do not merge until asked.
