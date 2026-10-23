import { SlidersHorizontal, Trash2 } from 'lucide-react';
import type { MelodyNote } from '../types/project';
import { noteName } from '../music/pitch';
import { editNote } from '../state/project';
export function NoteInspector({
  note,
  disabled,
  onEdit,
  onDelete,
}: {
  note?: MelodyNote;
  disabled: boolean;
  onEdit: (n: MelodyNote) => void;
  onDelete: () => void;
}) {
  return (
    <section className="inspector panel">
      <div className="section-heading">
        <span>
          <SlidersHorizontal size={15} /> NOTE DETAILS
        </span>
        {note && (
          <button
            className="icon-button"
            aria-label="Delete selected note"
            disabled={disabled}
            onClick={onDelete}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
      {note ? (
        <>
          <div className="selected-pitch">
            <strong>{noteName(note.midi)}</strong>
            <span>{note.source === 'detected' ? 'Detected note' : 'Your note'}</span>
          </div>
          <div className="inspector-fields">
            <label>
              Pitch
              <select
                aria-label="Note pitch"
                disabled={disabled}
                value={note.midi}
                onChange={(e) => onEdit(editNote(note, { midi: +e.target.value }))}
              >
                {Array.from({ length: 128 }, (_, i) => (
                  <option key={i} value={i}>
                    {noteName(i)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Start · beats
              <input
                aria-label="Note start"
                type="number"
                min="0"
                max="4096"
                step="0.125"
                disabled={disabled}
                value={+note.startBeat.toFixed(3)}
                onChange={(e) => {
                  if (e.target.value) onEdit(editNote(note, { startBeat: +e.target.value }));
                }}
              />
            </label>
            <label>
              Length · beats
              <input
                aria-label="Note length"
                type="number"
                min="0.03125"
                max="4096"
                step="0.125"
                disabled={disabled}
                value={+note.durationBeats.toFixed(3)}
                onChange={(e) => {
                  if (e.target.value) onEdit(editNote(note, { durationBeats: +e.target.value }));
                }}
              />
            </label>
            <label>
              Velocity
              <input
                aria-label="Note velocity"
                type="number"
                min="0"
                max="100"
                step="1"
                disabled={disabled}
                value={Math.round(note.velocity * 100)}
                onChange={(e) => {
                  if (e.target.value) onEdit(editNote(note, { velocity: +e.target.value / 100 }));
                }}
              />
            </label>
          </div>
          <div className="octave-buttons">
            <button
              disabled={disabled}
              onClick={() => onEdit(editNote(note, { midi: note.midi - 12 }))}
            >
              − Octave
            </button>
            <button
              disabled={disabled}
              onClick={() => onEdit(editNote(note, { midi: note.midi + 12 }))}
            >
              + Octave
            </button>
          </div>
          {note.needsReview && (
            <p className="review-copy">
              ◇ Review this pitch. The detector found an unstable segment; listen and adjust.
            </p>
          )}
        </>
      ) : (
        <div className="inspector-empty">
          <span className="mini-note">♩</span>
          <p>
            Select a note to fine-tune
            <br />
            its pitch, timing, and length.
          </p>
        </div>
      )}
      <div className="tip">
        <span>GOOD TO KNOW</span>
        <p>Drag to move. Pull the right edge to resize. Every edit is yours to undo.</p>
      </div>
    </section>
  );
}
