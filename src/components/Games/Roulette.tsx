import { GameShell } from './GameShell';
import { useRouletteGame } from '../../hooks/useRouletteGame';
import { RouletteSurface } from './Roulette/RouletteSurface';
import { type ThemeType } from '../../utils/themeManifesto';

interface Props {
  name: string;
  theme: ThemeType;
  balance: number;
  onUpdateBalance: (delta: number) => void;
  onBack: () => void;
}

export function Roulette({ name, theme, balance, onUpdateBalance, onBack }: Props) {
  const game = useRouletteGame({ theme, balance, onUpdateBalance });

  return (
    <GameShell
      name={name}
      theme={theme}
      bgKey={`bg_roulette_${theme}`}
      extraAssetKeys={[`roulette_${theme}`]}
      gameType="roulette"
      win={game.win}
      bet={game.bet}
      onBet={game.setBet}
      onPlay={game.spin}
      playLabel={game.spinning ? 'SPINNING...' : !game.betType ? 'Pick Red / Black / Even / Odd' : 'SPIN THE WHEEL'}
      playDisabled={game.spinning || !game.betType}
      message={game.message}
      balance={balance}
      onBack={onBack}
    >
      <RouletteSurface theme={theme} game={game} />
    </GameShell>
  );
}
