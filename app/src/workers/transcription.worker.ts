import type { AnalysisRequest } from '../types/project';
import { detectFrames } from '../audio/detector';
import { segmentFrames } from '../audio/segment';
import { preparePCM, ANALYSIS_RATE } from '../audio/pcm';
self.onmessage = (event: MessageEvent<AnalysisRequest>) => {
  const { jobId, channels, sampleRate } = event.data;
  try {
    const samples = preparePCM(channels, sampleRate);
    const frames = detectFrames(samples, ANALYSIS_RATE, (completedFrames, totalFrames) =>
      self.postMessage({ jobId, type: 'progress', completedFrames, totalFrames }),
    );
    self.postMessage({ jobId, type: 'complete', events: segmentFrames(frames) });
  } catch (e) {
    self.postMessage({
      jobId,
      type: 'error',
      message: e instanceof Error ? e.message : 'Could not analyse this recording.',
    });
  }
};
