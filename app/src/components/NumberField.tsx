import { useEffect, useState } from 'react';
import { clamp } from '../music/pitch';
/** Keep a text draft so entering 40 BPM can pass through the intermediate value “4”. */
export function NumberField({
  value,
  min,
  max,
  step = 1,
  label,
  disabled,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <input
      type="number"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      value={draft}
      onChange={(e) => {
        const text = e.target.value;
        setDraft(text);
        const n = Number(text);
        if (text !== '' && Number.isFinite(n) && n >= min && n <= max) onChange(n);
      }}
      onBlur={() => {
        const n = draft === '' ? value : clamp(Number(draft), min, max);
        const valid = Number.isFinite(n) ? n : value;
        setDraft(String(valid));
        if (valid !== value) onChange(valid);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setDraft(String(value));
        }
      }}
    />
  );
}
