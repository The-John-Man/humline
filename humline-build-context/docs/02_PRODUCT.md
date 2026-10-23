# MVP product specification

## Promise

Hum a melody. Make it yours.

Capture a short idea, turn it into notes, correct the rough edges, and take the melody into another music tool. The interface should be welcoming to someone who does not know music-production terminology.

## P0 — required for a complete MVP

### Record

A clear Record button requests microphone access only after a click. Show elapsed time, a live level/waveform, Stop, and Cancel. Limit capture to 20 seconds; automatically stop at the limit. Stop every media track on completion, cancellation, error, and unmount. Do not monitor the microphone through speakers. Provide concise guidance: one voice, quiet room, steady notes, short gaps between notes.

Handle permission denied, missing or busy microphone, unsupported browser, and insecure origin. The user must be able to retry or use audio import without reloading the page. A fresh recording does not destroy an existing project until the user explicitly replaces it.

### Convert

After capture, allow listening to the original and selecting Convert to notes. Analyse the actual audio locally and display real progress. The UI stays responsive and conversion can be cancelled. Empty, too-short, silent, or unpitched input produces a useful message and zero invented notes. Show uncertain segments as review candidates. Start with one continuous melodic voice; chords and backing tracks are outside the supported input.

### Edit

Show pitches vertically and musical time horizontally. Drag a note vertically to change pitch and horizontally to change start time. Resize its right edge to change duration. Click empty space to add a note; select and delete; undo and redo. Supply an inspector with editable pitch, start, and duration so precise editing does not require dragging. Snap is optional and clearly labelled. Default grid: 1/8 note, represented as 0.5 quarter-note beats. Provide note audition on deliberate selection.

### Listen

Play/pause/stop controls, a moving playhead, adjustable tempo, volume, and three recognisably different presets: Keys, Pluck, and Pad. Original recording and instrument playback are separate modes. Stop existing playback before changing modes, instruments, recording, or editing. Restart from the selected playhead when appropriate; never leave stuck notes. Prefer well-designed synthesis presets that require no large sample downloads. Do not label a simple oscillator as an authentic sampled acoustic piano.

### Export

Download a valid .mid file representing the current edited notes, chosen tempo, and instrument program. Disable export when there are no notes. Explain briefly that MIDI stores notes and timing, not the original voice or exact synthesiser sound. A file that only changes its extension to .mid does not qualify.

## Supporting P0 features

- Import a short WAV or browser-decodable audio file, subject to a 20 MB input limit and 20-second decoded-duration limit. Unsupported formats must fail clearly.
- Load a clearly labelled synthetic example through the same conversion pipeline.
- Save edited notes, tempo, and preset locally; offer project JSON download/import. Validate imports.
- Preserve the original audio in memory for the active session. If not persisted, explicitly say that refreshing restores notes but requires reimporting audio for original playback.
- Responsive layout, visible keyboard focus, labelled controls, readable contrast, and usable error/empty/loading states.

## Not required this weekend

Polyphonic transcription, automatic songwriting, lyrics, vocal cloning, stems, score engraving, full mobile app-store delivery, accounts, sharing feeds, cloud sync, payment, automatic accompaniment, automatic tempo/key inference, audio effects racks, and multi-track editing.

## Success demonstration

Record a 6–10-second melody, see corresponding editable notes, correct one pitch and one duration, switch instrument, play, export, and parse/open the MIDI. The user controls the result. Accuracy is measured, not assumed.
