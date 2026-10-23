# Audio fixtures

All WAV files are original, algorithmically generated test signals, not human humming. They are intended for detector, segmentation, sample-rate, and import tests. They do not establish production transcription quality.

- melody-clean.wav: six notes, 44.1 kHz mono, with leading silence and rests.
- melody-48k-stereo.wav: the same timing/pitches, 48 kHz stereo with channel gain difference.
- repeated-note.wav: two A3 tones separated by a 200 ms rest.
- vibrato.wav: one A3 tone with modest vibrato.
- silence.wav: two seconds of digital silence.
- noise.wav: two seconds of seeded, low-amplitude noise.
- expected-events.json: exact generated source events in seconds.
- example-project.json: those melody events in the proposed beat-based project model at 100 BPM; suitable for editor and MIDI tests only.

Use the WAV input to test transcription. Never load expected-events.json or example-project.json as a substitute for analysing that WAV in a demonstration of conversion.

Recreate WAV fixtures using Node: node scripts/generate-fixtures.mjs (from the package root). This rewrites fixture files and invalidates the original manifest if file bytes change. Keep human recordings separate and obtain permission before redistributing anyone else's voice.
