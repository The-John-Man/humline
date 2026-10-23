import { describe, expect, it } from 'vitest';
import { Midi } from '@tonejs/midi';
import {
  commit,
  editNote,
  newProject,
  parseProject,
  redo,
  undo,
  type History,
} from '../src/state/project';
import { exportMidi, programs } from '../src/music/midi';
import { beatsToSeconds } from '../src/music/pitch';
import fixture from '../../humline-build-context/fixtures/example-project.json';
describe('editing and export use the same canonical notes', () => {
  it('clamps invalid edits without losing stable IDs', () => {
    const n = parseProject(JSON.stringify(fixture)).notes[0];
    expect(editNote(n, { midi: 150, startBeat: -4, durationBeats: -1, id: 'bad' })).toMatchObject({
      midi: 127,
      startBeat: 0,
      durationBeats: 0.03125,
      id: n.id,
    });
    expect(editNote(n, { midi: NaN, startBeat: Infinity })).toEqual(n);
  });
  it('stores one final drag as one undo step', () => {
    const p = parseProject(JSON.stringify(fixture));
    const initial: History = { past: [], present: p, future: [] };
    const final = {
      ...p,
      notes: p.notes.map((n, i) => (i ? n : editNote(n, { midi: 70, startBeat: 2 }))),
    };
    const h = commit(initial, final);
    expect(h.past).toHaveLength(1);
    expect(undo(h).present).toEqual(p);
    expect(redo(undo(h)).present).toEqual(final);
  });
  it('tempo changes preserve beats but recompute seconds', () => {
    const p = parseProject(JSON.stringify(fixture));
    const changed = { ...p, bpm: 120 };
    expect(changed.notes).toEqual(p.notes);
    expect(beatsToSeconds(4, changed.bpm)).toBe(2);
    expect(beatsToSeconds(4, p.bpm)).toBe(2.4);
  });
  it.each(['keys', 'pluck', 'pad'] as const)(
    'round-trips edited notes, overlap, tempo, velocity and %s program',
    (instrument) => {
      const p = parseProject(JSON.stringify(fixture));
      p.bpm = 123;
      p.instrument = instrument;
      p.notes[0] = editNote(p.notes[0], {
        midi: 74,
        startBeat: 0.25,
        durationBeats: 2.25,
        velocity: 0.6,
      });
      p.notes.push({ ...p.notes[0], id: 'overlap', midi: 69, startBeat: 0.5 });
      const midi = new Midi(exportMidi(p));
      const track = midi.tracks[0];
      expect(track.instrument.number).toBe(programs[instrument]);
      expect(midi.header.tempos[0].bpm).toBeCloseTo(123, 2);
      expect(track.notes).toHaveLength(p.notes.length);
      const expected = [...p.notes].sort((a, b) => a.startBeat - b.startBeat);
      track.notes.forEach((n, i) => {
        const e = expected[i];
        expect(n.midi).toBe(e.midi);
        expect(Math.abs(n.ticks / midi.header.ppq - e.startBeat)).toBeLessThanOrEqual(
          1 / midi.header.ppq,
        );
        expect(Math.abs(n.durationTicks / midi.header.ppq - e.durationBeats)).toBeLessThanOrEqual(
          1 / midi.header.ppq,
        );
        expect(Math.abs(n.velocity - e.velocity)).toBeLessThanOrEqual(1 / 127);
      });
    },
  );
  it('rejects corrupt, nonfinite, duplicate and oversized projects', () => {
    expect(() => parseProject('oops')).toThrow();
    const p = parseProject(JSON.stringify(fixture));
    for (const invalid of [
      { ...p, bpm: null },
      { ...p, schemaVersion: 2 },
      { ...p, notes: [p.notes[0], p.notes[0]] },
      { ...p, notes: [{ ...p.notes[0], startBeat: -1 }] },
    ])
      expect(() => parseProject(JSON.stringify(invalid))).toThrow();
    expect(parseProject(JSON.stringify(newProject())).notes).toEqual([]);
  });
});
