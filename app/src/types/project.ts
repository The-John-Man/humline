// Canonical project contract: all editable timing uses quarter-note beats.
export type InstrumentId = 'keys' | 'pluck' | 'pad';
export interface MelodyNote {
  id: string;
  midi: number; // integer 0..127
  startBeat: number; // quarter-note beats, >= 0
  durationBeats: number; // > 0
  velocity: number; // 0..1
  source: 'detected' | 'manual';
  needsReview?: boolean;
  clarity?: number; // detector measure, NOT calibrated probability
}
export interface HumlineProject {
  schemaVersion: 1;
  id: string;
  title: string;
  bpm: number;
  transcriptionBpm: number;
  instrument: InstrumentId;
  notes: MelodyNote[];
  sourceAudio?: { name: string; durationSeconds: number; synthetic: boolean };
}
export interface PitchFrame {
  timeSeconds: number;
  hz: number | null;
  clarity: number;
  rms: number;
}
export interface DetectedEvent {
  midi: number;
  startSeconds: number;
  durationSeconds: number;
  clarity: number;
  needsReview: boolean;
}
export interface AnalysisRequest {
  jobId: number;
  channels: Float32Array[];
  sampleRate: number;
}
export type AnalysisResponse =
  | { jobId: number; type: 'progress'; completedFrames: number; totalFrames: number }
  | { jobId: number; type: 'complete'; events: DetectedEvent[] }
  | { jobId: number; type: 'error'; message: string };
