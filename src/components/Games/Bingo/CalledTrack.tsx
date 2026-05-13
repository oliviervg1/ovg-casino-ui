import { type ThemeType } from '../../../utils/themeManifesto';
import { MAX_DRAWS, POOL_SIZE } from '../../../hooks/useBingoGame';

const POOL = Array.from({ length: POOL_SIZE }, (_, i) => i + 1);

export interface CalledTrackProps {
  theme: ThemeType;
  drawn: Set<number>;
}

export function CalledTrack({ theme, drawn }: CalledTrackProps) {
  return (
    <div
      data-testid="called-track"
      data-theme={theme}
      className="w-full max-w-2xl flex flex-col gap-2 p-3 md:p-4 rounded-2xl bg-theme-bg/70 backdrop-blur-sm border-[0.3vh] border-theme-primary/40"
    >
      <div
        data-testid="called-track-caption"
        className="text-[1.5vh] md:text-[1.6vh] uppercase tracking-wider text-theme-text/70 font-semibold flex justify-between items-baseline"
      >
        <span>Called so far</span>
        <span className="text-theme-accent normal-case tracking-normal">
          <span className="font-bold">{drawn.size}</span>
          <span className="opacity-60"> / {MAX_DRAWS}</span>
        </span>
      </div>
      <div
        className="grid gap-1 md:gap-1.5"
        style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}
      >
        {POOL.map(n => {
          const isDrawn = drawn.has(n);
          return (
            <div
              key={n}
              data-testid={`called-track-${n}`}
              data-drawn={isDrawn ? 'true' : 'false'}
              className={`aspect-square flex items-center justify-center rounded text-[1.4vh] md:text-[1.6vh] font-bold transition-colors duration-200 ${
                isDrawn
                  ? 'bg-theme-accent text-theme-bg shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                  : 'bg-theme-bg/40 text-theme-text/40 border border-theme-primary/20'
              }`}
            >
              {n}
            </div>
          );
        })}
      </div>
    </div>
  );
}
