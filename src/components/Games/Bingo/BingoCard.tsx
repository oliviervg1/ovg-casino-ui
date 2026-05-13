import { motion } from 'motion/react';
import { type ThemeType } from '../../../utils/themeManifesto';
import { type BingoLines } from '../gameLogic';
import { BingoCell } from './BingoCell';

export interface BingoCardProps {
  theme: ThemeType;
  board: number[][];
  drawn: Set<number>;
  lastDrawn: number | null;
  lines: BingoLines;
  win?: 'jackpot' | 'small' | null;
}

function isWinningCell(i: number, j: number, lines: BingoLines): boolean {
  if (lines.rows[i]) return true;
  if (lines.cols[j]) return true;
  if (i === j && lines.diags[0]) return true;
  if (i + j === 2 && lines.diags[1]) return true;
  return false;
}

export function BingoCard({ theme, board, drawn, lastDrawn, lines, win = null }: BingoCardProps) {
  return (
    <div
      data-testid="bingo-card"
      data-theme={theme}
      className="relative w-full max-w-[42vh] mx-auto overflow-hidden"
    >
      <div className="grid grid-cols-3 gap-[1vh] md:gap-[2vh] bg-theme-bg/80 p-[2vh] md:p-[3vh] rounded-2xl shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] border-[0.6vh] border-theme-primary">
        {board.map((row, i) =>
          row.map((value, j) => (
            <BingoCell
              key={`${i}-${j}`}
              value={value}
              marked={drawn.has(value)}
              isLastDrawn={value === lastDrawn}
              isWinningLine={isWinningCell(i, j, lines)}
            />
          )),
        )}
      </div>
      {win !== null && (
        <motion.div
          data-testid="bingo-win-banner"
          initial={{ x: '-120%', opacity: 0, rotate: -8 }}
          animate={{ x: '120%', opacity: [0, 1, 1, 0], rotate: -8 }}
          transition={{ duration: 1.8, ease: 'easeInOut', times: [0, 0.15, 0.85, 1] }}
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[8vh] md:text-[10vh] font-black tracking-wider text-yellow-300 drop-shadow-[0_0_24px_rgba(250,204,21,0.85)] pointer-events-none z-30 select-none"
        >
          BINGO!
        </motion.div>
      )}
    </div>
  );
}
