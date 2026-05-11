import { SlotSymbol } from './SlotSymbol';

export interface ReelCells {
  top: string;
  middle: string;
  bottom: string;
}

export interface SlotReelProps {
  cells: ReelCells;
  /** 0-based reel position; used for staggered stop timing later. */
  index: number;
  spinning: boolean;
  /** True when this reel is part of a winning payline (middle cell wins). */
  winning?: boolean;
}

const cellOrder = ['top', 'middle', 'bottom'] as const;

export function SlotReel({ cells, index, spinning, winning = false }: SlotReelProps) {
  return (
    <div
      data-testid="slot-reel"
      data-reel-index={index}
      data-spinning={spinning ? 'true' : 'false'}
      className="flex flex-col gap-1 w-[15vh] md:w-[20vh] h-[36vh] md:h-[48vh]"
    >
      {cellOrder.map((position) => {
        const symbol = cells[position];
        const isMiddle = position === 'middle';
        return (
          <div
            key={position}
            data-cell={position}
            data-state={isMiddle ? 'bright' : 'dim'}
            className={`flex-1 bg-white rounded-lg flex items-center justify-center text-[6vh] md:text-[8vh] shadow-[0_2px_8px_rgba(0,0,0,0.3)] border-[0.3vh] border-gray-200 overflow-hidden ${
              isMiddle ? '' : 'opacity-50 scale-95 blur-[1px]'
            }`}
          >
            <SlotSymbol src={symbol} alt={`reel-${index}-${position}`} winning={isMiddle && winning} />
          </div>
        );
      })}
    </div>
  );
}
