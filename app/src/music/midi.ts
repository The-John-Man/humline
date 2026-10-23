import { Midi } from '@tonejs/midi';
import type { HumlineProject } from '../types/project';
export const programs = { keys: 0, pluck: 24, pad: 88 };
export function exportMidi(project: HumlineProject): Uint8Array<ArrayBuffer> {
  const midi = new Midi();
  midi.header.name = project.title;
  midi.header.setTempo(project.bpm);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [4, 4], measures: 0 });
  const track = midi.addTrack();
  track.name = project.title;
  track.instrument.number = programs[project.instrument];
  project.notes.forEach((n) =>
    track.addNote({
      midi: n.midi,
      ticks: Math.round(n.startBeat * midi.header.ppq),
      durationTicks: Math.max(1, Math.round(n.durationBeats * midi.header.ppq)),
      velocity: n.velocity,
    }),
  );
  return new Uint8Array(midi.toArray());
}
export function download(data: Blob, title: string, extension: string) {
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${
    title
      .replace(/[^a-z0-9 _-]/gi, '')
      .trim()
      .slice(0, 70) || 'Humline melody'
  }.${extension}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
