import type { HumlineProject } from '../types/project';

export interface CloudMelody {
  id: string;
  project: HumlineProject;
  revision: number;
  updatedAt: string;
}
export interface MelodySummary {
  id: string;
  title: string;
  bpm: number;
  instrument: HumlineProject['instrument'];
  updatedAt: string;
}
// Explicit allowlist: original recording metadata and any future local fields stay local.
export function cloudProject(project: HumlineProject): HumlineProject {
  return {
    schemaVersion: project.schemaVersion,
    id: project.id,
    title: project.title,
    bpm: project.bpm,
    transcriptionBpm: project.transcriptionBpm,
    instrument: project.instrument,
    notes: project.notes,
  };
}
export const projectFingerprint = (project: HumlineProject) =>
  JSON.stringify({ ...cloudProject(project), id: '' });
