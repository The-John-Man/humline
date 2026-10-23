export const hzToMidi = (hz: number) => 69 + 12 * Math.log2(hz / 440);
export const midiToHz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
export const noteName = (midi: number) =>
  `${['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][midi % 12]}${Math.floor(midi / 12) - 1}`;
export const beatsToSeconds = (beats: number, bpm: number) => (beats * 60) / bpm;
export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
