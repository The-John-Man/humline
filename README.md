# Humline

**Hum a melody. Make it yours.** A local, browser-based music studio built with React, TypeScript, Vite, Web Audio, Pitchy, and @tonejs/midi.

The implemented loop is **Record / import → Convert → Edit → Play → Export MIDI**. The synthetic example is analysed from its WAV file using the same worker as user audio. No prerecorded note list substitutes for transcription.

## Accounts and cloud library integration

This branch includes Clerk authentication pages and a PostgreSQL-backed private melody library. **Live accounts require configuration and have not yet been verified against a real Clerk instance.** Follow [cloud setup and current verification](docs/CLOUD_SETUP.md). The public local studio is now at `/demo`; the root page is the welcome screen. Older static ZIPs in `review/` contain the original MVP, not this integration. Historical local-only instructions below apply to that MVP or the current public demo.

## Contributor and AI context

Start with [AGENTS.md](AGENTS.md) and the [current handoff](docs/HANDOFF.md). The [challenge requirements](docs/CHALLENGE_REQUIREMENTS.md) capture the user-supplied brief. The [Clerk accounts and private library plan](docs/CLERK_AUTH_PLAN.md) is a researched proposal with screen drafts; the proposal is now being implemented; see the cloud setup document for current status. The instructions below describe the working local music MVP.

## Run

Use Node **22.12+** (Node 24 recommended) and npm. From the repository root:

```sh
cd app
npm ci
npm run dev
```

Open the printed localhost URL, normally `http://localhost:5173`. Recording requires localhost or HTTPS; opening `index.html` with `file://` does not work. The Vite development server binds to `0.0.0.0` for cloud-workspace preview support. A plain HTTP LAN address is not a secure microphone origin.

In a managed workspace with an unwritable home-directory npm cache, use `npm ci --cache /tmp/humline-npm-cache` instead. No secrets, accounts, API keys, database, or backend are required.

## Use the studio

1. Click **Record a melody**, allow microphone access, and hum one steady voice with short gaps. Stop when finished; recording automatically stops at 20 seconds. **Cancel** preserves existing notes. WAV and other browser-decodable audio can also be imported (20 MB and 20 seconds maximum).
2. **Listen to original**, then **Convert to notes**. Replacing an existing melody requires an explicit in-app action and is undoable. Conversion runs in a cancellable worker. Silence and unpitched input produce a useful message, not invented notes.
3. Click a note to audition and select it. Drag horizontally/vertically to move it; drag its right edge to resize. Click empty grid space to add; use the inspector to change pitch, start, length, or velocity. The optional ⅛-note snap applies to direct grid edits; transcription retains its original timing. Starts and lengths are measured in quarter-note beats.
4. Choose **Keys**, **Pluck**, or **Pad**. Play, pause/resume, stop, adjust volume or tempo, or click the ruler to choose a playhead position. These are synthesised presets, not sampled acoustic instruments. Original audio always plays at recorded speed.
5. **Export MIDI** downloads the current edited notes, velocities, tempo, and standard instrument program. MIDI stores musical events, not the original voice or Humline's exact synth sound.

The top-bar folder opens a validated project JSON; the disk downloads a backup. Notes, tempo, title, and instrument save automatically in localStorage. **Original audio is kept only in memory for the current session and is lost on refresh.** Project JSON does not include audio. Undo/redo retains the association with original audio while that session history exists.

Keyboard: Tab into the piano roll and press Enter to add C4 at the playhead. Focus a note and use arrow keys to move it, Shift + left/right to resize, Shift + up/down for octave changes, Enter/Space to audition, and Delete/Backspace to remove it. Ctrl/⌘ Z and Ctrl/⌘ Shift Z undo/redo outside text/number fields. Numeric inspectors also work on narrow screens.

## Build and verify

From `app/`:

```sh
npm test                 # Fixture DSP, editor/MIDI, validation and lifecycle tests
npm run build           # Strict TypeScript check + production output in dist/
npm run test:browser     # Production browser flow, downloads, capture and accessibility
npm run test:https       # Local HTTPS smoke test; requires openssl
npm run format:check
npm run preview         # Serve the production build on localhost:4173
```

Browser tests use system `/usr/bin/chromium` when present. Otherwise install Playwright's browser with `npx playwright install chromium`, or set `CHROMIUM_PATH` to an existing Chromium executable. On Linux, Playwright may need browser system dependencies (`npx playwright install --with-deps chromium`, with OS installation permissions). Tests grant or deny permissions explicitly and use a **synthetic microphone device**, not a person's voice. HTTPS verification generates and removes a temporary self-signed certificate; it ignores trust errors only in that local test.

Verified environment: Node 24.19.0, npm 11.9.0, Chromium 154.0.8037.57, Debian GNU/Linux 13. See [verification results](docs/VERIFICATION.md), [fixture measurements](docs/fixture-results.json), and [architecture and limitations](docs/IMPLEMENTATION.md).

**Your participation is still needed:** record and listen on your actual microphone/output device, and evaluate at least five short human-hummed phrases. Automated synthetic results do not establish human-hum accuracy. A concrete rehearsal checklist and results template are in the verification report.

## Deploy

`app/dist/` is a static site, ready for any HTTPS static host. Build with `npm ci && npm run build` in `app/`, then publish `app/dist/` with its `assets/` and `examples/` folders intact. Assets use relative paths, so subdirectory hosting is supported. No runtime environment variables are required. Serve `.js` as JavaScript and `.wav` as audio. A normal top-level HTTPS page is simplest; an embedded preview also needs microphone permissions from its parent.

No external deployment or hosting account was configured. Local HTTPS was exercised with a test certificate. This app does not include an offline service worker; “local processing” does not promise it can load without a network connection.

## Source and handoff

- `app/src/audio/`: capture, decoding, deterministic analysis resampling, pitch detection, segmentation, synthesis, and worker lifecycle.
- `app/src/components/`: piano roll, note inspector, numeric draft fields, waveform.
- `app/src/state/`, `music/`, `types/`: canonical beat model, history, validation/persistence, MIDI, pitch/timing helpers.
- `app/tests/`: deterministic fixture tests and production Playwright tests.
- `humline-build-context/`: preserved, extracted specifications and original synthetic fixtures.
- `docs/`: implementation decisions, results, and human evaluation checklist.
- `release/`: generated source ZIP, static-site ZIP, screenshots, and fixture measurements (ignored by Git).

The context ZIP was retrieved from `origin/main` commit `17c3188ada809c6541a331c311b5d9b5295d5bda` without replacing the existing checkout. Its 26-file manifest and six WAV fixtures passed the supplied integrity checker. [Third-party notices](docs/THIRD_PARTY.md) identify runtime dependencies and asset provenance.
