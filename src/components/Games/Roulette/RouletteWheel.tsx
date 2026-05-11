import { type ThemeType } from '../../../utils/themeManifesto';
import { angleOfPocket } from '../gameLogic';
import { getRouletteSegments } from './RouletteSegments';

export interface RouletteWheelProps {
  theme: ThemeType;
  spinning: boolean;
  resultNum: number | null;
}

const SEGMENT_FILL: Record<'red' | 'black' | 'green', string> = {
  red: '#dc2626',
  black: '#171717',
  green: '#16a34a',
};

export function RouletteWheel({ theme, spinning: _spinning, resultNum }: RouletteWheelProps) {
  const segments = getRouletteSegments();
  const ballPocket = resultNum ?? 0;
  const ballAngle = angleOfPocket(ballPocket);
  return (
    <div
      data-testid="roulette-wheel-frame"
      data-theme={theme}
      className="relative w-[35vh] h-[35vh] md:w-[45vh] md:h-[45vh]"
    >
      <svg
        data-testid="roulette-wheel"
        data-theme={theme}
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
      >
        {segments.map(seg => (
          <path
            key={seg.number}
            d={seg.path}
            fill={SEGMENT_FILL[seg.colour]}
            stroke="#fbbf24"
            strokeWidth={0.15}
            data-pocket={seg.number}
            data-colour={seg.colour}
          />
        ))}
        {segments.map(seg => (
          <text
            key={`label-${seg.number}`}
            x={seg.labelX}
            y={seg.labelY}
            fontSize={3}
            fill="#fff"
            textAnchor="middle"
            dominantBaseline="central"
            data-pocket-label={seg.number}
            transform={`rotate(${seg.labelAngle} ${seg.labelX} ${seg.labelY})`}
          >
            {seg.number}
          </text>
        ))}
      </svg>

      <div
        data-testid="roulette-rim"
        className="absolute inset-0 rounded-full border-[1.2vh] border-theme-primary pointer-events-none shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]"
      />

      <div
        data-testid="roulette-cone"
        data-pocket={resultNum ?? ''}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35%] h-[35%] rounded-full bg-theme-bg border-[0.5vh] border-theme-accent flex items-center justify-center text-[5vh] md:text-[6vh] font-bold text-theme-accent shadow-[0_0_20px_rgba(0,0,0,0.4)] z-10"
      >
        {resultNum !== null ? resultNum : '—'}
      </div>

      <div
        data-testid="roulette-ball"
        data-pocket={ballPocket}
        className="absolute top-1/2 left-1/2 w-[2vh] h-[2vh] -mt-[1vh] -ml-[1vh] z-10 pointer-events-none"
        style={{ transform: `rotate(${ballAngle}deg) translateY(-37%)` }}
      >
        <div className="w-full h-full rounded-full bg-white border-[0.3vh] border-theme-accent shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
      </div>

      <div
        data-testid="roulette-pointer"
        className="absolute top-[-1vh] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[1.5vh] border-r-[1.5vh] border-t-[2.5vh] border-l-transparent border-r-transparent border-t-theme-accent z-20 drop-shadow-md"
      />
    </div>
  );
}
