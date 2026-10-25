import type { AnalysisResponse, DetectedEvent } from '../types/project';
export class Transcriber {
  private worker?: Worker;
  private jobId = 0;
  cancel() {
    this.jobId++;
    this.worker?.terminate();
    this.worker = undefined;
  }
  run(
    buffer: AudioBuffer,
    progress: (percent: number) => void,
    done: (events: DetectedEvent[]) => void,
    fail: (message: string) => void,
  ) {
    this.cancel();
    const jobId = this.jobId;
    const worker = new Worker(new URL('../workers/transcription.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker = worker;
    worker.onmessage = ({ data }: MessageEvent<AnalysisResponse>) => {
      if (data.jobId !== this.jobId) return;
      if (data.type === 'progress')
        progress(Math.round((data.completedFrames / data.totalFrames) * 100));
      else {
        worker.terminate();
        this.worker = undefined;
        if (data.type === 'complete') done(data.events);
        else fail(data.message);
      }
    };
    worker.onerror = () => {
      if (jobId === this.jobId) {
        this.cancel();
        fail('Conversion could not finish. Try importing a shorter WAV.');
      }
    };
    const channels = Array.from(
      { length: buffer.numberOfChannels },
      (_, c) => new Float32Array(buffer.getChannelData(c)),
    );
    worker.postMessage(
      { jobId, channels, sampleRate: buffer.sampleRate },
      channels.map((c) => c.buffer),
    );
  }
}
