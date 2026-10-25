# Primary-source references

Checked October 23, 2026. Sources support API feasibility, not proof that Humline has been implemented or validated. Review current package versions and licenses during implementation. The product scope, heuristics, design, and effort estimates in this package are original recommendations.

- **S1 — Pitchy:** https://github.com/ianprime0509/pitchy — JavaScript pitch detection using the McLeod Pitch Method, with frequency and clarity outputs. Read the current API before coding.
- **S2 — Basic Pitch:** https://github.com/spotify/basic-pitch — alternative audio transcription engine; its README links to the JavaScript sibling. This was the original ideation reference, not a required stack choice.
- **S3 — Tone.js MIDI:** https://github.com/Tonejs/Midi — MIDI reading and writing; use for export and parse-back validation.
- **S4 — Microphone capture:** https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia — permissions and secure-context requirements.
- **S5 — Recording encoding support:** https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static — capability checks for recorder MIME types.
- **S6 — Audio decoding:** https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData — decoding complete audio data into an AudioBuffer.
- **S7 — Web Audio practices:** https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices — user-gesture playback and audio lifecycle considerations.
- **S8 — Offline audio processing:** https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext — processing an audio graph into a buffer.

No third-party source code, model weights, instrument samples, or full articles have been bundled. The synthetic fixtures were generated for this package and contain no user voice or sampled commercial recording.
