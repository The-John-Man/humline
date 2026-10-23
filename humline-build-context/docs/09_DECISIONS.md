# Decisions and risks

## Recommended decisions

| Decision | Reason | Revisit when |
|---|---|---|
| Browser-first | Shortest path to recording, visual editing, playback and download in one place | User explicitly wants native mobile |
| Local single-voice pitch detection | Keeps the first data path small and removes server/model setup | Human-hum tests show unacceptable correction effort |
| Pitchy plus separate segmentation | Clear frame-level API and testable note-boundary logic | A tested alternative improves the supported input |
| Beat-based project data | Editor, tempo changes and MIDI share one timing model | Multi-tempo projects become a real need |
| Native synthesis presets | Avoids sample downloads and asset licensing work | Time remains after all release gates pass |
| No account or backend | Core workflow works without either | Cloud sync or collaboration is requested |

Pitchy is classical signal processing, not an AI model. Do not market an implementation using only that detector as generative AI. Basic Pitch was suggested during ideation and remains a possible replacement behind the detector adapter. Its official project supports audio-to-note transcription and links to a JavaScript implementation [S2]. It adds model/runtime integration work, so evaluate it early only if needed; do not quietly switch to a remote paid service. The choice is a recommendation, not an already measured comparison.

## Risk register

Highest: real humming quality. Mitigation: validate the audio pipeline first, retain original playback, expose edits, and document limits.

High: note timing/unit mismatch. Mitigation: one canonical beat model and MIDI parse-back checks.

High: permissions, encoding, or audio-context suspension. Mitigation: runtime capability checks, user-gesture playback, WAV import, and target-machine rehearsal.

Medium: editing feels awkward. Mitigation: sufficiently large notes, pointer capture, sticky keyboard, numeric inspector, and undo.

Medium: poor or inconsistent instrument sound. Mitigation: simple intentional presets with envelopes and bounded volume; avoid pretending they are acoustic recordings.

Medium: uncertain GitHub access. Mitigation: local development can proceed; resolve repository access using normal sign-in before pushing. No embedded tokens.

## Sponsors

The challenge names Expo, Clerk, Era by Eon, and SurrealDB Agent Memory, but says these are optional for Best Overall. A browser-only local audio tool does not need all four. Expo is appropriate for a later native mobile implementation; Clerk if accounts become necessary; Era if an actual agent is built and benchmarked; SurrealDB Agent Memory if that agent needs memory. A pitch detector is not an autonomous agent. Do not add artificial dependencies just to display logos. Verify category rules at submission time.

## Deployment and privacy

Serve via HTTPS. Audio remains in the browser under this design. Keep raw recordings out of telemetry and error logs. Do not claim complete offline operation without a tested caching strategy. Static hosting is sufficient. Dependency installation requires normal registry access, but the app's core runtime should not require an API key. No hosting account, domain, paid plan, or public repository conversion has been authorised by this context package.
