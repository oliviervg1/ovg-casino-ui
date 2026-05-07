import { Minus, Plus } from 'lucide-react';

interface BetControlProps {
  value: number;
  onChange: (n: number) => void;
  presets?: number[];
  min?: number;
  max?: number;
  disabled?: boolean;
}

const DEFAULT_PRESETS = [5, 10, 25, 100];

export function BetControl({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  min = 1,
  max = Number.POSITIVE_INFINITY,
  disabled = false,
}: BetControlProps) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const step = (delta: number) => onChange(clamp(value + delta));

  return (
    <div
      data-testid="bet-control"
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/30 backdrop-blur-sm ring-1 ring-white/10"
    >
      <button
        type="button"
        aria-label="Decrease bet"
        onClick={() => step(-1)}
        disabled={disabled || value <= min}
        className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-white/5 transition-colors"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span
        data-testid="bet-value"
        className="font-mono font-bold text-base text-green-400 min-w-[3ch] text-center"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase bet"
        onClick={() => step(+1)}
        disabled={disabled || value >= max}
        className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-white/5 transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>
      <span className="w-px h-5 bg-white/10 mx-1" aria-hidden="true" />
      {presets.map(p => {
        const active = value === p;
        return (
          <button
            key={p}
            type="button"
            aria-label={`Bet ${p}`}
            data-active={String(active)}
            onClick={() => onChange(clamp(p))}
            disabled={disabled}
            className={`px-3 h-8 rounded-full text-sm font-semibold transition-colors disabled:opacity-40 ${
              active
                ? 'bg-theme-accent text-black ring-2 ring-theme-accent/60'
                : 'bg-white/5 text-white/80 hover:bg-white/15'
            }`}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}
