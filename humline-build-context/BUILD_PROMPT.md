# Build Humline

Implement the Humline MVP described in this package. Read AGENTS.md and docs/01_CONTEXT.md through docs/07_ACCEPTANCE.md first. Respect any additional repository and environment instructions.

The user chose Humline and requested:
1. Microphone recording.
2. Actual conversion of a hummed melody to notes.
3. An editable piano roll.
4. Instrument playback.
5. MIDI export.
6. A polished interface suitable for a Sunday hackathon demo.

Deliver a working product, not a mockup. The primary loop is Record -> Convert -> Edit -> Play -> Export. Prioritise a short, clean, single-voice melody. Work from the proposed browser-first architecture unless a concrete test exposes a blocker. Stack choices are recommendations, not additional user requirements.

## Execution

Inspect the checkout before editing. The intended remote is https://github.com/The-John-Man/humline. Do not overwrite existing work or manufacture a second disconnected history. If starting from this package alone, initialise the application in an app/ directory and retain these documents. If an existing application has since appeared, adapt to its structure.

First deliver a thin functional slice: load a WAV, detect notes, draw them, play them, and download MIDI. Then connect live recording, editing, persistence, and the visual design. Keep original audio available for comparison.

Implement real state transitions and meaningful error handling. Never return a prewritten melody as if it came from a recording. An explicitly labelled example recording must pass through the same audio pipeline as user audio. Synthetic fixtures demonstrate mechanics, not human transcription accuracy.

Resolve normal implementation details autonomously. Record important departures from this plan. Do not delay development for user interviews, account creation, or optional integrations. Do not add authentication or a server unless the scope changes to require them.

Finish with a production build, the acceptance checks, honest manual-test results, and a fresh distributable ZIP containing source, a lockfile, and run instructions. Exclude secrets, node_modules, and .git. Prepare an HTTPS deployment if supported by the environment, but do not assume a paid service or silently change repository visibility.

Report what works, what was actually tested, and any remaining limitations. Never describe a synthetic-only evaluation as verified real humming accuracy.
