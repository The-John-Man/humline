import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import { detectFrames } from '../src/audio/detector';
import { segmentFrames } from '../src/audio/segment';
import { preparePCM, ANALYSIS_RATE } from '../src/audio/pcm';
import { hzToMidi } from '../src/music/pitch';
import expected from '../../humline-build-context/fixtures/expected-events.json';
const report: object[] = [];
afterAll(() => {
  mkdirSync('../release', { recursive: true });
  writeFileSync('../release/fixture-results.json', JSON.stringify(report, null, 2));
});
function wav(name: string) {
  const b = readFileSync(new URL(`../../humline-build-context/fixtures/${name}`, import.meta.url));
  const channels = b.readUInt16LE(22),
    rate = b.readUInt32LE(24);
  let offset = 12;
  let size = 0;
  while (offset < b.length) {
    const length = b.readUInt32LE(offset + 4);
    if (b.toString('ascii', offset, offset + 4) === 'data') {
      size = length;
      offset += 8;
      break;
    }
    offset += 8 + length + (length % 2);
  }
  const pcm = Array.from({ length: channels }, () => new Float32Array(size / 2 / channels));
  for (let i = 0; i < pcm[0].length; i++)
    for (let c = 0; c < channels; c++)
      pcm[c][i] = b.readInt16LE(offset + (i * channels + c) * 2) / 32768;
  return { pcm, rate };
}
describe('actual fixture audio → resampling → pitch detection → segmentation', () => {
  it('maps A440 exactly', () => expect(hzToMidi(440)).toBe(69));
  for (const fixture of expected.fixtures)
    it(fixture.file, () => {
      const { pcm, rate } = wav(fixture.file);
      const start = performance.now();
      const samples = preparePCM(pcm, rate);
      const events = segmentFrames(detectFrames(samples, ANALYSIS_RATE));
      report.push({
        file: fixture.file,
        elapsedMs: +(performance.now() - start).toFixed(1),
        events: events.map((e, i) => ({
          midi: e.midi,
          start: +e.startSeconds.toFixed(4),
          end: +(e.startSeconds + e.durationSeconds).toFixed(4),
          onsetErrorMs: +(
            Math.abs(e.startSeconds - (fixture.events[i]?.startSeconds ?? 0)) * 1000
          ).toFixed(1),
          endErrorMs: +(
            Math.abs(
              e.startSeconds +
                e.durationSeconds -
                (fixture.events[i]?.startSeconds ?? 0) -
                (fixture.events[i]?.durationSeconds ?? 0),
            ) * 1000
          ).toFixed(1),
        })),
      });
      expect(events).toHaveLength(fixture.events.length);
      events.forEach((event, i) => {
        const truth = fixture.events[i];
        expect(event.midi).toBe(truth.midi);
        expect(Math.abs(event.startSeconds - truth.startSeconds)).toBeLessThanOrEqual(0.1);
        expect(
          Math.abs(
            event.startSeconds + event.durationSeconds - truth.startSeconds - truth.durationSeconds,
          ),
        ).toBeLessThanOrEqual(0.1);
      });
    });
});
