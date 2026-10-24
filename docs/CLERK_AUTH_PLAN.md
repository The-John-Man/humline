# Humline accounts and private melody library — proposal

Status: draft for review, October 24, 2026. No authentication code, dependencies, Clerk resources, or cloud infrastructure have been changed. The user selected accounts with a private cloud melody library. This document describes the proposed implementation, not completed behavior.

Implementation update: the user subsequently authorized work. Integration code and local tests now exist; consult [CLOUD_SETUP.md](CLOUD_SETUP.md) for actual status and deviations. The draft below remains the design reference.

## Product goal

A songwriter can sign in, save an edited melody, and reopen it on another device. Clerk supplies identity and session management; Humline enforces ownership of each melody. This gives accounts a useful role in the workflow and concrete evidence for the Clerk prize submission, without promising a judging outcome.

Keep React, TypeScript, Vite, the transcription worker, piano roll, synthesizers, and MIDI export. Add Clerk, client routing, a small TypeScript API, and PostgreSQL. No framework migration is needed.

## Draft experience

Flow: Welcome → Sign in / Create account → My melodies → Studio → Save → Reopen from another device.

| Screen | Proposed content and behavior |
|---|---|
| Welcome `/` | Existing Humline identity, “Hum a melody. Make it yours.”, explanation of recording/editing/export, “Create account” and “Sign in”. A labelled synthetic-demo route remains public. |
| Sign in `/sign-in/*` | Humline-branded shell containing Clerk's SignIn component. Email/password and Google; recovery handled by Clerk. Successful login returns to a valid internal destination or My melodies. |
| Create account `/sign-up/*` | Clerk SignUp with email verification and Google. No custom password collection or storage. |
| My melodies `/melodies` | Signed-in library with New melody, Import project JSON, titles, modified dates, tempo and instrument, Open, Rename, Duplicate, and confirmed Delete. Empty, loading, offline, error, and retry states. |
| Studio `/studio/new`, `/studio/:id` | Existing music workflow plus My melodies navigation, Save, account avatar, and explicit save status. Opening a saved project restores notes/settings; original recording is unavailable on another device. |
| Account `/account/*` | Clerk UserProfile for profile, email, connected accounts, and enabled security/session settings. App-owned delete-account flow explains what happens to saved melodies. |
| Public demo `/demo` | Synthetic example and local editing/export; no access to account libraries. Prompt to sign in when saving to the library. Clearly labelled as a demo. |

### Login wireframe

```text
HUMLINE                                        Back to home

Hum a melody.                    Welcome back
Make it yours.                   Sign in to your melody library.

Record → Edit → Export           [ Continue with Google ]
                                 ─────── or ───────
Your melodies, ready              Email address
when inspiration returns.        [                         ]
                                 [ Continue                ]
                                 Clerk handles password,
                                 verification and recovery steps.
                                 New here? Create account

                                 Try the synthetic demo
```

Use the existing navy background, mint primary action, lavender musical illustration, and visible focus styles. Desktop uses two columns; mobile shows the form first. The wireframe is conceptual: exact fields and step order come from Clerk's configured component, not a hand-built imitation.

### Library wireframe

```text
HUMLINE                 My melodies                [Avatar]

Your melodies                         [Import] [+ New melody]
Pick up where you left off.

Evening idea       Keys     100 BPM     Updated today   [Open] [⋯]
Chorus sketch      Pad      120 BPM     Updated yesterday     [⋯]

Empty: “Your first melody starts with a hum.” [New melody]
Studio save states: Unsaved changes → Saving… → Saved
Failure: “Couldn't save. Your edits are still here.” [Retry] [Download JSON]
```

Only show “Saved” after the API confirms persistence. First save names and creates the melody; subsequent changes use debounced autosave plus an explicit Save action. Navigation with unsaved work offers Save, Download JSON, Discard, or Cancel. Manual sign-out uses the same protection.

## Clerk integration research

