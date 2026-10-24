# Humline: guidance for coding agents

## Current implementation

Clerk authentication and a private PostgreSQL melody library are implemented on `codex/clerk-library`. Read `docs/CLOUD_SETUP.md` for configuration, verification, and remaining limitations. No production hosting has been provisioned. Live Clerk credentials must be supplied by the user before `npm run test:clerk` or real sign-in can run.

## Read first

1. [Current handoff](docs/HANDOFF.md): implemented state, open questions, and next steps.
2. [Cloud setup](docs/CLOUD_SETUP.md): environment, migrations, deletion flow, verification.
3. [Challenge requirements](docs/CHALLENGE_REQUIREMENTS.md): user-supplied judging and technology rules.
4. [Clerk proposal](docs/CLERK_AUTH_PLAN.md): design reference; consult cloud setup for actual status.
5. [README](README.md), [implementation notes](docs/IMPLEMENTATION.md), and [verification](docs/VERIFICATION.md).

## Scope and authority

- The user authorized finishing the Clerk/library integration, fixing defects, and updating documentation.
- Do not merge PRs, provision paid services, or deploy publicly without explicit instruction.
- Node/Express and PostgreSQL are the implemented backend. Hosting provider and production domain remain user decisions.
- Keep original `humline-build-context/` files intact (integrity manifest). Applicable audio and verification constraints remain useful.

## Implementation invariants

- Preserve real audio → detected notes → edits → instrument playback → MIDI. No canned note list may substitute for transcription.
- Keep canonical note timing in quarter-note beats across editing, playback, saved projects, and MIDI.
- Keep detection and segmentation separate. Label synthetic examples accurately; do not present synthetic-test success as human-hum accuracy.
- Original audio is session-only. Cloud library syncs edited notes/settings, not recordings or source filenames.
- Private data requires server-side Clerk session verification and owner checks. Client UI guards and localStorage namespaces are not authorization boundaries.
- Draft recovery is partitioned by Clerk user ID and project ID. Legacy `humline.project.v1` imports only after an explicit user choice.
- Account deletion must block writes immediately, remove owned melodies, and remove the Clerk identity (app-owned `DELETE /api/account` with reverification). Keep signed `user.deleted` webhook cleanup idempotent.
- Release media tracks, playback, workers, and stale asynchronous operations when their studio/session ends.
- Keep credentials, database URLs, auth-state files, and private user data out of Git, browser bundles, logs, and release archives. Only Clerk's publishable key belongs in the frontend configuration.

## Verification and maintenance

Run relevant checks for code changes from `app/`: `npm test`, `npm run build`, `npm run test:browser`, `npm run test:https`, and `npm run format:check`. Browser checks require Chromium and a built app; HTTPS checks require OpenSSL (or Git for Windows OpenSSL). Full startup details are in README and CLOUD_SETUP.

Update `docs/HANDOFF.md` and `docs/CLOUD_SETUP.md` when scope, implementation, verification, or blockers change. Keep implemented facts separate from proposals. Do not store credentials in handoff files.
