import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AudioLines,
  Mic,
  Upload,
  Sparkles,
  ArrowRight,
  Play,
  Pause,
  Square,
  Download,
  Undo2,
  Redo2,
  Volume2,
  ShieldCheck,
  Headphones,
  X,
  Check,
  FolderOpen,
  Save,
  Info,
  Piano,
  Guitar,
  Waves,
  ChevronRight,
  LoaderCircle,
} from 'lucide-react';
import type { HumlineProject, MelodyNote } from './types/project';
import { AudioEngine } from './audio/playback';
import { Capture, microphoneError } from './audio/capture';
import { decodeAudio, waveform, MAX_BYTES } from './audio/decode';
import { Transcriber } from './audio/transcription';
import {
  commit,
  redo,
  restore,
  STORAGE_KEY,
  undo,
  parseProject,
  type History,
} from './state/project';
import { download, exportMidi } from './music/midi';
import { PianoRoll } from './components/PianoRoll';
import { NumberField } from './components/NumberField';
import { NoteInspector } from './components/NoteInspector';
import { Waveform } from './components/Waveform';
import './styles/studio.css';
type Status =
  | 'idle'
  | 'requesting-microphone'
  | 'recording'
  | 'decoding'
  | 'recorded'
  | 'analysing'
  | 'ready'
  | 'error';
type Source = { buffer: AudioBuffer; name: string; synthetic: boolean; peaks: number[] };
type Confirm = { title: string; message: string; label: string; action: () => void };
const formatTime = (s: number) =>
  `${Math.floor(s / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(s % 60)
    .toString()
    .padStart(2, '0')}`;
