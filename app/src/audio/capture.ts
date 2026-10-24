export function microphoneError(e: unknown): string {
  const name = e instanceof DOMException ? e.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Microphone access was denied. Allow it in your browser’s site settings and retry, or import audio.';
  if (name === 'NotFoundError')
    return 'No microphone found. Connect a microphone and retry, or import audio.';
  if (name === 'NotReadableError')
    return 'Your microphone is busy or unavailable. Close other recording apps and retry.';
  if (name === 'NotSupportedError')
    return 'This browser cannot record audio with the available microphone format. Try current Chrome or Edge, or import audio.';
  return e instanceof Error && e.message.trim()
    ? e.message
    : 'Recording failed. Try again or import audio.';
}
export class Capture {
  private recorder?: MediaRecorder;
  private stream?: MediaStream;
  private source?: MediaStreamAudioSourceNode;
  private analyser?: AnalyserNode;
  private timer?: ReturnType<typeof setTimeout>;
  private raf = 0;
  private cancelled = false;
  private finished = false;
  async start(
    context: AudioContext,
    onStart: () => void,
    onMeter: (seconds: number, level: number) => void,
    onDone: (blob: Blob) => void,
    onError: (e: unknown) => void,
  ) {
    if (!window.isSecureContext)
      throw new Error('Recording needs HTTPS or localhost. You can still import audio.');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined')
      throw new Error(
        'This browser cannot record audio. Try current Chrome or Edge, or import audio.',
      );
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      if (this.cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ].find((t) => MediaRecorder.isTypeSupported(t));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      this.recorder = recorder;
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onerror = () => {
        this.cancelled = true;
        this.release();
        onError(new Error('The microphone stopped unexpectedly. Please try again.'));
      };
      recorder.onstop = () => {
        this.release();
        if (!this.cancelled && !this.finished) {
          this.finished = true;
          onDone(new Blob(chunks, { type: recorder.mimeType }));
        }
      };
      this.source = context.createMediaStreamSource(stream);
      this.analyser = context.createAnalyser();
      this.analyser.fftSize = 512;
      this.source.connect(this.analyser); // Deliberately no connection to speakers.
      const data = new Float32Array(512);
      const started = performance.now();
      const meter = () => {
        this.analyser?.getFloatTimeDomainData(data);
        onMeter(
          Math.min(20, (performance.now() - started) / 1000),
          Math.sqrt(data.reduce((s, x) => s + x * x, 0) / data.length),
        );
        this.raf = requestAnimationFrame(meter);
      };
      recorder.start(100);
      onStart();
      meter();
      this.timer = setTimeout(() => this.stop(), 20_000);
    } catch (e) {
      this.release();
      if (!this.cancelled) throw e;
    }
  }
  stop() {
    if (this.recorder?.state === 'recording') this.recorder.stop();
    this.release();
  }
  cancel() {
    this.cancelled = true;
    this.stop();
  }
  private release() {
    clearTimeout(this.timer);
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.source?.disconnect();
    this.analyser?.disconnect();
  }
}