The current [React quickstart](https://clerk.com/docs/react/getting-started/quickstart) uses `@clerk/react` and ClerkProvider. This fits Humline's existing Vite entry point. Before implementation, verify package peer dependencies against React 19 and pin compatible versions in the lockfile; older tutorials use different package/API names.

Use Clerk's prebuilt SignIn, SignUp, UserButton, and UserProfile components. Their supported flows reduce the custom authentication code we must maintain. Start with email/password plus verified email and Google; expose optional authenticator MFA when enabled and available in the selected Clerk configuration. Profile/security controls follow that configuration. Sources: [sign-in page](https://clerk.com/docs/react/guides/development/custom-sign-in-or-up-page), [UserProfile](https://clerk.com/docs/react/reference/components/user/user-profile), [authentication options](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options).

Use React Router in declarative SPA mode with `@clerk/react`, explicit path routing for Clerk components, and catch-all authentication/account routes. Configure router callbacks and safe internal return destinations. The static host must send non-asset frontend routes to index.html, while API requests retain real API responses. Clerk documents both [path and hash routing](https://clerk.com/docs/guides/how-clerk-works/routing).

Clerk's [Show component](https://clerk.com/docs/react/reference/components/control/show) controls presentation; it is not a security boundary for cloud data. Every library request needs backend session verification and an ownership check. The backend SDK's [authenticateRequest](https://clerk.com/docs/reference/backend/authenticate-request) supports request verification; configure accepted session tokens and trusted frontend origins.

Store melody data in PostgreSQL, not Clerk user metadata. Clerk's [metadata documentation](https://clerk.com/docs/guides/users/extending) describes size limits; music projects belong in the application database.

## Proposed architecture and data boundary

```text
Browser React/Vite ───── authentication ───── Clerk
   │
   ├── microphone → local audio worker → editor → local playback/MIDI
   │
   └── session-authenticated /api requests → Node/Express API → PostgreSQL
                                               │
                                               └── Clerk verification / account lifecycle
```

Proposed deployment: one Node service serves `/api` and the built frontend, plus managed PostgreSQL. This simplifies same-origin requests and deep-link handling. Hosting vendor and database provider remain to be selected; no paid resource is authorized by this draft.

Cloud saves contain notes, title, BPM, transcription BPM, instrument, and schema version. Do not upload original audio, waveform buffers, or source filenames in this release. Explain in the studio: “Notes and settings sync. Your original recording stays on this device.” Clerk receives account/authentication data; the app backend receives saved melody data. Update the existing all-local documentation accordingly.

Proposed `melodies` table:

| Field | Purpose |
|---|---|
| `id` UUID | Server-generated project identifier |
| `owner_clerk_user_id` text | Owner derived only from the verified session |
| `project` JSONB | Validated canonical project content; owner is outside client JSON |
| `revision` integer | Optimistic concurrency version |
| `created_at`, `updated_at` | Server timestamps |

Index owner and modification time for paginated listing. Enforce the existing title/note/timing limits on the server, cap request sizes, and add per-user request/storage limits. Never accept a client-provided owner. Imported JSON creates a new server identity; its embedded ID cannot overwrite an existing remote melody.

| API | Behavior |
|---|---|
| `GET /api/melodies` | Paginated metadata for the authenticated owner |
| `POST /api/melodies` | Validate and create a melody for that owner |
| `GET /api/melodies/:id` | Return only an owned project |
| `PATCH /api/melodies/:id` | Update owned project only if submitted revision matches |
| `DELETE /api/melodies/:id` | Delete owned project after UI confirmation |

Return 401 for invalid/missing sessions, 404 for missing or non-owned records, and 409 for revision conflicts. Scope every select/update/delete to both project ID and owner ID. A conflict offers Reload or Save a copy; it must not silently overwrite another device's edits. Duplicate creates a new owned project through POST.

## Existing data, sessions, and deletion

The current app restores one shared localStorage key, `humline.project.v1`, before any authentication. That must change before accounts ship.

- Offer explicit import of the old local melody after sign-in; keep its backup until cloud save succeeds. Never silently assign legacy work to the first person who signs in.
- Partition local draft recovery by Clerk user ID and project ID. Local browser storage is a recovery aid, not encrypted account storage or authorization.
- Wait for identity to resolve before restoring private drafts or requesting projects. On account change, invalidate requests and unmount the previous studio/library; reject stale results using a session generation marker.
- Sign-out or session loss stops recording/playback, terminates conversion, clears private UI and query caches, and prevents further saves under the old identity. Explicit sign-out clears that account's browser draft cache after resolving unsaved work.
- On unexpected expiry, preserve a scoped recovery draft, hide private content, and ask the same account to sign in again. Avoid automatic navigation that loses edits. Explain shared-browser recovery behavior.
- Account deletion requires reauthentication, confirmation, immediate access blocking, and retryable cleanup of cloud melodies and the Clerk identity. Use a deletion state to prevent writes during cleanup. Verify signed `user.deleted` webhooks for deletion originating in Clerk; make handlers idempotent and handle duplicate/out-of-order events. Clerk documents [webhook consistency and retries](https://clerk.com/docs/guides/development/webhooks/syncing).
- Clear caches in active tabs on session changes. Deleting an account cannot remotely erase downloaded MIDI/JSON or browser copies on disconnected devices; state this accurately.

## Implementation sequence

1. **Configuration and foundation:** select the user's Clerk application/development instance, check package compatibility, choose the deployment target, add environment examples and ignore rules, and define API/database migrations. Keep actual keys out of Git and release artifacts.
2. **Authentication shell:** add routes, branded login/sign-up screens, provider, loading/error handling, account controls, and safe redirects. Keep the synthetic demo public. Avoid mounting the audio studio until its intended identity/context is ready.
3. **Private library:** implement session verification, database repository, owner-scoped endpoints, validation, revisions, pagination, deletion lifecycle, and API authorization tests.
4. **Studio integration:** add library navigation and save states, explicit legacy-project import, local draft recovery, conflict handling, and audio cleanup on auth transitions. Preserve note editing and MIDI semantics.
5. **Verification:** test real Clerk development flows and cross-user isolation, then rerun music/browser/build checks. Test deployed deep links and a second-device save/reopen flow.
6. **Release and review:** document setup, data handling, deployment configuration and known limitations; refresh screenshots/artifacts and open a follow-up PR based on the implementation branch or merged main, whichever is current then. Do not change or merge PR #1 during planning.

## Configuration required during implementation

- Clerk application ownership and development publishable key (`VITE_CLERK_PUBLISHABLE_KEY`). Browser-exposed publishable keys are expected; secret keys are not.
- Backend-only Clerk credentials, PostgreSQL connection string, and webhook signing secret through environment/secret configuration. Never put these under a `VITE_` name or ask the user to paste secrets into this document.
- Desired Google sign-in setup, enabled email/password verification flow, optional MFA, and the actual deployment origin/domain.
- Separate production instance/keys, domain/DNS setup, and production OAuth credentials before production launch, following [Clerk's deployment guide](https://clerk.com/docs/guides/development/deployment/production). Check current plan limits and hosting costs before provisioning.

The old downloadable static ZIP cannot deliver the cloud library on its own. Update startup instructions to run the frontend/API and connect to PostgreSQL and Clerk. Provide an explicitly labelled local demo build if a standalone ZIP is still useful; never silently bypass authentication in an account-enabled build when keys are missing.

## Acceptance criteria

- Sign-up verifies email; sign-in, recovery, Google sign-in, sign-out, and enabled account settings work against a real Clerk development instance. Missing configuration or provider outages produce a useful error rather than a blank page or auth bypass.
- Signed-out deep links return to sign-in without showing a prior user's data. Refresh and auth callback URLs work on the selected host. Return URLs cannot redirect to arbitrary external origins.
- User A saves and reopens a melody on another device. User B cannot list/read/change/delete A's melody, including by directly calling the API with A's project ID.
- Saved edits, velocity, timing, tempo, and instrument round-trip without changes. Original audio is visibly session-only. Failed saves preserve edits and offer JSON backup.
- Switching accounts, sign-out in another tab, and expired sessions cannot mix projects or let stale async results appear. The microphone indicator and playback stop on leaving an active studio session.
- Concurrent changes produce a conflict; deletion and webhook retries do not recreate deleted data. Legacy local projects migrate only after an explicit choice.
- Keyboard/mobile flows and accessibility checks pass. Existing 20 logic tests, 11 browser tests (adapted for auth/demo routes), build, formatting, and HTTPS checks remain passing.
- Use [Clerk's Playwright helpers](https://clerk.com/docs/guides/development/testing/playwright/overview) for development-instance authentication tests. Keep test secrets and stored browser session state out of Git/artifacts. Simulated auth can support isolated component tests but cannot establish that Clerk integration works.

## Suggested judge demo

Create an account → record and convert → correct notes → save a named melody → sign out → sign in on a second device → reopen and export MIDI. Briefly show account management and the isolation test evidence. This demonstrates Clerk's role in a useful personal library. Human-hum accuracy and physical audio testing remain separate validation requirements from authentication.
