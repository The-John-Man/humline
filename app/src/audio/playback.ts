import type { HumlineProject, InstrumentId, MelodyNote } from '../types/project';
import { beatsToSeconds, midiToHz } from '../music/pitch';
type Voice = { oscillators: OscillatorNode[]; gain: GainNode; filter: BiquadFilterNode };
export class AudioEngine {
  context?: AudioContext;
  private master?: GainNode;
  private voices = new Set<Voice>();
  private source?: AudioBufferSourceNode;
  private timer?: ReturnType<typeof setInterval>;
  private origin = 0;
  private offset = 0;
  private length = 0;
  private bpm = 100;
  /** Linear 0–1 control; multiplied by MASTER for audible headroom without clipping easily. */
  private volume = 0.8;
  private static readonly MASTER = 0.85;
  private commandVersion = 0;
  playing = false;
  mode: 'instrument' | 'original' = 'instrument';
  async ensure() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.volume * AudioEngine.MASTER;
      const compressor = this.context.createDynamicsCompressor();
      this.master.connect(compressor);
      compressor.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') await this.context.resume();
    return this.context;
  }
  setVolume(value: number) {
    this.volume = value;
    if (this.master && this.context)
      this.master.gain.setTargetAtTime(
        value * AudioEngine.MASTER,
        this.context.currentTime,
        0.015,
      );
  }
  private voice(
    midi: number,
    start: number,
    duration: number,
    velocity: number,
    preset: InstrumentId,
  ) {
    const ctx = this.context!;
    const gain = ctx.createGain(),
      filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = preset === 'pluck' ? 2600 : preset === 'pad' ? 1700 : 5000;
    gain.connect(filter);
    filter.connect(this.master!);
    const attack = Math.min(duration / 3, preset === 'pad' ? 0.16 : 0.008);
    const level = Math.max(0.0001, velocity * (preset === 'pad' ? 0.35 : 0.55));
    const release = preset === 'pad' ? 0.25 : 0.1;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + attack);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, level * (preset === 'pluck' ? 0.05 : preset === 'keys' ? 0.2 : 0.8)),
      start + duration,
    );
    gain.gain.linearRampToValueAtTime(0, start + duration + release);
    const oscillators = (preset === 'keys' ? [1, 2] : preset === 'pad' ? [1, 1.003] : [1]).map(
      (harmonic, i) => {
        const osc = ctx.createOscillator();
        osc.type = preset === 'keys' ? 'sine' : preset === 'pluck' ? 'triangle' : 'sawtooth';
        osc.frequency.value = midiToHz(midi) * harmonic;
        const mix = ctx.createGain();
        mix.gain.value = i === 0 ? 0.8 : 0.2;
        osc.connect(mix);
        mix.connect(gain);
        osc.start(start);
        osc.stop(start + duration + release + 0.01);
        osc.onended = () => {
          osc.disconnect();
          mix.disconnect();
        };
        return osc;
      },
    );
    const v = { oscillators, gain, filter };
    this.voices.add(v);
    oscillators.at(-1)!.addEventListener('ended', () => {
      gain.disconnect();
      filter.disconnect();
      this.voices.delete(v);
    });
  }
  async audition(note: MelodyNote, instrument: InstrumentId) {
    const version = ++this.commandVersion;
    await this.ensure();
    if (version !== this.commandVersion) return;
    this.clearVoices();
    this.voice(note.midi, this.context!.currentTime + 0.01, 0.3, note.velocity, instrument);
  }
  async play(project: HumlineProject, startBeat: number) {
    const version = ++this.commandVersion;
    const ctx = await this.ensure();
    if (version !== this.commandVersion) return;
    this.stop();
    this.mode = 'instrument';
    this.bpm = project.bpm;
    this.offset = beatsToSeconds(startBeat, project.bpm);
    this.length = Math.max(
      ...project.notes.map((n) => beatsToSeconds(n.startBeat + n.durationBeats, project.bpm)),
      0,
    );
    if (this.offset >= this.length) this.offset = 0;
    this.origin = ctx.currentTime + 0.03;
    this.playing = true;
    const notes = [...project.notes].sort((a, b) => a.startBeat - b.startBeat);
    let index = 0;
    const schedule = () => {
      const elapsed = this.seconds();
      while (
        index < notes.length &&
        beatsToSeconds(notes[index].startBeat, project.bpm) <= elapsed + 0.18
      ) {
        const n = notes[index++];
        const start = beatsToSeconds(n.startBeat, project.bpm),
          end = beatsToSeconds(n.startBeat + n.durationBeats, project.bpm);
        if (end <= this.offset) continue;
        const at = Math.max(ctx.currentTime + 0.005, this.origin + start - this.offset);
        const duration = end - Math.max(start, this.offset);
        this.voice(n.midi, at, duration, n.velocity, project.instrument);
      }
      if (elapsed >= this.length + 0.3) {
        this.playing = false;
        clearInterval(this.timer);
      }
    };
    schedule();
    this.timer = setInterval(schedule, 50);
  }
  async playOriginal(buffer: AudioBuffer) {
    const version = ++this.commandVersion;
    const ctx = await this.ensure();
    if (version !== this.commandVersion) return;
    this.stop();
    this.mode = 'original';
    this.playing = true;
    this.offset = 0;
    this.origin = ctx.currentTime;
    this.length = buffer.duration;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.master!);
    this.source = source;
    source.onended = () => {
      if (this.source === source) {
        this.playing = false;
        source.disconnect();
        this.source = undefined;
      }
    };
    source.start();
  }
  seconds() {
    return this.offset + Math.max(0, (this.context?.currentTime ?? 0) - this.origin);
  }
  beat() {
    return (Math.min(this.length, this.seconds()) * this.bpm) / 60;
  }
  pause() {
    const beat = this.beat();
    this.stop();
    return beat;
  }
  private clearVoices() {
    for (const v of this.voices) {
      for (const osc of v.oscillators) {
        try {
          osc.stop();
        } catch {
          /* Already stopped. */
        }
      }
      v.gain.disconnect();
      v.filter.disconnect();
    }
    this.voices.clear();
  }
  stop() {
    this.commandVersion++;
    clearInterval(this.timer);
    this.playing = false;
    if (this.source) {
      this.source.onended = null;
      try {
        this.source.stop();
      } catch {
        /* Already ended. */
      }
      this.source.disconnect();
      this.source = undefined;
    }
    this.clearVoices();
  }
  dispose() {
    this.stop();
    void this.context?.close();
  }
}
