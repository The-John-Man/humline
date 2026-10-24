# Humline handoff

Last updated: October 24, 2026. This is a historical snapshot for a new contributor or AI session; inspect Git, the current conversation, and live PR state before acting.

## Current continuation update

The user authorized starting and finishing integration work. Branch `codex/clerk-library` now contains Clerk pages, private-library API/PostgreSQL storage, account-scoped recovery, conflict handling, and tests. See [cloud setup](CLOUD_SETUP.md). Real Clerk flows and production deployment remain unverified pending configuration. The earlier snapshot below describes the original MVP and planning history, not the current code state.

## What exists

Humline is a working React/TypeScript/Vite browser music studio: Record/import → Convert → Piano-roll edit → Instrument playback → MIDI export. Audio analysis runs locally in a worker with Pitchy. Web Audio provides Keys, Pluck, and Pad. The edited note model drives MIDI export through @tonejs/midi.

There is no implemented Clerk authentication, account system, backend, or cloud database. Project notes/settings persist under a single localStorage key and can be backed up as JSON. Original audio is memory-only and disappears on refresh.

Implementation commit: `bccd1cf737d9575a78c59e47346e00dce839f5b9`, branch `codex/humline-mvp`. [PR #1](https://github.com/The-John-Man/humline/pull/1) was opened against `The-John-Man/humline` `main`. Its state may change; do not assume it is still open or unmerged.

The environment offered no accessible browser-preview/port-forwarding capability during the previous access task. The fallback is the committed prebuilt ZIP, screenshots, checksums, and instructions in [review](../review/README.md). Localhost links only work on the machine running the server. Recheck current capabilities if preview access is requested again.

## Latest user decisions and scope

1. User provided the challenge rules; [requirements](CHALLENGE_REQUIREMENTS.md) preserves their meaning and source.
2. User asked to add Clerk accounts/authentication with a login page and necessary features, but explicitly requested research, a plan, and a draft **before making it**.
3. Asked whether accounts should sync melodies, user chose: **“Include a private cloud melody library (recommended)”**.
4. [CLERK_AUTH_PLAN.md](CLERK_AUTH_PLAN.md) contains official-documentation research, login/library wireframes, routes, ownership model, API proposal, migration, session/deletion behavior, implementation phases, and tests.
5. Latest request: save the plan and necessary context files so another AI has context. That is the purpose of this handoff and the root [AGENTS.md](../AGENTS.md).

The planning/context files are saved in the workspace. They have not been committed or pushed as part of these planning turns; they are not included in the previously built release ZIPs. A new clone or another environment will need these files transferred or committed before it can see them. Check `git status` for the current state.

## Recommendations awaiting implementation review

- Keep React/Vite and use current `@clerk/react` with prebuilt auth/account components and React Router. Verify versions and official APIs at implementation time.
- Email/password with email verification, Google sign-in, recovery, profile management, sign-out, and optional configured MFA.
- Private My melodies library; cloud save/reopen, rename, duplicate, delete, revision conflicts, and explicit save-status feedback.
- Small TypeScript Node/Express API plus PostgreSQL; same-origin frontend/API deployment recommended. Providers and resources are not selected or provisioned.
- Cloud saves contain notes and settings. Original voice recordings and source filenames stay on-device.
- Public synthetic demo; account-protected cloud library. Audio processing continues locally.

These are draft choices, except the user's explicit selection of Clerk and the private cloud melody library. Do not describe the proposed features as working.

## Next steps

For a planning continuation, review or revise the Clerk proposal. Do not begin application changes until the user asks to proceed; this follows their explicit plan-first instruction.

Once implementation is requested:

1. Inspect current branch/PR state and choose the appropriate branch base.
2. Select the user's Clerk app/development instance and hosting/database configuration. Use safe environment configuration for secrets; never request secrets in committed documents.
3. Follow the six phases and acceptance criteria in the Clerk plan. Establish backend ownership checks and account-separated recovery before exposing a private library.
4. Verify real Clerk development flows and cross-user API isolation, rerun the music regression suite, then update documentation/artifacts and prepare a reviewable follow-up PR.

## Verification evidence

At the October 24 access/review rerun, the unchanged implementation passed:

- 20 logic tests across three files; all six supplied WAV fixtures.
- TypeScript/Vite production build and formatting.
- 11 production Chromium browser tests in 49.4 seconds.
- Local HTTPS smoke test with a temporary self-signed certificate and synthetic microphone input.
- Original context integrity: 26 files and six fixtures.
- Committed static ZIP checksum and byte-for-byte comparison of all six files against the fresh production build.

Environment: Node 24.19.0, npm 11.9.0, Chromium 154.0.8037.57, Debian 13. The browser server initially hit `listen EPERM` under the then-active sandbox; the successful run used approved execution outside it. Current permissions may differ. These are historical results, not tests of the Clerk proposal.

Still unverified: physical microphone/output hardware, realistic human-hum accuracy, subjective instrument quality, independent DAW playback, Safari/Firefox, and physical mobile devices. See [verification details](VERIFICATION.md) and [limitations](IMPLEMENTATION.md).

## File map

| Location | Context |
|---|---|
| `app/src/main.tsx` | Current minimal React mount; future Clerk provider/router entry |
| `app/src/App.tsx` | Studio state, recording/conversion/playback, persistence and UI |
| `app/src/state/project.ts` | Validation, undo/redo, canonical project persistence, shared localStorage key |
| `app/src/types/project.ts` | Project/note schema |
| `app/src/audio/`, `app/src/workers/` | Capture, decode, detection/segmentation, synthesis, transcription lifecycle |
| `app/src/components/` | Piano roll, inspector, waveform, numeric input |
| `app/src/music/midi.ts` | MIDI serialization and download |
| `app/tests/` | Logic tests and production Playwright tests |
| `docs/CLERK_AUTH_PLAN.md` | Current extension proposal and official research sources |
| `humline-build-context/` | Immutable original specification and synthetic fixtures |
| `review/` | Committed downloadable static app, checksums, screenshots, review instructions |
| `scripts/package-release.py` | Generates source/static ZIPs; inspect exclusions when backend/auth files are introduced |
| `release/` | Ignored generated artifacts; old archives do not automatically acquire new documentation |
