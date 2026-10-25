import { PitchDetector } from 'pitchy';
import type { PitchFrame } from '../types/project';
export function detectFrames(
  samples: Float32Array,
  sampleRate: number,
  progress: (done: number, total: number) => void = () => {},
): PitchFrame[] {
  const size = 2048,
    hop = 256;
  const detector = PitchDetector.forFloat32Array(size);
  const frame = new Float32Array(size);
  const frames: PitchFrame[] = [];
  const count = Math.ceil(samples.length / hop);
  for (let i = 0; i < count; i++) {
    // Centred windows keep frame timestamps aligned to the source, including leading silence.
    const start = i * hop - size / 2;
    let mean = 0;
    for (let j = 0; j < size; j++) {
      frame[j] = samples[start + j] ?? 0;
      mean += frame[j];
    }
    mean /= size;
    let energy = 0;
    for (let j = 0; j < size; j++) {
      frame[j] -= mean;
      energy += frame[j] ** 2;
    }
    const rms = Math.sqrt(energy / size);
    const [hz, clarity] = rms >= 0.004 ? detector.findPitch(frame, sampleRate) : [0, 0];
    frames.push({
      timeSeconds: (i * hop) / sampleRate,
      hz: hz >= 65 && hz <= 1200 && clarity >= 0.85 ? hz : null,
      clarity: Math.min(1, clarity),
      rms,
    });
    if (i % 32 === 0 || i === count - 1) progress(i + 1, count);
  }
  return frames;
}
