# Design brief — a small, inviting music studio

## Direction

Humline should feel like a finished creative instrument. Use an inky navy background, warm off-white text, mint primary actions, and restrained lavender note accents. The piano roll is the central visual. Keep the page useful immediately; avoid a marketing hero taking over the workspace.

Suggested title: Humline. Tagline: Hum a melody. Make it yours.
Primary actions: Record a melody, Convert to notes, Play, Export MIDI.
Secondary actions: Import audio, Try an example, Listen to original, Undo.

## Desktop composition

~~~text
 HUMline       Untitled melody / Saved locally          Export MIDI
 -----------------------------------------------------------------
 CAPTURE                       YOUR MELODY
 [record button]               [Keys] [Pluck] [Pad]
 00:08 / 00:20                  [waveform / original audio toggle]
 live input level              -----------------------------------
 [Import] [Try example]         C5 |      [note]       [note]
                               B4 | [note]
 NOTE DETAILS                  A4 |           [note]
 Pitch / Start / Length        ...|________________________________
                               [Stop] [Play] 100 BPM  Snap  Volume
 -----------------------------------------------------------------
 One voice, one melody.                              Local processing
~~~

Desktop: approximately 280 px left panel, flexible editor, compact top bar. At 390 px width, stack capture above the roll, keep the keyboard sticky, and allow horizontal scrolling inside the roll. Do not squeeze note targets below usability. Provide inspector-based edits on small screens.

## Visual rules

- Background #0B1020; surface #141C2F; raised surface #1C2840.
- Text #F3F5FA; secondary text #AAB6CC; mint #79E2BD; lavender #B9A5FF; error #FF9A9A.
- Verify actual contrast, especially small labels; token selection is not a contrast audit.
- System sans-serif for dependable loading; tabular numbers for time and BPM.
- 8 px spacing rhythm, 14–20 px card radii, subtle borders, restrained shadows.
- The record control has a distinct red recording state, visible timer, and text status.
- Use motion for recording feedback, note appearance, and playhead movement. Honour reduced-motion preferences.
- Notes show their pitch on selection. Uncertain notes use an icon/pattern and text, not colour alone.
- Keep bar lines more prominent than beat divisions. Label octave boundaries clearly.
- At default zoom, make edit targets large enough to drag reliably. An active note gets handles and a clear outline.

## Required UI states

Empty: invitation to record plus an example option, with a tasteful blank grid.
Recording: live level, timer, Stop/Cancel, no instrument playback.
Analysing: actual progress, Cancel, and a calm explanation.
Ready: waveform, detected notes, preset selection, transport, export.
No melody: explain that no steady pitches were found; retain the audio and offer retry.
Permission denied: show browser-setting guidance and Import audio.
Exported: a concise confirmation; do not invent proof that a download was opened.

Do not display infrastructure names, detector parameters, or sponsor badges in the core user flow. Put technical credits in a small About panel. Do not call the app offline-ready unless it has an actual tested offline loading strategy.
