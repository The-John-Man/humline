import { afterEach, describe, expect, it, vi } from 'vitest';
import { Transcriber } from '../src/audio/transcription';
import { Capture } from '../src/audio/capture';
import { decodeAudio, MAX_BYTES } from '../src/audio/decode';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe('concurrent audio lifecycle', () => {
  it('ignores late job A after cancellation and completion of job B', () => {
    const workers: any[] = [];
    class FakeWorker {
      onmessage: any;
      onerror: any;
      terminate = vi.fn();
      postMessage = vi.fn();
      constructor() {
        workers.push(this);
      }
    }
    vi.stubGlobal('Worker', FakeWorker);
    const buffer = {
      numberOfChannels: 1,
      sampleRate: 22050,
      getChannelData: () => new Float32Array(4096),
    } as AudioBuffer;
    const t = new Transcriber();
    const a = vi.fn(),
      b = vi.fn();
    t.run(buffer, vi.fn(), a, vi.fn());
    const jobA = workers[0].postMessage.mock.calls[0][0].jobId;
    t.cancel();
    t.run(buffer, vi.fn(), b, vi.fn());
    const jobB = workers[1].postMessage.mock.calls[0][0].jobId;
    workers[1].onmessage({ data: { type: 'complete', jobId: jobB, events: [{ midi: 64 }] } });
    workers[0].onmessage({ data: { type: 'complete', jobId: jobA, events: [{ midi: 57 }] } });
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledExactlyOnceWith([{ midi: 64 }]);
    expect(workers[0].terminate).toHaveBeenCalled();
  });
  it('releases a permission-granted stream that arrives after Cancel', async () => {
    let resolve!: (s: any) => void;
    const stop = vi.fn();
    vi.stubGlobal('window', { isSecureContext: true });
    vi.stubGlobal('MediaRecorder', class {});
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: () =>
          new Promise((r) => {
            resolve = r;
          }),
      },
    });
    const c = new Capture();
    const started = vi.fn();
    const pending = c.start({} as AudioContext, started, vi.fn(), vi.fn(), vi.fn());
    c.cancel();
    resolve({ getTracks: () => [{ stop }] });
    await pending;
    expect(stop).toHaveBeenCalledTimes(1);
    expect(started).not.toHaveBeenCalled();
  });
  it('cleans up media tracks when recorder construction fails', async () => {
    const stop = vi.fn();
    vi.stubGlobal('window', { isSecureContext: true });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop }] }) },
    });
    vi.stubGlobal(
      'MediaRecorder',
      class {
        static isTypeSupported() {
          return true;
        }
        constructor() {
          throw new Error('device failure');
        }
      },
    );
    await expect(
      new Capture().start({} as AudioContext, vi.fn(), vi.fn(), vi.fn(), vi.fn()),
    ).rejects.toThrow('device failure');
    expect(stop).toHaveBeenCalled();
  });
});
describe('decode boundaries', () => {
  it('rejects oversize files before attempting to decode', async () => {
    const decodeAudioData = vi.fn();
    await expect(
      decodeAudio({ size: MAX_BYTES + 1 } as Blob, { decodeAudioData } as unknown as AudioContext),
    ).rejects.toThrow('20 MB');
    expect(decodeAudioData).not.toHaveBeenCalled();
  });
  it.each([0.1, 21])('rejects decoded duration %s seconds', async (duration) => {
    const context = { decodeAudioData: async () => ({ duration }) } as unknown as AudioContext;
    await expect(decodeAudio(new Blob(['not empty']), context)).rejects.toThrow(
      duration < 1 ? 'too short' : 'longer than 20',
    );
  });
});
