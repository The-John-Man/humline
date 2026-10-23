export function Waveform({
  peaks,
  active = false,
  progress = 0,
}: {
  peaks: number[];
  active?: boolean;
  progress?: number;
}) {
  const max = Math.max(0.01, ...peaks);
  return (
    <svg
      className={`waveform ${active ? 'active' : ''}`}
      viewBox="0 0 660 54"
      preserveAspectRatio="none"
      role="img"
      aria-label="Audio waveform"
    >
      {peaks.map((peak, i) => {
        const height = Math.max(2, (peak / max) * 44);
        return (
          <rect
            key={i}
            x={(i * 660) / peaks.length}
            y={(54 - height) / 2}
            width={Math.max(1, 660 / peaks.length - 2)}
            height={height}
            rx="1"
            fill={i / peaks.length <= progress ? '#79e2bd' : '#7184a5'}
          />
        );
      })}
    </svg>
  );
}
