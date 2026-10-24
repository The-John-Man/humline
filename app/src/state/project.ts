import type { HumlineProject, MelodyNote } from '../types/project';
import { clamp } from '../music/pitch';
export const newProject = (): HumlineProject => ({
  schemaVersion: 1,
  id: crypto.randomUUID(),
  title: 'Untitled melody',
  bpm: 100,
  transcriptionBpm: 100,
  instrument: 'keys',
  notes: [],
});
const finite = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
export function parseProject(text: string): HumlineProject {
  if (text.length > 2_000_000) throw new Error('Project is too large. Maximum JSON size is 2 MB.');
  const p = JSON.parse(text);
  if (
    !p ||
    p.schemaVersion !== 1 ||
    typeof p.id !== 'string' ||
    typeof p.title !== 'string' ||
    p.title.length > 100 ||
    !finite(p.bpm, 40, 240) ||
    !finite(p.transcriptionBpm, 40, 240) ||
    !['keys', 'pluck', 'pad'].includes(p.instrument) ||
    !Array.isArray(p.notes) ||
    p.notes.length > 2000
  )
    throw new Error('Invalid Humline project. Use a version 1 project JSON.');
  const ids = new Set<string>();
  const notes: MelodyNote[] = p.notes.map((n: MelodyNote) => {
    if (
      !n ||
      typeof n.id !== 'string' ||
      ids.has(n.id) ||
      !Number.isInteger(n.midi) ||
      !finite(n.midi, 0, 127) ||
      !finite(n.startBeat, 0, 4096) ||
      !finite(n.durationBeats, 0.03125, 4096) ||
      !finite(n.velocity, 0, 1) ||
      !['manual', 'detected'].includes(n.source) ||
      (n.clarity !== undefined && !finite(n.clarity, 0, 1)) ||
      (n.needsReview !== undefined && typeof n.needsReview !== 'boolean')
    )
      throw new Error('Invalid note data in project. Your current melody has been kept.');
    ids.add(n.id);
    return {
      id: n.id,
      midi: n.midi,
      startBeat: n.startBeat,
      durationBeats: n.durationBeats,
      velocity: n.velocity,
      source: n.source,
      clarity: n.clarity,
      needsReview: n.needsReview,
    };
  });
  let sourceAudio: HumlineProject['sourceAudio'];
  if (p.sourceAudio !== undefined) {
    const a = p.sourceAudio;
    if (
      !a ||
      typeof a.name !== 'string' ||
      a.name.length > 300 ||
      !finite(a.durationSeconds, 0, 20.05) ||
      typeof a.synthetic !== 'boolean'
    )
      throw new Error('Invalid source audio metadata.');
    sourceAudio = { name: a.name, durationSeconds: a.durationSeconds, synthetic: a.synthetic };
  }
  return {
    schemaVersion: 1,
    id: p.id,
    title: p.title,
    bpm: p.bpm,
    transcriptionBpm: p.transcriptionBpm,
    instrument: p.instrument,
    notes,
    sourceAudio,
  };
}
export function editNote(note: MelodyNote, patch: Partial<MelodyNote>): MelodyNote {
  const n = { ...note, ...patch, id: note.id };
  return {
    ...n,
    midi: Math.round(clamp(Number.isFinite(n.midi) ? n.midi : note.midi, 0, 127)),
    startBeat: clamp(Number.isFinite(n.startBeat) ? n.startBeat : note.startBeat, 0, 4096),
    durationBeats: clamp(
      Number.isFinite(n.durationBeats) ? n.durationBeats : note.durationBeats,
      0.03125,
      4096,
    ),
    velocity: clamp(Number.isFinite(n.velocity) ? n.velocity : note.velocity, 0, 1),
  };
}
export interface History {
  past: HumlineProject[];
  present: HumlineProject;
  future: HumlineProject[];
}
export function commit(h: History, p: HumlineProject, force = false): History {
  if (!force && JSON.stringify(p) === JSON.stringify(h.present)) return h;
  return { past: [...h.past.slice(-49), h.present], present: p, future: [] };
}
export function undo(h: History): History {
  return h.past.length
    ? { past: h.past.slice(0, -1), present: h.past.at(-1)!, future: [h.present, ...h.future] }
    : h;
}
export function redo(h: History): History {
  return h.future.length
    ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) }
    : h;
}
export const STORAGE_KEY = 'humline.project.v1';
export function restore(storageKey = STORAGE_KEY): { project: HumlineProject; warning?: string } {
  try {
    const saved = localStorage.getItem(storageKey);
    return { project: saved ? parseProject(saved) : newProject() };
  } catch {
    return {
      project: newProject(),
      warning: 'Saved project could not be restored. Import a project backup to recover it.',
    };
  }
}
