# Humline: guidance for coding agents

## Current implementation update

The user has now authorized continuing implementation. Clerk and library integration code is on `codex/clerk-library`. Read `docs/CLOUD_SETUP.md` for current configuration, verification and remaining limitations; historical planning-only statements below describe the earlier stage. No real Clerk credentials or production hosting have been configured.

## Read first

1. [Current handoff](docs/HANDOFF.md): implemented state, user decisions, open questions, and next steps.
2. [Challenge requirements](docs/CHALLENGE_REQUIREMENTS.md): user-supplied judging and technology rules.
3. [Clerk proposal](docs/CLERK_AUTH_PLAN.md): researched plan, screen drafts, architecture, and acceptance criteria.
4. [README](README.md), [implementation notes](docs/IMPLEMENTATION.md), and [verification](docs/VERIFICATION.md): the working music MVP.

## Scope and authority

- The latest user request is to persist context for other AI agents. The preceding request was to plan and draft Clerk authentication **before implementing it**.
- The user selected a **private cloud melody library** so signed-in users can reopen melodies on another device. This is an agreed product direction, not an instruction to begin implementation immediately.
- Clerk authentication, login/account pages, and cloud persistence are proposed; none is implemented yet. Read the current conversation for any later authorization before acting on this historical snapshot.
- The original `humline-build-context/` package describes the earlier local-only MVP. Its prohibition on accounts/backend is superseded for the requested Clerk extension by the user's later direction. Keep those original files intact: they are covered by an integrity manifest. Other applicable audio and verification constraints remain useful.
- Node/Express and PostgreSQL are recommendations in the draft, not user-selected services. Clerk application, deployment provider, database provider, and production domain are unresolved.
- Do not infer permission to merge PRs, provision paid services, or publish from a planning document. Follow the user's actual instructions and current tool permissions.

## Implementation invariants

- Preserve real audio → detected notes → edits → instrument playback → MIDI. No canned note list may substitute for transcription.
- Keep canonical note timing in quarter-note beats across editing, playback, saved projects, and MIDI.
- Keep detection and segmentation separate. Label synthetic examples accurately; do not present synthetic-test success as human-hum accuracy.
- Original audio is currently session-only. The proposed cloud library syncs edited notes/settings, not recordings or source filenames.
- Future private data requires server-side Clerk session verification and owner checks. Client UI guards and localStorage namespaces are not authorization boundaries.
- The existing shared `humline.project.v1` localStorage key needs explicit migration and account separation before authentication ships.
- Release media tracks, playback, workers, and stale asynchronous operations when their studio/session ends.
- Keep credentials, database URLs, auth-state files, and private user data out of Git, browser bundles, logs, and release archives. Only Clerk's publishable key belongs in the frontend configuration.

## Verification and maintenance

Run relevant checks for code changes from `app/`: `npm test`, `npm run build`, `npm run test:browser`, `npm run test:https`, and `npm run format:check`. Browser checks require Chromium and a built app; HTTPS checks require OpenSSL. Full startup details are in README.

For documentation-only changes, check links and the diff; do not describe historical test runs as fresh runs. Update `docs/HANDOFF.md` when scope, implementation, verification, or blockers change. Keep implemented facts separate from proposals. Do not store credentials in handoff files.
