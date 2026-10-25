import type { DetectedEvent, PitchFrame } from '../types/project';
import { hzToMidi } from '../music/pitch';
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
export function segmentFrames(frames: PitchFrame[]): DetectedEvent[] {
  if (frames.length < 2) return [];
  const hop = frames[1].timeSeconds - frames[0].timeSeconds;
  const events: DetectedEvent[] = [];
  let active: PitchFrame[] = [];
  let pending: PitchFrame[] = [];
  let gap = 0;
  const flush = () => {
    if (!active.length) return;
    const pitches = active.map((f) => hzToMidi(f.hz!));
    const pitch = median(pitches);
    const startSeconds = active[0].timeSeconds;
    const durationSeconds = active.at(-1)!.timeSeconds + hop - startSeconds;
    const clarity = active.reduce((s, f) => s + f.clarity, 0) / active.length;
    if (durationSeconds >= 0.09 && active.length * hop >= 0.07)
      events.push({
        midi: Math.round(pitch),
        startSeconds,
        durationSeconds,
        clarity,
        needsReview: clarity < 0.94 || pitches.some((p) => Math.abs(p - pitch) > 0.65),
      });
    active = [];
    pending = [];
  };
  for (const frame of frames) {
    if (frame.hz === null) {
      gap += hop;
      if (gap >= 0.07) {
        flush();
        pending = [];
      }
      continue;
    }
    gap = 0;
    if (!active.length) {
      active.push(frame);
      continue;
    }
    const reference = median(active.slice(-9).map((f) => hzToMidi(f.hz!)));
    // Hysteresis keeps normal vibrato together; a new pitch must persist ~70ms.
    if (Math.abs(hzToMidi(frame.hz) - reference) > 0.7) {
      if (pending.length && Math.abs(hzToMidi(frame.hz) - hzToMidi(pending[0].hz!)) > 0.7)
        pending = [];
      pending.push(frame);
      if (pending.length * hop >= 0.07) {
        const next = pending;
        flush();
        active = next;
      }
    } else {
      active.push(...pending, frame);
      pending = [];
    }
  }
  flush();
  return events;
}
