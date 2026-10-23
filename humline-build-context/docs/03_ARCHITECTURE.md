# Architecture and data contract

## Recommended stack

- TypeScript, React, and Vite for a compact browser app.
- Native Web Audio for decoding, waveform analysis, synthesis, and timing.
- MediaRecorder for capture; choose a supported MIME type at runtime.
- Pitchy for the initial monophonic pitch detector; custom, tested segmentation converts pitch frames into notes.
- @tonejs/midi for MIDI writing and reading in tests.
- SVG or positioned HTML for an interactive, accessible piano roll. Use canvas only if performance requires it.
- Vitest for pure logic tests and browser tests for the complete flow.

Resolve compatible stable package versions at implementation time, install once, and commit the lockfile. No application package manifest is supplied because this package contains planning materials only. Node 22+ is a proposed development baseline; check the selected Vite version's requirements.

No production API key, database, Python server, or paid service is needed for this architecture. Local DSP is the recommended implementation choice, not an assertion of benchmark superiority. Basic Pitch was an earlier possible starting point; see the detector decision in 09_DECISIONS.md.

## Data flow

Microphone / imported file -> complete encoded audio blob -> decoded PCM -> mono analysis copy -> worker pitch frames -> segmentation -> notes in beats -> editor -> Web Audio playback / MIDI / project JSON.

Keep source audio separate from derived notes. Do not mutate the original PCM during preprocessing. Keep analysis timestamps in seconds. Convert them once to beats using the project tempo at transcription. Store the source tempo as transcriptionBpm. Later tempo changes keep note beats fixed and change musical playback duration. Original audio always plays at its recorded speed.

## Canonical units

- midi: integer 0..127; C4 = MIDI 60.
- startBeat, durationBeats: quarter-note beats, finite; start >= 0, duration > 0.
- bpm: 40..240; default 100.
- velocity: normalised 0..1; default 0.75.
- Convert to playback seconds with beats * 60 / bpm.
- Snap positions to 0.5 beats by default; preserve raw transcription timing until quantise is explicitly applied.
- Display 4/4 bar lines for the MVP. A quarter note is one beat.
- Editing range should scroll to include all detected MIDI notes, even outside the initially visible octave range.

Preserve stable note IDs. Batch each drag into one undo action. Clamp edits at zero and a positive minimum duration. Imported detected melodies are monophonic; manual edits may overlap and must play/export correctly as polyphony. Do not silently discard overlapping notes.

## State and concurrency

Use explicit states: idle, requesting-microphone, recording, recorded, analysing, ready, error. Track playback separately: stopped, playing, paused. Disable conflicting operations. A monotonically increasing analysis job ID prevents old worker responses overwriting a new recording. Cancel terminates the worker or causes stale results to be ignored. A cancelled operation retains the previous valid project.

One audio engine owns the AudioContext and scheduled voices. UI animation follows audio time, not the other way round. Components must not independently create competing playback engines. Version the persisted project schema. Audio blobs never belong in localStorage.

## Suggested application layout

~~~text
app/
  src/components/ Recorder, PianoRoll, Transport, NoteInspector, InstrumentPicker
  src/audio/ capture, decode, detector, segment, playback
  src/workers/ transcription.worker
  src/music/ pitch, timing, midi
  src/state/ project, history, persistence
  src/styles/ tokens, studio
  src/types/ project
  tests/ audio, editor, midi, browser
  public/examples/
~~~

Read reference/types.ts as a proposed interface, not executable application code. Keep pure operations independent of React so fixtures can exercise real production logic.
