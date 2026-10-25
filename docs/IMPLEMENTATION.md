# Implementation notes

## One musical data model

`HumlineProject` schema version 1 is the source of truth. MIDI pitch is an integer 0–127, start and duration are quarter-note beats, velocity is 0–1, and tempo is 40–240 BPM. Detection starts in seconds and converts to beats once at `transcriptionBpm`. Changing tempo subsequently changes playback seconds, not note positions. The same edited note array drives rendering, synthesis, project JSON, localStorage, and MIDI export. Manual overlapping notes are retained.

Note edits clamp invalid time/pitch/velocity values. Drags preview locally and commit once on release. History keeps up to 50 snapshots; transient audio objects are held separately and weakly associated with source metadata, allowing Undo of conversion/project replacement to recover session audio. A new imported/recorded clip does not overwrite notes until replacement is explicitly accepted. Cancelling work preserves the last project. Invalid project files are rejected before replacement.

## Local audio pipeline

`getUserMedia` runs only after a click, requests mono with voice-processing preferences disabled, and uses runtime MIME negotiation for MediaRecorder. Its source feeds an analyser but never the speakers. Stop, Cancel, construction errors, delayed permission responses, and unmount release tracks. A real 20-second timer stops recording. Encoder padding up to 0.5 seconds is accepted only for microphone recordings and trimmed to 20 seconds; imported files exceeding 20 seconds are rejected.

The browser decodes the complete blob. The untouched AudioBuffer remains available for original playback. A copy of every channel is transferred to the worker. Channels are deliberately averaged, then resampled to 22,050 Hz using a windowed-sinc filter. This is a documented departure from the proposed OfflineAudioContext resampler: the same deterministic preprocessing runs in browser workers and fixture tests, while the main thread remains responsive.

Pitch detection removes DC, measures RMS before any detection, gates below 0.004 (~−48 dBFS), and uses Pitchy's McLeod detector on 2,048-sample centred windows with 256-sample hops. Frequency candidates require clarity ≥0.85 and 65–1,200 Hz. Clarity is a periodicity measure, not an accuracy probability.

Segmentation is separate. A recent median pitch plus 0.7-semitone hysteresis requires ~70 ms of a new pitch before splitting. Meaningful unvoiced gaps end notes, very short fragments are dropped, leading silence/rest timing is retained, and unstable/lower-clarity supported segments receive a visible ◇ review marker. There is no scale fitting, octave folding, automatic BPM guessing, or fallback note sequence. A worker job ID and termination protect against stale results; progress comes from processed frame counts.

## Playback and export

One AudioEngine owns the AudioContext, volume, compression, source playback, and all synthesised voices. A 50 ms lookahead timer schedules a 180 ms horizon against audio time; animation reads that clock. Envelopes and bounded gain avoid abrupt note attacks. Keys uses decaying sine harmonics, Pluck a short triangle envelope, and Pad detuned filtered saws with a slower attack. Pause reconstructs sustaining notes from the paused beat. All scheduled voices are stopped/disconnected on mode/instrument changes, recording, editing, stop, and disposal. Operation versions prevent asynchronous audio-resume promises from reviving cancelled playback.

MIDI is written at the file PPQ with tempo, 4/4 signature, velocities, and GM programs 0 (Keys), 24 (Pluck), or 88 (Pad). Tests parse bytes back, comparing edited pitches, overlaps, tempo, velocities within one MIDI velocity unit, and timing within one tick. Browser tests also parse an actual downloaded MIDI after editing pitch, start, and duration.

## Design and accessibility

An inky navy studio, mint actions, lavender notes, system fonts, and local icons follow the brief. The piano roll scrolls in both axes, keeps pitch labels and its ruler sticky, includes all supported MIDI pitches, and reveals selected notes. Mobile stacks capture, roll, and inspector; volume and export remain available. Pointer capture, keyboard note editing, precise inspectors, visible focus, native modal dialogs, live status/error announcements, text/pattern uncertainty markers, and reduced-motion styles are included. Axe checks pass for the empty and selected-note desktop states; that does not replace a full assistive-technology audit.

## Known limitations

- **Real humming is unverified.** Synthetic fixture correctness and a fake-microphone test do not measure human transcription accuracy. Soft voices, breathiness, clipping, glides, vibrato beyond the tested range, octave ambiguities, consonants, and consecutive same-pitch notes without a gap may need manual correction.
- Conversion is for a short, single melodic voice, not chords, backing tracks, or full songs. Frequencies outside 65–1,200 Hz are ignored by the detector; the editor/export still support MIDI 0–127.
- Frame windows broaden note boundaries slightly. The supplied voiced fixtures stay within 40 ms maximum observed onset/end error; that is not a bound for arbitrary recordings.
- Stereo is averaged. Strongly phase-inverted stereo can cancel; use a mono voice recording if possible.
- Tempo is user-selected (default 100 BPM); original audio is neither stretched nor beat-aligned after tempo changes. Transcription is not automatically quantised.
- Original audio is memory-only and does not survive refresh or travel in JSON/MIDI. LocalStorage can be unavailable or full; the UI reports save failure and JSON backup remains available.
- Chromium on Linux is verified. Safari/Firefox, physical mobile devices, hardware microphones, and actual instrument timbre perception remain unverified. Codec availability varies by browser.
- Timing can be affected by background-tab throttling or device suspension. Rehearse in an active tab on the demo computer.
- No offline service worker, polyphonic transcription, automatic accompaniment, or audio export in this release.
- On the Clerk/library branch, accounts and PostgreSQL-backed private storage are implemented; original recordings still stay on-device. See [CLOUD_SETUP.md](CLOUD_SETUP.md).
- Public deployment and a production Clerk instance are not provisioned until the user chooses a host.

Audio analysis never leaves the browser. Cloud payloads contain notes and settings only.
