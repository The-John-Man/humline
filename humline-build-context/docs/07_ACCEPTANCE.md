# Acceptance checks

No application checks have been run yet. This is the test plan. The package integrity checker validates only the materials supplied here.

## Automated logic checks

| Area | Case | Expected result |
|---|---|---|
| Pitch | 440 Hz | MIDI 69 within a small cents tolerance before rounding |
| Conversion | melody-clean.wav | Six ordered notes matching expected-events.json; onset/end error target <= 100 ms |
| Sample rate | Same melody at 44.1 kHz and 48 kHz | Equivalent pitches and timings within the same tolerance |
| Channels | Stereo fixture | Same six-note melody after downmix |
| Silence | silence.wav | Zero notes; no NaN, Infinity, or fabricated melody |
| Rest | repeated-note.wav | Two A3 notes remain separate across the 200 ms rest |
| Vibrato | vibrato.wav | One sustained A3 rather than many alternating semitones |
| Noise | seeded noise fixture | No stable melody; inspect any false positives |
| Editing | Move/resize near time zero | Nonnegative starts, finite values, positive duration |
| History | One drag then Undo/Redo | Exactly one undo step; original/final note restored |
| Tempo | 100 -> 120 BPM | Beat positions unchanged; playback seconds recomputed |
| Export | Edited project -> MIDI -> parse | Same notes, tempo, velocities and timing within one tick |
| Import | Invalid project JSON | Rejected without replacing the current project |
| Concurrency | Cancel A; complete B; late response A | B remains current |

Use fixtures/expected-events.json for raw source-time truth and fixtures/example-project.json for beat-model and export tests. These are separate fixtures: do not use expected notes as the detector's output.

## Manual browser checks

- On the actual demo machine: request microphone access, record 6–10 seconds, stop, convert, edit, play all three presets, export.
- Deny permission; recover using import. Repeat capture and cancel several times; the recording indicator must turn off.
- Let recording auto-stop at 20 seconds. Try a corrupt file, unsupported format, oversized file, and audio exceeding the duration limit.
- Listen to silence, quiet voice, lower voice, higher voice, repeated notes, breath gaps, and a gliding pitch. Record actual results and limits.
- Pause/resume/stop rapidly. Start original playback then instrument playback. Edit while playing. No overlapping modes or stuck notes.
- Drag a note while the roll is scrolled. Resize at both short and long durations. Edit by numeric inspector and keyboard.
- Refresh: notes restore or an accurate persistence message explains their absence. Do not imply original audio was saved if it was not.
- Test at 1440x900, 1280x800, and about 390x844. No unreachable controls, hidden export, or page-wide accidental horizontal overflow.
- Check visible focus, button names, keyboard operations, reduced motion, and colour-independent error information.
- Test the production build on localhost and HTTPS. A file:// launch is not an adequate recording test.

## Human audio evaluation

Synthetic fixtures are deterministic plumbing tests, not validation of realistic humming. Aim to evaluate at least five short human-recorded phrases covering different pitches and gaps, with permission if recordings belong to someone else. This can be the builder recording several phrases; it does not require recruiting users. Include at least one phrase not used for tuning.

Write a table: input description, expected melodic contour, detected notes, octave mistakes, missing/extra notes, corrections needed, conversion duration. Report limitations honestly. Do not claim a global accuracy percentage from this small set. If no real microphone test is possible, clearly mark it unverified and keep the live-recording claim qualified.

## Release gates

All five required features work together; no placeholder controls; no invented detected notes; MIDI round trip passes; silent input is handled; production build passes; audio resources are released; example mode is labelled; source archive installs using its lockfile. Record browser/version, operating system, and actual validation commands in the final README.
