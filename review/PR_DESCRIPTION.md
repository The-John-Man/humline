Humline now turns a short recording into editable music through a complete local Record → Convert → Edit → Play → Export workflow. The React/TypeScript/Vite studio analyses actual microphone or imported audio in a worker, lets users correct notes in a piano roll, plays three synthesised instruments, and exports the current edited notes as MIDI.

Includes microphone lifecycle/error handling, a 20-second recording limit, cancellable conversion, raw timing preservation, drag/resize and numeric editing, undo/redo, tempo/volume and original-audio comparison, validated project JSON, local note persistence, and responsive dark studio styling. The labelled synthetic example goes through the same audio pipeline as user audio.

## Review access

- [Downloadable static app and exact startup instructions](https://github.com/The-John-Man/humline/tree/codex/humline-mvp/review)
- [Desktop screenshot](https://github.com/The-John-Man/humline/blob/codex/humline-mvp/review/studio-desktop.png)
- [Mobile screenshot](https://github.com/The-John-Man/humline/blob/codex/humline-mvp/review/studio-mobile.png)
- [Manual five-feature checklist](https://github.com/The-John-Man/humline/blob/codex/humline-mvp/review/README.md#five-minute-manual-checklist)

## Verification

- 20 logic tests pass, including all six supplied WAV fixtures, editor/history rules, validation, capture cleanup, stale worker responses, and MIDI round trips for edited/overlapping notes.
- Both melody fixtures yield MIDI 57, 60, 64, 62, 60, 57; maximum onset/end error is 39.5 ms against a 100 ms target. Silence/noise yield zero notes; repeated notes stay separate; vibrato stays one note.
- 11 production Chromium browser tests pass: record/import/convert/edit/play/export, actual downloaded MIDI parsing, permissions, synthetic capture and 20-second auto-stop, JSON/persistence, audio output/silence checks, responsive layouts, and axe accessibility checks.
- Production TypeScript/Vite build, formatting, and local HTTPS smoke test pass. HTTPS uses an ephemeral self-signed certificate with trust errors ignored only by the test browser.
- A fresh source-ZIP installation passes all 20 logic tests and produces byte-identical production output.

Tested on Node 24.19.0, npm 11.9.0, Chromium 154.0.8037.57, Debian 13. [Detailed results](https://github.com/The-John-Man/humline/blob/codex/humline-mvp/docs/VERIFICATION.md).

## Known limitations

Physical microphone/output checks and human-hum accuracy still require a person; synthetic fixtures and a fake microphone do not establish realistic transcription accuracy. No independent DAW listening or Safari/Firefox/physical-mobile validation has been performed. Conversion targets one voice, up to 20 seconds, with manual correction expected for noise, glides, repeated pitches and octave errors. Original audio is memory-only and is lost on refresh; notes/tempo/instrument persist. Presets are synthesised, and MIDI receivers may sound different. No public hosting deployment or offline caching is included.
