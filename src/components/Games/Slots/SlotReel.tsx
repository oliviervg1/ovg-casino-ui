import { motion } from 'motion/react';
import { SlotSymbol } from './SlotSymbol';

export interface ReelCells {
  top: string;
  middle: string;
  bottom: string;
}

export interface SlotReelProps {
  cells: ReelCells;
  /** 0-based reel position; drives staggered stop timing. */
  index: number;
  spinning: boolean;
  /** Symbol pool used to populate the spin scroll stack. Required when spinning. */
  pool?: string[];
  /** True when the middle cell is part of a winning payline. */
  winning?: boolean;
}

const STAGGER_MS = [1500, 2000, 2500] as const;
const STACK_DEPTH = 12;
const cellOrder = ['top', 'middle', 'bottom'] as const;
const SPIN_EASE = [0.15, 0, 0.25, 1] as const;

// Visual scroll-end offset: with finalReels at the TOP of the stack and STACK_DEPTH random
// fillers below, the stack must START with the fillers visible (y at -80% = scrolled UP by
// 12 cells out of 15) and END with finalReels visible (y at 0). This makes symbols appear
// to FALL DOWN past the window during the spin, settling with finalReels at the top of the
// stack visible in the reel window. (Approximation: 12/15 = 80% ignoring the 4px gap-1
// gaps; off by ~0.2%, invisible.)
const SPIN_INITIAL_Y_PCT = -((STACK_DEPTH / (STACK_DEPTH + 3)) * 100); // = -80

export function SlotReel({ cells, index, spinning, pool = [], winning = false }: SlotReelProps) {
  const stopDuration = STAGGER_MS[Math.min(index, STAGGER_MS.length - 1)];

  // Build the scroll stack: finalReels (top, middle, bottom) at the TOP of the stack,
  // STACK_DEPTH random fillers below. The visual destination at y=0 is the top of the stack
  // (= finalReels), so the spin appears to scroll DOWNWARD into the final symbols.
  const stack = (() => {
    if (!spinning || pool.length === 0) return [];
    const out: string[] = [cells.top, cells.middle, cells.bottom];
    for (let i = 0; i < STACK_DEPTH; i++) out.push(pool[Math.floor(Math.random() * pool.length)]);
    return out;
  })();

  return (
    <div
      data-testid="slot-reel"
      data-reel-index={index}
      data-spinning={spinning ? 'true' : 'false'}
      data-stop-duration={stopDuration}
      className="flex flex-col gap-1 w-[15vh] md:w-[20vh] h-[36vh] md:h-[48vh] overflow-hidden relative"
    >
      {spinning ? (
        <motion.div
          data-testid="slot-reel-stack"
          initial={{ y: `${SPIN_INITIAL_Y_PCT}%` }}
          animate={{ y: 0 }}
          transition={{ duration: stopDuration / 1000, ease: SPIN_EASE }}
          className="flex flex-col gap-1 absolute inset-x-0 top-0 will-change-transform"
          style={{ filter: 'blur(2px)' }}
        >
          {stack.map((symbol, i) => (
            <div
              key={i}
              data-stack-cell={i}
              className="h-[12vh] md:h-[16vh] bg-white rounded-lg flex items-center justify-center text-[6vh] md:text-[8vh] shadow-[0_2px_8px_rgba(0,0,0,0.3)] border-[0.3vh] border-gray-200 overflow-hidden"
            >
              <SlotSymbol src={symbol} alt={`reel-${index}-stack-${i}`} winning={false} />
            </div>
          ))}
        </motion.div>
      ) : (
        cellOrder.map((position) => {
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
        })
      )}
    </div>
  );
}