function ConfirmDialog({ value, onClose }: { value: Confirm; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} className="confirm-dialog" onCancel={onClose} aria-labelledby="confirm-title">
      <h2 id="confirm-title">{value.title}</h2>
      <p>{value.message}</p>
      <div>
        <button autoFocus onClick={onClose}>
          Keep current melody
        </button>
        <button
          className="primary"
          onClick={() => {
            onClose();
            value.action();
          }}
        >
          {value.label}
        </button>
      </div>
    </dialog>
  );
}
export default function App({
  initialProject,
  storageKey = STORAGE_KEY,
  onProjectChange,
  cloudToolbar,
}: {
  initialProject?: HumlineProject;
  storageKey?: string | null;
  onProjectChange?: (project: HumlineProject) => void;
  cloudToolbar?: ReactNode;
}) {
  const [initial] = useState(() =>
    initialProject
      ? { project: initialProject, warning: undefined }
      : restore(storageKey ?? undefined),
  );
  const [history, setHistory] = useState<History>({
    past: [],
    present: initial.project,
    future: [],
  });
  const project = history.present;
  const [status, setStatus] = useState<Status>(project.notes.length ? 'ready' : 'idle');
  const [source, setSource] = useState<Source | null>(null);
  const appliedSource = useRef<Source | null>(null);
  const sessionSources = useRef(new WeakMap<object, Source>());
  const [selected, setSelected] = useState<string | null>(null);
  const [snap, setSnap] = useState(true);
  const [message, setMessage] = useState(initial.warning ?? '');
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(true);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [transport, setTransport] = useState<'stopped' | 'playing' | 'paused'>('stopped');
  const [mode, setMode] = useState<'instrument' | 'original'>('instrument');
  const [playhead, setPlayhead] = useState(0);
  const [originalProgress, setOriginalProgress] = useState(0);
  const [volume, setVolume] = useState(80);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [about, setAbout] = useState(false);
  const [engine] = useState(() => new AudioEngine());
  const [transcriber] = useState(() => new Transcriber());
  const capture = useRef<Capture | null>(null);
  const operation = useRef(0);
  const audioInput = useRef<HTMLInputElement>(null),
    projectInput = useRef<HTMLInputElement>(null);
  const locked = ['requesting-microphone', 'recording', 'decoding', 'analysing'].includes(status);
  const note = project.notes.find((n) => n.id === selected);
  const notify = (text: string, isError = false) => {
    setMessage(text);
    setError(isError);
  };
  const fail = (text: string) => {
    setStatus('error');
    setLevel(0);
    notify(text, true);
  };
  const stop = (reset = true) => {
    engine.stop();
    setTransport('stopped');
    setOriginalProgress(0);
    if (reset) setPlayhead(0);
  };
  const updateProject = (next: HumlineProject) => {
    stop(false);
    setHistory((h) => commit(h, next));
  };
  const edit = (n: MelodyNote) => {
    if (JSON.stringify(n) !== JSON.stringify(project.notes.find((old) => old.id === n.id)))
      updateProject({ ...project, notes: project.notes.map((old) => (old.id === n.id ? n : old)) });
  };
  const remove = (id: string) => {
    updateProject({ ...project, notes: project.notes.filter((n) => n.id !== id) });
    setSelected(null);
  };
  const historyAction = (direction: 'undo' | 'redo') => {
    stop();
    const next = direction === 'undo' ? undo(history) : redo(history);
    if (next.present.sourceAudio !== project.sourceAudio) {
      const restoredSource = next.present.sourceAudio
        ? (sessionSources.current.get(next.present.sourceAudio) ?? null)
        : null;
      setSource(restoredSource);
      appliedSource.current = restoredSource;
    }
    setHistory(next);
    setSelected(null);
  };
  useEffect(() => {
    onProjectChange?.(project);
    if (storageKey === null) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(project));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [project, storageKey, onProjectChange]);
  useEffect(
    () => () => {
      operation.current++;
      capture.current?.cancel();
      transcriber.cancel();
      engine.dispose();
    },
    [engine, transcriber],
  );
  useEffect(() => {
    if (transport !== 'playing') return;
    let frame = 0;
    const tick = () => {
      if (!engine.playing) {
        setTransport('stopped');
        if (mode === 'instrument') setPlayhead(0);
        else setOriginalProgress(0);
        return;
      }
      if (mode === 'instrument') setPlayhead(engine.beat());
      else setOriginalProgress(engine.seconds() / (source?.buffer.duration ?? 1));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [transport, engine, mode, source]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.defaultPrevented ||
        locked ||
        confirm ||
        about ||
        (e.target as HTMLElement).closest('input, select, textarea')
      )
        return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        historyAction(e.shiftKey ? 'redo' : 'undo');
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault();
        remove(selected);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  async function loadAudio(blob: Blob, name: string, synthetic = false, recording = false) {
    const id = ++operation.current;
    stop();
    setLevel(0);
    setStatus('decoding');
    notify('');
    try {
      if (blob.size > MAX_BYTES)
        throw new Error('This file is over 20 MB. Import a smaller recording.');
      const context = await engine.ensure();
      const buffer = await decodeAudio(blob, context, recording);
      if (id !== operation.current) return;
      setSource({ buffer, name, synthetic, peaks: waveform(buffer) });
      setStatus('recorded');
      notify(
        synthetic
          ? 'Synthetic example loaded. Convert it to find the notes.'
          : 'Recording ready. Listen back, then convert to notes.',
      );
    } catch (e) {
      if (id === operation.current) fail(e instanceof Error ? e.message : 'Could not load audio.');
    }
  }
  async function example() {
    const id = ++operation.current;
    stop();
    setLevel(0);
    setStatus('decoding');
    notify('');
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}examples/synthetic-melody.wav`);
      if (!response.ok) throw new Error('The example could not load. Please import a WAV instead.');
      const blob = await response.blob();
      if (id === operation.current) await loadAudio(blob, 'A little daydream · synthetic', true);
    } catch (e) {
      if (id === operation.current)
        fail(e instanceof Error ? e.message : 'Could not load the example.');
    }
  }
  async function record() {
    stop();
    transcriber.cancel();
    const id = ++operation.current;
    setStatus('requesting-microphone');
    setElapsed(0);
    setLevel(0);
    notify('');
    const session = new Capture();
    capture.current = session;
    try {
      const context = await engine.ensure();
      if (id !== operation.current) return;
      await session.start(
        context,
        () => {
          if (id === operation.current) setStatus('recording');
        },
        (time, rms) => {
          if (id === operation.current) {
            setElapsed(time);
            setLevel(rms);
          }
        },
        (blob) => {
          if (id === operation.current) void loadAudio(blob, 'My recording', false, true);
        },
        (e) => {
          if (id === operation.current) fail(microphoneError(e));
        },
      );
    } catch (e) {
      if (id === operation.current) fail(microphoneError(e));
    }
  }
  function cancelOperation() {
    operation.current++;
    capture.current?.cancel();
    transcriber.cancel();
    setLevel(0);
    stop();
    setStatus(source ? 'recorded' : project.notes.length ? 'ready' : 'idle');
    notify('Cancelled. Your melody is unchanged.');
  }
  function convert() {
    if (!source) return;
    const run = () => {
      stop();
      setStatus('analysing');
      setProgress(0);
      notify('');
      const atBpm = project.bpm;
      transcriber.run(
        source.buffer,
        setProgress,
        (events) => {
          if (!events.length) {
            setStatus('recorded');
            notify(
              'No steady pitches found. Try a clearer, louder single-voice melody. Any existing notes have been kept.',
              true,
            );
            return;
          }
          const notes: MelodyNote[] = events.map((e) => ({
            id: crypto.randomUUID(),
            midi: e.midi,
            startBeat: (e.startSeconds * atBpm) / 60,
            durationBeats: (e.durationSeconds * atBpm) / 60,
            velocity: 0.75,
            source: 'detected',
            clarity: e.clarity,
            needsReview: e.needsReview,
          }));
          appliedSource.current = source;
          const next = {
            ...project,
            transcriptionBpm: atBpm,
            notes,
            sourceAudio: {
              name: source.name,
              durationSeconds: source.buffer.duration,
              synthetic: source.synthetic,
            },
          };
          sessionSources.current.set(next.sourceAudio, source);
          setHistory((h) => commit(h, next));
          setSelected(null);
          setStatus('ready');
          notify(`${notes.length} notes found. Listen, make a few edits, and make it yours.`);
        },
        fail,
      );
    };
    if (project.notes.length)
      setConfirm({
        title: 'Replace these notes?',
        message:
          'Convert this recording into a new melody. Your current edits will stay available in Undo.',
        label: 'Replace & convert',
        action: run,
      });
    else run();
  }
  async function play() {
    if (transport === 'playing' && mode === 'instrument') {
      setPlayhead(engine.pause());
      setTransport('paused');
      return;
    }
    try {
      setMode('instrument');
      await engine.play(project, playhead);
      setTransport('playing');
    } catch {
      fail('Audio playback could not start. Check your browser audio settings and retry.');
    }
  }
  async function original() {
    if (!source) return;
    if (transport === 'playing' && mode === 'original') {
      stop();
      return;
    }
    try {
      setMode('original');
      await engine.playOriginal(source.buffer);
      setTransport('playing');
    } catch {
      fail('Original audio could not play. Try importing it again.');
    }
  }
  async function importProject(file: File) {
    const id = ++operation.current;
    try {
      if (file.size > 2_000_000)
        throw new Error('Project is over 2 MB. Choose a smaller project JSON.');
      const p = parseProject(await file.text());
      if (id !== operation.current) return;
      const action = () => {
        operation.current++;
        transcriber.cancel();
        stop();
        // Opening a file is a replacement even when its notes are identical:
        // Undo must also be able to recover the prior session audio association.
        setHistory((h) => commit(h, p, true));
        setSource(null);
        appliedSource.current = null;
        setSelected(null);
        setStatus(p.notes.length ? 'ready' : 'idle');
        notify('Project imported. Original audio is not included in project files.');
      };
      if (project.notes.length)
        setConfirm({
          title: 'Open another project?',
          message:
            'This replaces your current melody. You can recover your current notes with Undo.',
          label: 'Open project',
          action,
        });
      else action();
    } catch (e) {
      if (id === operation.current)
        notify(e instanceof Error ? e.message : 'Invalid project JSON.', true);
    }
  }
  return (
    <div className="app-shell">
      {cloudToolbar}
      <header className="topbar">
        <a className="brand" href={cloudToolbar ? undefined : '/'} aria-label="Humline home">
          <span className="brand-icon">
            <AudioLines size={24} />
          </span>
          <span>
            humline<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="project-title">
          <input
            aria-label="Project title"
            value={project.title}
            maxLength={100}
            disabled={locked}
            onChange={(e) => updateProject({ ...project, title: e.target.value })}
          />
          <span className={saved ? '' : 'save-warning'}>
            {saved ? <Check size={12} /> : <Info size={12} />}{' '}
            {cloudToolbar
              ? 'Cloud save status above'
              : saved
                ? 'Saved on this device'
                : 'Local save unavailable · download JSON'}
          </span>
        </div>
        <div className="header-actions">
          <button
            className="icon-button"
            title="Open project JSON"
            aria-label="Open project JSON"
            disabled={locked}
            onClick={() => projectInput.current?.click()}
          >
            <FolderOpen size={18} />
          </button>
          <button
            className="icon-button"
            title="Save project JSON"
            aria-label="Save project JSON"
            disabled={locked}
            onClick={() =>
              download(
                new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }),
                project.title,
                'json',
              )
            }
          >
            <Save size={18} />
          </button>
          <button
            className="primary export-button"
            title="Download a .mid file for GarageBand, Logic, Ableton, FL Studio, and other DAWs"
            disabled={!project.notes.length || locked}
            onClick={() => {
              download(
                new Blob([exportMidi(project)], { type: 'audio/midi' }),
                project.title,
                'mid',
              );
              notify(
                'MIDI downloaded. Open the .mid in GarageBand (File → Open), Logic, Ableton, or another DAW. Notes and tempo travel with the file; your hum and Humline synth sound do not.',
              );
            }}
          >
            <Download size={16} />
            <span>Export MIDI</span>
          </button>
        </div>
      </header>
      <main>
        <div className="intro">
          <div>
            <div className="eyebrow">A LITTLE IDEA. A REAL MELODY.</div>
            <h1>
              Hum a melody. <span>Make it yours.</span>
            </h1>
          </div>
          <div className="workflow">
            <span className={status === 'recording' || !project.notes.length ? 'current' : ''}>
              01 Capture
            </span>
            <ChevronRight />
            <span className={project.notes.length ? 'current' : ''}>02 Refine</span>
            <ChevronRight />
            <span>03 Create</span>
          </div>
        </div>
        <div className="workspace">
          <aside className="sidebar">
            <section className={`capture panel ${status === 'recording' ? 'recording' : ''}`}>
              <div className="section-heading">
                <span>
                  <Mic size={15} /> CAPTURE
                </span>
                <span className="small-tag">20 SEC MAX</span>
              </div>
              <h2>{status === 'recording' ? 'Follow that melody.' : 'Start with a hum.'}</h2>
              <p className="muted">
                One voice. A quiet room.
                <br />A little space between the notes.
              </p>
              <div className="record-zone">
                <button
                  className={`record-button ${status === 'recording' ? 'live' : ''}`}
                  aria-label={status === 'recording' ? 'Stop recording' : 'Record a melody'}
                  disabled={locked && status !== 'recording'}
                  onClick={() => (status === 'recording' ? capture.current?.stop() : void record())}
                >
                  {status === 'recording' ? (
                    <Square size={25} fill="currentColor" />
                  ) : status === 'requesting-microphone' ? (
                    <LoaderCircle className="spin" size={30} />
                  ) : (
                    <Mic size={30} />
                  )}
                </button>
                <strong>
                  {status === 'recording'
                    ? 'Recording…'
                    : status === 'requesting-microphone'
                      ? 'Waiting for microphone…'
                      : 'Record a melody'}
                </strong>
                <div className="record-time">
                  {formatTime(elapsed)} <span>/ 00:20</span>
                </div>
                <div
                  className="level-meter"
                  role="meter"
                  aria-label="Microphone level"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(100, Math.round(level * 400))}
                >
                  {Array.from({ length: 28 }, (_, i) => (
                    <i key={i} className={i < level * 112 ? 'lit' : ''} />
                  ))}
                </div>
              </div>
              {status === 'recording' || status === 'requesting-microphone' ? (
                <button className="wide subtle" onClick={cancelOperation}>
                  Cancel recording
                </button>
              ) : (
                <>
                  <button
                    className="wide secondary"
                    disabled={locked}
                    onClick={() => audioInput.current?.click()}
                  >
                    <Upload size={15} /> Import audio
                  </button>
                  <button
                    className="example-button"
                    disabled={locked}
                    onClick={() => void example()}
                  >
                    <Sparkles size={14} /> Try a synthetic example <ArrowRight size={14} />
                  </button>
                  <span className="file-hint">WAV, MP3 & more · up to 20 MB / 20 sec</span>
                </>
              )}
              {source && !['recording', 'requesting-microphone'].includes(status) && (
                <div className="convert-area">
                  <div className="source-ready">
                    <Check size={13} />
                    {source.synthetic ? 'Synthetic example ready' : 'Audio ready'}
                    <span>{source.buffer.duration.toFixed(1)}s</span>
                  </div>
                  {status === 'analysing' ? (
                    <>
                      <div className="analysis-progress">
                        <span style={{ width: `${progress}%` }} />
                      </div>
                      <p role="status">Finding your notes… {progress}%</p>
                      <button className="wide" onClick={cancelOperation}>
                        Cancel conversion
                      </button>
                    </>
                  ) : (
                    <button className="primary wide" disabled={locked} onClick={convert}>
                      <AudioLines size={17} />
                      {status === 'ready' ? 'Convert again' : 'Convert to notes'}
                      <ArrowRight size={15} />
                    </button>
                  )}
                </div>
              )}
              {source &&
                source !== appliedSource.current &&
                project.notes.length > 0 &&
                !locked && (
                  <button
                    className="discard-audio"
                    onClick={() => {
                      stop();
                      setSource(appliedSource.current);
                      setStatus('ready');
                      notify('New audio discarded. Your existing melody is unchanged.');
                    }}
                  >
                    Discard new audio
                  </button>
                )}
              {status === 'decoding' && (
                <p role="status" className="loading-copy">
                  <LoaderCircle size={15} className="spin" /> Preparing audio…
                </p>
              )}
            </section>
            <NoteInspector
              note={note}
              disabled={locked}
              onEdit={edit}
              onDelete={() => note && remove(note.id)}
            />
          </aside>
          <section className="studio panel" aria-label="Melody studio">
            <div className="studio-heading">
              <div>
                <div className="eyebrow">YOUR MELODY</div>
                <h2>
                  A sound of your own
                  <span className="mint-dot" />
                </h2>
              </div>
              <span className="note-count">{project.notes.length} notes</span>
            </div>
            <div className="instrument-row">
              <div className="instrument-tabs" role="group" aria-label="Instrument">
                {(
                  [
                    { id: 'keys', label: 'Keys', Icon: Piano },
                    { id: 'pluck', label: 'Pluck', Icon: Guitar },
                    { id: 'pad', label: 'Pad', Icon: Waves },
                  ] as const
                ).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    aria-pressed={project.instrument === id}
                    className={project.instrument === id ? 'active' : ''}
                    disabled={locked}
                    onClick={() => updateProject({ ...project, instrument: id })}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
              <span className="preset-caption">
                {project.instrument === 'keys'
                  ? 'Soft attack. Warm harmonics.'
                  : project.instrument === 'pluck'
                    ? 'Light touch. Bright decay.'
                    : 'Slow bloom. Room to breathe.'}
              </span>
            </div>
            <div className="source-strip">
              <button
                className={`original-button ${transport === 'playing' && mode === 'original' ? 'active' : ''}`}
                disabled={!source || locked}
                onClick={() => void original()}
              >
                {transport === 'playing' && mode === 'original' ? (
                  <Square size={14} />
                ) : (
                  <Headphones size={16} />
                )}
                <span>
                  {transport === 'playing' && mode === 'original'
                    ? 'Stop original'
                    : 'Listen to original'}
                </span>
              </button>
              <div className="waveform-container">
                {source ? (
                  <Waveform
                    peaks={source.peaks}
                    active={transport === 'playing' && mode === 'original'}
                    progress={originalProgress}
                  />
                ) : (
                  <div className="waveform-placeholder">Your original audio will appear here</div>
                )}
              </div>
              <span className="source-duration">
                {source ? formatTime(source.buffer.duration) : '00:00'}
              </span>
            </div>
            {source?.synthetic && (
              <div className="source-caption">
                SYNTHETIC EXAMPLE · Generated tones, not a human recording
              </div>
            )}
            {!source && project.sourceAudio && (
              <div className="source-caption">
                Notes restored · Reimport the recording to hear the original
              </div>
            )}
            <div className="roll-toolbar">
              <span>
                <span className="lavender-dot" /> PIANO ROLL
              </span>
              <div>
                <label className="snap-control">
                  <input
                    type="checkbox"
                    checked={snap}
                    disabled={locked}
                    onChange={(e) => setSnap(e.target.checked)}
                  />{' '}
                  Snap <span>⅛</span>
                </label>
                <span className="toolbar-divider" />
                <button
                  className="icon-button"
                  aria-label="Undo"
                  title="Undo (Ctrl/⌘ Z)"
                  disabled={!history.past.length || locked}
                  onClick={() => historyAction('undo')}
                >
                  <Undo2 size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Redo"
                  title="Redo (Ctrl/⌘ Shift Z)"
                  disabled={!history.future.length || locked}
                  onClick={() => historyAction('redo')}
                >
                  <Redo2 size={16} />
                </button>
              </div>
            </div>
            <PianoRoll
              notes={project.notes}
              selected={selected}
              snap={snap}
              playhead={playhead}
              disabled={locked}
              onEdit={edit}
              onDelete={remove}
              onSeek={(beat) => {
                stop(false);
                setPlayhead(beat);
              }}
              onSelect={(id) => {
                stop(false);
                setSelected(id);
                const n = project.notes.find((n) => n.id === id);
                if (n)
                  void engine
                    .audition(n, project.instrument)
                    .catch(() => notify('Note audition could not start.', true));
              }}
              onAdd={(midi, startBeat) => {
                const n: MelodyNote = {
                  id: crypto.randomUUID(),
                  midi,
                  startBeat,
                  durationBeats: 0.5,
                  velocity: 0.75,
                  source: 'manual',
                };
                updateProject({ ...project, notes: [...project.notes, n] });
                setSelected(n.id);
                setStatus('ready');
              }}
            />
            <div className="transport">
              <div className="play-controls">
                <button
                  className="icon-button stop-button"
                  aria-label="Stop playback"
                  onClick={() => stop()}
                  disabled={locked}
                >
                  <Square size={16} fill="currentColor" />
                </button>
                <button
                  className="primary play-button"
                  disabled={!project.notes.length || locked}
                  onClick={() => void play()}
                >
                  {transport === 'playing' && mode === 'instrument' ? (
                    <Pause size={17} fill="currentColor" />
                  ) : (
                    <Play size={17} fill="currentColor" />
                  )}
                  {transport === 'playing' && mode === 'instrument'
                    ? 'Pause'
                    : transport === 'paused'
                      ? 'Resume'
                      : 'Play'}
                </button>
                <div className="beat-counter">
                  {String(Math.floor(playhead / 4) + 1).padStart(2, '0')}
                  <span> : </span>
                  {String(Math.floor(playhead % 4) + 1).padStart(2, '0')}
                  <small>BAR · BEAT</small>
                </div>
              </div>
              <div className="tempo-volume">
                <label className="tempo">
                  <NumberField
                    label="Tempo"
                    min={40}
                    max={240}
                    value={project.bpm}
                    disabled={locked}
                    onChange={(bpm) => updateProject({ ...project, bpm })}
                  />
                  <span>BPM</span>
                </label>
                <div className="volume">
                  <Volume2 size={17} />
                  <input
                    aria-label="Volume"
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => {
                      setVolume(+e.target.value);
                      engine.setVolume(+e.target.value / 100);
                    }}
                  />
                  <span className="volume-value" aria-hidden="true">
                    {volume}%
                  </span>
                </div>
              </div>
            </div>
            <div className="studio-footnote">
              <span>Click to add · Drag to move · Pull an edge to resize</span>
              <span>4/4 time · {snap ? '⅛ note grid' : 'Free timing'}</span>
            </div>
          </section>
        </div>
        {message && (
          <div className={`notice ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>
            {error ? <Info size={17} /> : <Check size={17} />}
            <span>{message}</span>
            <button className="icon-button" aria-label="Dismiss message" onClick={() => notify('')}>
              <X size={15} />
            </button>
          </div>
        )}
        <div className="bottom-note">
          <span>
            <ShieldCheck size={15} /> Your audio stays in your browser.
          </span>
          <span>
            {cloudToolbar
              ? 'Notes sync when saved. Original audio lasts for this session.'
              : 'Notes save locally. Original audio lasts for this session.'}
          </span>
        </div>
      </main>
      <footer>
        <span className="footer-brand">Made for the melodies that find you.</span>
        <button onClick={() => setAbout(true)}>
          <Info size={13} /> About Humline
        </button>
      </footer>
      <input
        ref={audioInput}
        hidden
        type="file"
        accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm"
        aria-label="Import audio file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void loadAudio(file, file.name);
        }}
      />
      <input
        ref={projectInput}
        hidden
        type="file"
        accept="application/json,.json"
        aria-label="Import project file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void importProject(file);
        }}
      />
      {confirm && <ConfirmDialog value={confirm} onClose={() => setConfirm(null)} />}
      {about && <About onClose={() => setAbout(false)} />}
    </div>
  );
}
function About({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog className="about-dialog" ref={ref} onCancel={onClose} aria-labelledby="about-title">
      <button className="icon-button close-dialog" aria-label="Close about" onClick={onClose}>
        <X size={18} />
      </button>
      <AudioLines className="about-logo" size={32} />
      <h2 id="about-title">Your idea, in notes.</h2>
      <p>
        Humline is a small local music studio for short, single-voice melodies. Record, convert,
        correct, and take your notes somewhere new.
      </p>
      <p>
        Conversion uses Pitchy’s pitch detector and custom note segmentation. Uncertain notes have a
        ◇ marker; detector clarity is not an accuracy probability. Chords, noisy recordings, glides,
        and repeated notes can need correction.
      </p>
      <p>
        Keys, Pluck, and Pad are synthesised sounds, not sampled acoustic instruments. Export MIDI
        downloads a standard .mid file you can open in GarageBand, Logic Pro, Ableton, FL Studio,
        and similar apps. Those apps choose their own sounds, so playback will differ from Humline.
      </p>
      <p>
        Notes, tempo, and instrument save on this device. Original audio stays in memory for this
        session and is lost on refresh. Download project JSON for a portable note backup.
      </p>
      <p className="muted">
        Keyboard: focus a note, use arrows to move it, Shift + left/right to resize, Shift + up/down
        for octaves, Delete to remove. Ctrl/⌘ Z undoes an edit when the grid or page is focused.
      </p>
      <button className="primary" onClick={onClose}>
        Back to the melody
      </button>
    </dialog>
  );
}
