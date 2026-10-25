# Audio conversion, playback, and MIDI

## Capture and decoding

Use getUserMedia after a user gesture on localhost or HTTPS [S4]. Request mono audio and, where supported, disable echo cancellation, noise suppression, and automatic gain control to reduce pitch distortion. These are browser-dependent preferences, not guarantees. Use MediaRecorder.isTypeSupported to select a supported encoding [S5]; do not hardcode WebM support for every browser. Collect chunks until recording stops, then decode the complete file [S6]. Always handle decode failure and release object URLs.

Reject files over 20 MB before decoding. Validate decoded duration and channels. Support common browser-decodable inputs, with WAV as the portable fixture format. Resample an analysis copy to 22,050 Hz using OfflineAudioContext if that simplifies detector settings [S8]. Preserve the source for original playback. Downmix stereo deliberately and test the result.

## Initial detector pipeline

Pitchy exposes pitch in Hz plus a clarity measure [S1]. It does not itself create musical note events. Use a worker and a 2,048-sample frame with a 256-sample hop at 22,050 Hz as initial settings. These are hypotheses to tune, not validated optimums.

1. Remove frame DC offset. Measure RMS before normalisation.
2. Reject silence/noise using an energy floor; begin testing near -48 dBFS. Avoid normalising silence into a loud noise signal.
3. Estimate frequency and clarity. Start testing clarity near 0.85 and a pitch range around 65–1,200 Hz; keep settings internal initially.
4. Convert Hz to continuous MIDI: 69 + 12 * log2(hz / 440).
5. Smooth short pitch jitter within voiced runs. Do not smooth across real silence or a sustained pitch change.
6. Segment stable pitch runs; use hysteresis to avoid splitting vibrato into many notes. A new semitone should persist briefly before a split.
7. Detect rest boundaries; two notes of the same pitch separated by a clear rest must remain separate. Very short dropouts may be bridged only when evidence supports continuity.
8. Estimate start/end boundaries, accounting for analysis-window timing. Preserve leading silence and meaningful rests by default.
9. Drop isolated very short/noisy fragments conservatively. Keep uncertain supported notes flagged for user review rather than inventing a replacement melody.
10. Convert event seconds to beats using the initial BPM. Retain raw events or source references for diagnosis.

Initial heuristics: roughly 60–90 ms pitch persistence, 70 ms meaningful unvoiced gap, and 90 ms minimum note duration. Adjust against synthetic and human audio; do not tune solely to the packaged melody. Short repeated notes without an amplitude break are an acknowledged weak case.

## Honest quality limits

Pitchy clarity is not an accuracy probability. Octave errors, breath noise, vibrato, glides, consonants, clipping, and repeated notes can all require correction. Do not forcibly fold all notes into one octave, a scale, or a key. Never manufacture notes when the input is silence. Give users an octave correction and note inspector through normal editing.

## Playback

Create/resume AudioContext from a user gesture [S7]. Schedule note envelopes against context time; use a short lookahead scheduler if needed. Draw the playhead with requestAnimationFrame using that same clock. Use attack/release envelopes to avoid clicks, conservative master gain, and optional compression for overlapping notes. Stop/cancel every scheduled voice on stop, recording, replacement, or unmount.

Suggested presets: Keys (short attack, decaying harmonics), Pluck (short filtered envelope), Pad (gentle sustained envelope). Prefer reliable built-in synthesis to network sample dependencies. If samples are used, bundle licensed assets, document attribution, and handle load failures. A/B original versus instrument must remain mutually exclusive.

## MIDI

Use @tonejs/midi [S3]. Set the tempo before adding notes in seconds, or use ticks consistently with the file's PPQ. For each note: time = startBeat * 60 / bpm; duration = durationBeats * 60 / bpm. Include velocity and a program number. Suggested zero-based GM values: Keys 0, Pluck 24, Pad 88. These select receiver patches; they do not embed Humline's synthesiser timbre.

Export a Uint8Array as an audio/midi Blob with a sanitised .mid filename. Revoke the download URL. Parse the exported bytes back and compare the edited note pitches, onsets, durations, velocities, and tempo within one MIDI tick. Never use the original transcription after edits for export.

Source IDs resolve in 10_SOURCES.md. All parameter choices above are project design recommendations.
