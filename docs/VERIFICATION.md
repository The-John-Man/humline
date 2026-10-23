# Verification report

Verified October 23, 2026, using Node 24.19.0 / npm 11.9.0 / Chromium 154.0.8037.57 on Debian GNU/Linux 13. The final browser run exercised the compiled production application, not Vite's development server.

## Results

| Check | Result |
|---|---|
| Supplied context integrity | PASS: all 26 manifest files and six WAV fixtures |
| `npm test` in `app/` | PASS: 20 tests in three files |
| `npm run build` | PASS: strict TypeScript check and Vite production bundle |
| `npm run test:browser` | PASS: 11 tests, final full run 47.2 seconds |
| `npm run test:https` | PASS: static assets, worker conversion, synthetic microphone capture over local HTTPS |
| Automated accessibility | PASS: zero axe WCAG 2 A/AA and 2.1 AA violations in empty and selected-note desktop states |
| Responsive layout | PASS: 1440×900, 1280×800, 390×844; internal roll scrolling, no page-wide horizontal overflow |
| Fresh source ZIP install | PASS: extracted to a new directory; offline `npm ci` from the populated cache, production build, and all 20 logic tests |
| Formatting | PASS: `npm run format:check` |
| Human microphone and human-hum quality | **NOT VERIFIED — user participation required** |
| External/public HTTPS deployment | Not performed; static output is ready to publish |

The HTTPS test used a temporary self-signed certificate and explicitly ignored certificate trust errors in the test browser. This verifies the local TLS application path, not a publicly trusted deployment.

## Audio fixtures

These are algorithmic signals supplied in the context, **not human humming**. Tests read actual PCM from WAV files, then run production downmix/resampling, Pitchy detection, and segmentation. The expected-events file is used only for assertions.

| Fixture | Detected MIDI pitches | Maximum onset/end error | Result |
|---|---|---|---|
| melody-clean.wav, 44.1 kHz mono | 57, 60, 64, 62, 60, 57 | 39.5 ms | Six correct notes; leading silence/rests retained |
| melody-48k-stereo.wav, 48 kHz stereo | 57, 60, 64, 62, 60, 57 | 39.5 ms | Equivalent events after downmix/resampling |
| repeated-note.wav | 57, 57 | 37.0 ms | Two A3 notes remain separate |
| vibrato.wav | 57 | 31.7 ms | One sustained note |
| silence.wav | None | N/A | Zero notes |
| noise.wav | None | N/A | Zero notes |

All voiced events meet the package's ≤100 ms onset/end target. [Raw measurements](fixture-results.json) include per-event timing and observed DSP runtimes. Runtime measurements are one execution on this machine, not a general latency guarantee.

## What the browser tests actually exercised

- Load synthetic WAV → run the real worker → display six notes. Synthetic provenance remains visible.
- Change a note to MIDI 72, set its onset to 0.5 beats and length to 2.5 beats, and parse the actual downloaded MIDI to confirm those edits. Unit tests additionally compare all pitches, onsets, durations, velocities, tempo, overlapping notes, and all three GM programs.
- Pointer drag, resize, one-step Undo/Redo, keyboard pitch editing/deletion, and clicking empty grid space to add a note.
- Keys/Pluck/Pad playback, pause/resume/stop, original-versus-instrument mode switching, and audio-context output measurement. Each preset produces nonzero signal; Stop returns output to silence. These measurements do not certify subjective sound quality.
- Project JSON download/import, tempo entry, localStorage restore after refresh, and original-audio restoration when undoing project replacement.
- Corrupt audio, silence, invalid project JSON, explicit replacement cancellation, and microphone-denial recovery through import.
- A real browser getUserMedia → MediaRecorder → decode → worker flow using a **fake microphone fed by the supplied synthetic WAV**. Stop and Cancel verify ended tracks. A separate real-time run verifies automatic completion at 20 seconds.
- Source-level lifecycle tests verify delayed permission cancellation, cleanup on recorder-construction failure, stale worker-response rejection, oversized-file rejection before decode, and decoded-duration boundaries.
- Screenshots at desktop and mobile sizes; mobile note editing and export access. Automated accessibility checks run against both an empty studio and selected-note inspector.

Some defects found during testing were corrected before the final pass: an audio-history edge case on importing an identical project, intermediate numeric tempo entry, and note-audition/playback cancellation handling. No failing checks remain in the listed suite.

## Checks requiring your participation

Use the actual demo laptop, browser, microphone, and headphones/speakers:

1. Open on localhost or your HTTPS deployment. Allow the physical microphone. Record a 6–10-second original hum, listen to the original, convert, correct a pitch and duration, and play all three presets. Confirm comfortable levels, distinct timbres, and no clicks/stuck notes during rapid switching.
2. Deny permission, recover with import, then allow permission and retry. Stop/Cancel several captures and verify the browser's microphone indicator turns off. Let one recording reach 20 seconds.
3. Record at least five phrases below. Keep one phrase held out from any detector tuning. Judge by listening; note pitches, octave errors, omissions, extra notes, corrections, and conversion time. Do not calculate a general “accuracy percentage” from this tiny sample.
4. Open an exported edited MIDI in the DAW or independent MIDI player intended for the demo. Byte-level round trips are verified; real DAW playback is not.
5. If presenting from Safari, Firefox, an actual phone, or an embedded preview, repeat capture/codec/output checks there. Those targets have not been verified.

| Human recording | Expected contour | Detected notes | Octave errors | Missing/extra notes | Corrections | Conversion time |
|---|---|---|---|---|---|---|
| Comfortable register, clear three-note rise and fall | Up, then down | Pending | Pending | Pending | Pending | Pending |
| Lower register, short steady phrase | Record intended contour | Pending | Pending | Pending | Pending | Pending |
| Higher register, short steady phrase | Record intended contour | Pending | Pending | Pending | Pending | Pending |
| Repeated pitch with audible breath gaps | Same pitch, distinct events | Pending | Pending | Pending | Pending | Pending |
| Held-out phrase with natural vibrato/glide | Record intended contour | Pending | Pending | Pending | Pending | Pending |

For a 90-second rehearsal, follow the preserved [demo script](../humline-build-context/docs/08_DEMO.md). If live capture fails, use a prior personal recording and identify it as prerecorded. If using the included example, identify it as synthetic.

## Reproduce / package

```sh
node humline-build-context/scripts/verify-package.mjs
cd app
npm ci
npm test
npm run build
npm run test:browser
npm run test:https
npm run format:check
cd ..
python3 scripts/package-release.py
```

The source ZIP includes application source, app lockfile, tests, run instructions, and the extracted specifications/fixtures. It excludes node_modules, .git, build output, browser test artifacts, credentials, and temporary TLS keys. The separate static-site ZIP contains the production output. `release/SHA256SUMS.txt` records both hashes.

Fresh-archive reproduction used `/tmp/humline-release-check/humline/app` with `npm ci --cache /tmp/humline-npm-cache --offline`, followed by `npm run build` and `npm test`. The rebuilt asset hashes matched the working-copy production build. The final archive was then regenerated to include this verification record; application code and lockfile were unchanged.
