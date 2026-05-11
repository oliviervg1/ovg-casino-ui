import { motion } from 'motion/react';
import { BingoMarker } from './BingoMarker';

export interface BingoCellProps {
  value: number;
  marked: boolean;
  /** When true, the cell wiggles to catch the eye (used for the most-recently-drawn cell). */
  isLastDrawn: boolean;
  /** When true, the cell gets a persistent yellow ring (used on cells of completed lines). */
  isWinningLine: boolean;
}

export function BingoCell({ value, marked, isLastDrawn, isWinningLine }: BingoCellProps) {
  return (
    <motion.div
      data-testid={`bingo-cell-${value}`}
      data-marked={marked ? 'true' : 'false'}
      data-winning-line={isWinningLine ? 'true' : 'false'}
      animate={{
        scale: marked ? [1, 1.15, 1] : 1,
        rotate: isLastDrawn ? [0, -10, 10, 0] : 0,
      }}
      transition={{ duration: 0.3 }}
      className={`relative aspect-square flex items-center justify-center rounded-xl text-[3vh] md:text-[4vh] overflow-hidden transition-colors duration-200 ${
        marked ? 'bg-theme-accent/30 text-white' : 'bg-white text-gray-800'
      } ${
        isWinningLine
          ? 'ring-[0.5vh] ring-yellow-400 shadow-[0_0_18px_rgba(250,204,21,0.6)]'
          : marked
          ? 'border-b-[0.4vh] border-theme-accent/50'
          : 'border-b-[0.5vh] border-gray-300'
      }`}
    >
      {marked && <BingoMarker />}
      <span className="relative z-10 font-bold drop-shadow-md">{value}</span>
    </motion.div>
  );
}
