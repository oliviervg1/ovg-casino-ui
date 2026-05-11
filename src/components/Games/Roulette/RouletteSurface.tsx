import { type UseRouletteGameReturn } from '../../../hooks/useRouletteGame';
import { type ThemeType } from '../../../utils/themeManifesto';
import { RouletteWheel } from './RouletteWheel';
import { BetTable, type BetType } from './BetTable';
import { ResultStrip } from './ResultStrip';

export interface RouletteSurfaceProps {
  theme: ThemeType;
  game: UseRouletteGameReturn;
}

export function RouletteSurface({ theme, game }: RouletteSurfaceProps) {
  return (
    <div data-testid="roulette-surface" className="flex flex-col items-center gap-4 md:gap-6">
      <div className="relative flex items-center justify-center">
        <RouletteWheel
          theme={theme}
          spinning={game.spinning}
          resultNum={game.resultNum}
          wheelRotation={game.wheelRotation}
          ballRotation={game.ballRotation}
        />
      </div>
      <BetTable
        bet={game.bet}
        betType={game.betType}
        onSelect={(t: BetType) => game.setBetType(t)}
        disabled={game.spinning}
      />
      <ResultStrip resultNum={game.resultNum} resultColour={game.resultColour} message={game.message} />
    </div>
  );
}
