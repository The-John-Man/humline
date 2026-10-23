export const MAX_BYTES = 20 * 1024 * 1024;
export async function decodeAudio(
  blob: Blob,
  context: AudioContext,
  recording = false,
): Promise<AudioBuffer> {
  if (blob.size > MAX_BYTES)
    throw new Error('This file is over 20 MB. Import a smaller recording.');
  if (!blob.size) throw new Error('This recording is empty. Please record again.');
  let buffer: AudioBuffer;
  try {
    buffer = await context.decodeAudioData(await blob.arrayBuffer());
  } catch {
    throw new Error(
      'This audio format could not be read. Try a WAV, MP3, or supported browser recording.',
    );
  }
  if (buffer.duration < 0.15)
    throw new Error('This clip is too short. Try at least a second of steady humming.');
  if (buffer.duration > (recording ? 20.5 : 20.001))
    throw new Error('This clip is longer than 20 seconds. Trim it and import again.');
  if (recording && buffer.duration > 20) {
    const trimmed = context.createBuffer(
      buffer.numberOfChannels,
      Math.floor(20 * buffer.sampleRate),
      buffer.sampleRate,
    );
    for (let c = 0; c < buffer.numberOfChannels; c++)
      trimmed.copyToChannel(buffer.getChannelData(c).subarray(0, trimmed.length), c);
    return trimmed;
  }
  return buffer;
}
export function waveform(buffer: AudioBuffer, bins = 110): number[] {
  const data = buffer.getChannelData(0);
  return Array.from({ length: bins }, (_, i) => {
    const begin = Math.floor((i * data.length) / bins),
      end = Math.floor(((i + 1) * data.length) / bins);
    let peak = 0;
    for (let j = begin; j < end; j++) peak = Math.max(peak, Math.abs(data[j]));
    return peak;
  });
}
