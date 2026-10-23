# Build plan

Deadline target: Sunday October 25, 2026 (America/Toronto); exact hour not supplied. Plan for one builder with approximately 18–24 focused hours, including buffer. Estimates are not guarantees. Use elapsed milestones if starting later.

## Milestone 0 — setup and audio feasibility (1–2 h)

Inspect the current repo, establish a clean working branch, scaffold React/TypeScript/Vite, and lock dependencies. Run a small detector experiment on the packaged melody plus an actual short human hum if available. Confirm that instrument playback starts from a user gesture and MIDI can be parsed after export.

Exit: actual audio becomes plausible notes. If detection fails here, investigate sample rate, energy gating, and segmentation before building a polished editor. Evaluate a second detector only with evidence, and timebox the experiment.

## Milestone 1 — complete thin slice (3–4 h)

Import WAV -> PCM -> worker -> segmented notes -> simple piano roll -> Keys playback -> MIDI download. Use the same canonical model throughout. Add original playback and silence handling. Pass the basic fixture and MIDI round-trip checks.

Exit: a complete data path without recording or elaborate visuals. This is the dependency for subsequent work.

## Milestone 2 — capture and editing (4–5 h)

Connect microphone capture and 20-second auto-stop. Implement drag, resize, add, delete, note inspector, undo/redo, and optional snap. Add recording/error states. Guard cancellation and stale worker results.

Exit: record an actual melody, correct a note, and export the corrected result.

## Milestone 3 — instrument experience and polish (3–4 h)

Implement three presets, audio-clock playhead, tempo, volume, pause/stop, and A/B original playback. Apply design tokens, layout, empty states, responsive behaviour, keyboard focus, and subtle motion. Add project JSON save/import and local note persistence.

Exit: the core demo feels cohesive; every visible control works.

## Milestone 4 — release checks and rehearsal (3–4 h)

Run the acceptance matrix, validate recording on the actual demo machine, test real humming separately, inspect exported MIDI in an independent viewer/player if available, and verify production build and static hosting requirements. Prepare screenshots, known limitations, a source ZIP, and a 90-second walkthrough.

Exit: a clean checkout can install from the lockfile, run, build, and reproduce the demonstrated workflow.

## Buffer (3–5 h)

Reserve for microphone/browser issues, detector tuning, audio playback differences, and export bugs. Avoid consuming it on extra features.

## Cut order if time is short

Cut accompaniment, key detection, custom fonts, sample-based timbres, advanced zoom, multi-select, fancy transitions, and automatic BPM first. None is necessary for the requested MVP. Preserve all five requested features, usable errors, and the real data path. A mouse editor plus numeric inspector is acceptable; a non-editable piano-roll picture is not.

## Proposed implementation tasks

- H01: scaffold and canonical types
- H02: fixture-driven detector and segmentation
- H03: MIDI encode/decode round trip
- H04: audio import and capture lifecycle
- H05: editor operations and history
- H06: synthesis, transport, and playhead
- H07: local persistence and import validation
- H08: visual styling, mobile layout, accessibility
- H09: browser QA, human-hum evaluation, production build
- H10: demo rehearsal and final source archive

Do not publish these as GitHub issues automatically; this is the implementation backlog inside the handoff.
