import { type ThemeType } from '../../../utils/themeManifesto';
import { getRouletteSegments } from './RouletteSegments';

export interface RouletteWheelProps {
  theme: ThemeType;
  spinning: boolean;
  /** When set (after a spin settles), the wheel rests at this pocket's angle. */
  resultNum: number | null;
}

const SEGMENT_FILL: Record<'red' | 'black' | 'green', string> = {
  red: '#dc2626',
  black: '#171717',
  green: '#16a34a',
};

export function RouletteWheel({ theme, spinning: _spinning, resultNum: _resultNum }: RouletteWheelProps) {
  const segments = getRouletteSegments();
  return (
    <svg
      data-testid="roulette-wheel"
      data-theme={theme}
      viewBox="0 0 100 100"
      className="w-[35vh] h-[35vh] md:w-[45vh] md:h-[45vh]"
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
  );
}
