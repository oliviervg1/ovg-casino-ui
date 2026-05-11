import { useMemo } from 'react';
import { themeManifesto, type ThemeType } from '../../../utils/themeManifesto';
import { type UseBingoGameReturn } from '../../../hooks/useBingoGame';
import { evaluateBingoLines } from '../gameLogic';
import { BingoCard } from './BingoCard';
import { CalledPanel } from './CalledPanel';
import { CalledTrack } from './CalledTrack';

export interface BingoSurfaceProps {
  theme: ThemeType;
  game: UseBingoGameReturn;
}

export function BingoSurface({ theme, game }: BingoSurfaceProps) {
  const drawnSet = useMemo(() => new Set(game.drawn), [game.drawn]);
  const lines = useMemo(
    () => evaluateBingoLines(game.board, game.drawn),
    [game.board, game.drawn],
  );
  const themeFont = themeManifesto[theme].font;
  return (
    <div
      data-testid="bingo-surface"
      className={`flex flex-col items-center gap-4 md:gap-6 w-full ${themeFont}`}
    >
      <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-4 md:gap-6 w-full max-w-4xl">
        <BingoCard
          theme={theme}
          board={game.board}
          drawn={drawnSet}
          lastDrawn={game.lastDrawn}
          lines={lines}
        />
        <CalledPanel lastDrawn={game.lastDrawn} lines={lines} />
      </div>
      <CalledTrack theme={theme} drawn={drawnSet} />
    </div>
  );
}
