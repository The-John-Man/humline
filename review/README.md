# Review Humline

This branch includes the working app, the original build specifications and fixtures, verification results, and a prebuilt static-site ZIP. No public browser preview is available from the development environment.

## Run the prebuilt app without Node

1. Download **Humline-MVP-static-site.zip** from this folder using GitHub's **Download raw file** button. Sign into GitHub first if the private repository prompts you.
2. Extract the ZIP into a new folder named `humline-preview`. Its root should contain `index.html`, `assets/`, and `examples/`.
3. With Python 3 installed, run:

```sh
cd humline-preview
python3 -m http.server 4173 --bind 127.0.0.1
```

On Windows with the Python launcher, use `py -m http.server 4173 --bind 127.0.0.1` instead.

4. Open **http://localhost:4173** in current Chrome or Edge. Keep the terminal running. Stop the server with Ctrl+C.

Localhost permits microphone access. Double-clicking `index.html` does not. This localhost address refers to the server you start on your own computer, not a remotely accessible cloud preview.

## Run or inspect the source

Download this branch using GitHub's **Code → Download ZIP**, or clone it:

```sh
git clone --branch codex/humline-mvp https://github.com/The-John-Man/humline.git
cd humline/app
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

Requires Node 22.12+; Node 24 is recommended. Open **http://localhost:5173**. If using GitHub's source ZIP instead of cloning, enter its extracted `app` folder and run the last two commands.

## Five-minute manual checklist

- **Record:** allow the microphone, hum for 6–10 seconds, Stop, and listen to the original. Confirm the browser recording indicator turns off. Try Cancel; verify old notes remain. Let one capture auto-stop at 20 seconds.
- **Transcribe:** Convert the recording. Compare the melody with what you hummed; note missing/extra pitches or octave errors. Also try the explicitly labelled synthetic example. Try silence and check that no notes are invented.
- **Edit:** drag one pitch, move another note in time, resize an edge, and edit a duration in the inspector. Add/delete a note, then Undo/Redo. Try snap both on and off.
- **Listen:** compare Keys, Pluck, and Pad; change volume and tempo; pause/resume/stop. Switch between original and instrument playback and confirm no overlapping modes or stuck sound.
- **Export:** download MIDI after your edits. Open it in your DAW/MIDI viewer and confirm the changed pitches, starts, lengths, and tempo. Save/reopen project JSON; refresh and confirm notes return while original audio needs reimporting.

The automated suite passes 20 logic tests, 11 production browser tests, and a local HTTPS smoke check. All six supplied audio fixtures pass. MIDI parse-back checks verify edited notes and overlaps. See [full verification](../docs/VERIFICATION.md).

**Still unverified:** physical microphone/output hardware, realistic human-hum accuracy, subjective preset quality, and independent DAW playback. Automated microphone tests use a synthetic audio device. Conversion supports short single-voice melodies, not chords or backing tracks. Original audio is session-only. See [limitations](../docs/IMPLEMENTATION.md).

## Screenshots

[Desktop studio](studio-desktop.png) · [Mobile studio](studio-mobile.png)
