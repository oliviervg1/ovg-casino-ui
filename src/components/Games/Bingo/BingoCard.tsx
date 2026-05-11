import { type ThemeType } from '../../../utils/themeManifesto';
import { type BingoLines } from '../gameLogic';
import { BingoCell } from './BingoCell';

export interface BingoCardProps {
  theme: ThemeType;
  board: number[][];
  drawn: Set<number>;
  lastDrawn: number | null;
  lines: BingoLines;
}

function isWinningCell(i: number, j: number, lines: BingoLines): boolean {
  if (lines.rows[i]) return true;
  if (lines.cols[j]) return true;
  if (i === j && lines.diags[0]) return true;
  if (i + j === 2 && lines.diags[1]) return true;
  return false;
}

export function BingoCard({ theme, board, drawn, lastDrawn, lines }: BingoCardProps) {
  return (
    <div
      data-testid="bingo-card"
      data-theme={theme}
      className="grid grid-cols-3 gap-[1vh] md:gap-[2vh] w-full max-w-[42vh] mx-auto bg-theme-bg/80 p-[2vh] md:p-[3vh] rounded-2xl shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] border-[0.6vh] border-theme-primary"
    >
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
  );
}
