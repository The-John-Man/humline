export const ANALYSIS_RATE = 22050;
/** Downmix and windowed-sinc resample an analysis copy, preserving source channels. */
export function preparePCM(
  channels: Float32Array[],
  sampleRate: number,
): Float32Array<ArrayBuffer> {
  const mono = new Float32Array(channels[0].length);
  for (const channel of channels)
    for (let i = 0; i < mono.length; i++) mono[i] += channel[i] / channels.length;
  if (sampleRate === ANALYSIS_RATE) return mono;
  const out = new Float32Array(Math.round((mono.length * ANALYSIS_RATE) / sampleRate));
  const ratio = sampleRate / ANALYSIS_RATE;
  const cutoff = Math.min(1, 1 / ratio);
  const radius = 16;
  for (let i = 0; i < out.length; i++) {
    const at = i * ratio;
    let sum = 0;
    let weight = 0;
    for (let j = Math.ceil(at - radius); j <= Math.floor(at + radius); j++) {
      if (j < 0 || j >= mono.length) continue;
      const d = at - j;
      const x = Math.PI * d * cutoff;
      const w =
        (Math.abs(x) < 1e-8 ? 1 : Math.sin(x) / x) * (0.5 + 0.5 * Math.cos((Math.PI * d) / radius));
      sum += mono[j] * w;
      weight += w;
    }
    out[i] = weight ? sum / weight : 0;
  }
  return out;
}
