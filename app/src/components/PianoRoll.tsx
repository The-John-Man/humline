import { useEffect, useRef, useState } from 'react';
import type { MelodyNote } from '../types/project';
import { clamp, noteName } from '../music/pitch';
import { editNote } from '../state/project';
const ROW = 23,
  BEAT = 58,
  KEY = 56,
  RULER = 30;
interface Props {
  notes: MelodyNote[];
  selected: string | null;
  snap: boolean;
  playhead: number;
  disabled: boolean;
  onSelect: (id: string) => void;
  onEdit: (n: MelodyNote) => void;
  onAdd: (midi: number, beat: number) => void;
  onDelete: (id: string) => void;
  onSeek: (beat: number) => void;
}
export function PianoRoll({
  notes,
  selected,
  snap,
  playhead,
  disabled,
  onSelect,
  onEdit,
  onAdd,
  onDelete,
  onSeek,
}: Props) {
  const low = Math.max(0, Math.min(48, ...notes.map((n) => n.midi - 3)));
  const high = Math.min(127, Math.max(72, ...notes.map((n) => n.midi + 3)));
  const beats = Math.max(
    16,
    Math.ceil(Math.max(0, ...notes.map((n) => n.startBeat + n.durationBeats)) / 4) * 4 + 4,
  );
  const width = beats * BEAT,
    height = (high - low + 1) * ROW;
  const content = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    note: MelodyNote;
    x: number;
    y: number;
    resize: boolean;
    current: MelodyNote;
  } | null>(null);
  const [preview, setPreview] = useState<MelodyNote | null>(null);
  const quant = (n: number) => (snap ? Math.round(n * 2) / 2 : Math.round(n * 1000) / 1000);
  useEffect(() => {
    if (notes.length && scroller.current) {
      const center = notes.reduce((s, n) => s + n.midi, 0) / notes.length;
      scroller.current.scrollTop = Math.max(0, (high - center) * ROW - 170);
    }
  }, [high, low, notes.length]);
  const selectedNote = notes.find((n) => n.id === selected);
  useEffect(() => {
    const scroll = scroller.current;
    if (!selectedNote || !scroll) return;
    const y = (high - selectedNote.midi) * ROW + RULER;
    if (y < scroll.scrollTop + RULER) scroll.scrollTop = y - RULER;
    else if (y + ROW > scroll.scrollTop + scroll.clientHeight)
      scroll.scrollTop = y + ROW - scroll.clientHeight;
    const x = selectedNote.startBeat * BEAT + KEY;
    if (x < scroll.scrollLeft + KEY) scroll.scrollLeft = x - KEY;
    else if (x + 20 > scroll.scrollLeft + scroll.clientWidth)
      scroll.scrollLeft = x + 80 - scroll.clientWidth;
  }, [selectedNote?.id, selectedNote?.midi, selectedNote?.startBeat, high]);
  return (
    <div
      className={`piano-scroll ${disabled ? 'is-disabled' : ''}`}
      ref={scroller}
      aria-label="Piano roll"
      aria-description="Press Enter to add C4 at the playhead. Focus a note and use arrow keys to edit it."
      tabIndex={0}
      onKeyDown={(e) => {
        if (!disabled && e.target === e.currentTarget && e.key === 'Enter') {
          e.preventDefault();
          onAdd(60, playhead);
        }
      }}
    >
      <div
        className="piano-content"
        ref={content}
        style={{ width: width + KEY, height: height + RULER }}
        onDoubleClick={(e) => e.preventDefault()}
      >
        <div
          className="ruler"
          style={{ width: width + KEY }}
          onClick={(e) => {
            if (!disabled && content.current)
              onSeek(
                clamp(
                  quant((e.clientX - content.current.getBoundingClientRect().left - KEY) / BEAT),
                  0,
                  beats,
                ),
              );
          }}
        >
          <span className="ruler-key">4/4</span>
          {Array.from({ length: beats / 4 }, (_, i) => (
            <span key={i} style={{ left: KEY + i * BEAT * 4 + 10 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
          ))}
        </div>
        <div
          className="roll-grid"
          style={{
            left: KEY,
            top: RULER,
            width,
            height,
            backgroundSize: `${BEAT * 4}px 100%, ${BEAT}px 100%, ${BEAT / 2}px 100%`,
          }}
          onClick={(e) => {
            if (disabled || e.target !== e.currentTarget || !content.current) return;
            const rect = content.current.getBoundingClientRect();
            onAdd(
              clamp(high - Math.floor((e.clientY - rect.top - RULER) / ROW), low, high),
              Math.max(0, quant((e.clientX - rect.left - KEY) / BEAT)),
            );
          }}
        />
        {Array.from({ length: high - low + 1 }, (_, i) => {
          const midi = high - i;
          const black = [1, 3, 6, 8, 10].includes(midi % 12);
          return (
            <div
              key={midi}
              className={`pitch-row ${black ? 'black' : ''} ${midi % 12 === 0 ? 'octave' : ''}`}
              style={{ top: RULER + i * ROW, height: ROW, width: width + KEY }}
            >
              <span className="piano-key">{noteName(midi)}</span>
            </div>
          );
        })}
        {notes.map((original) => {
          const n = preview?.id === original.id ? preview : original;
          return (
            <div
              key={n.id}
              role="button"
              tabIndex={disabled ? -1 : 0}
              aria-label={`${noteName(n.midi)}, beat ${n.startBeat.toFixed(2)}, length ${n.durationBeats.toFixed(2)}${n.needsReview ? ', review pitch' : ''}`}
              aria-pressed={selected === n.id}
              data-testid={`note-${n.id}`}
              className={`note ${selected === n.id ? 'selected' : ''} ${n.needsReview ? 'review' : ''}`}
              style={{
                left: KEY + n.startBeat * BEAT,
                top: RULER + (high - n.midi) * ROW + 2,
                width: Math.max(10, n.durationBeats * BEAT),
                height: ROW - 4,
              }}
              onPointerDown={(e) => {
                if (disabled || e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.focus();
                onSelect(n.id);
                e.currentTarget.setPointerCapture(e.pointerId);
                drag.current = {
                  note: n,
                  x: e.clientX,
                  y: e.clientY,
                  resize: (e.target as HTMLElement).dataset.resize === 'true',
                  current: n,
                };
              }}
              onPointerMove={(e) => {
                const d = drag.current;
                if (!d || d.note.id !== n.id) return;
                const delta = (e.clientX - d.x) / BEAT;
                d.current = editNote(
                  d.note,
                  d.resize
                    ? {
                        durationBeats: Math.max(
                          snap ? 0.5 : 0.03125,
                          quant(d.note.durationBeats + delta),
                        ),
                      }
                    : {
                        startBeat:
                          Math.abs(e.clientX - d.x) > 3
                            ? quant(d.note.startBeat + delta)
                            : d.note.startBeat,
                        midi: d.note.midi - Math.round((e.clientY - d.y) / ROW),
                      },
                );
                setPreview(d.current);
              }}
              onPointerUp={(e) => {
                const d = drag.current;
                if (!d) return;
                drag.current = null;
                setPreview(null);
                onEdit(d.current);
                e.currentTarget.releasePointerCapture(e.pointerId);
              }}
              onPointerCancel={() => {
                drag.current = null;
                setPreview(null);
              }}
              onKeyDown={(e) => {
                if (disabled) return;
                if (e.key === 'Delete' || e.key === 'Backspace') {
                  e.preventDefault();
                  onDelete(n.id);
                }
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(n.id);
                }
                const step = snap ? 0.5 : 0.1;
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                  e.preventDefault();
                  const delta = e.key === 'ArrowRight' ? step : -step;
                  onEdit(
                    editNote(
                      n,
                      e.key === 'ArrowUp' || e.key === 'ArrowDown'
                        ? { midi: n.midi + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 12 : 1) }
                        : e.shiftKey
                          ? { durationBeats: n.durationBeats + delta }
                          : { startBeat: n.startBeat + delta },
                    ),
                  );
                }
              }}
            >
              <span>
                {n.needsReview ? '◇ ' : ''}
                {noteName(n.midi)}
              </span>
              <i data-resize="true" className="resize-handle" aria-hidden="true" />
            </div>
          );
        })}
        <div className="playhead" style={{ left: KEY + playhead * BEAT, height: height + RULER }}>
          <i />
        </div>
        {!notes.length && (
          <div className="roll-empty">
            <span className="empty-note">♪</span>
            <strong>Your melody starts here</strong>
            <p>Record a little idea. We’ll help you find the notes.</p>
            <small>Or click the grid to write your first note.</small>
          </div>
        )}
      </div>
    </div>
  );
}
