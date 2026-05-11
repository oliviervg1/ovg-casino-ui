import { GameShell } from './GameShell';
import { useBingoGame } from '../../hooks/useBingoGame';
import { BingoSurface } from './Bingo/BingoSurface';
import { type ThemeType } from '../../utils/themeManifesto';

interface Props {
  name: string;
  theme: ThemeType;
  balance: number;
  onUpdateBalance: (delta: number) => void;
  onBack: () => void;
}

export function Bingo({ name, theme, balance, onUpdateBalance, onBack }: Props) {
  const game = useBingoGame({ theme, balance, onUpdateBalance });

  return (
    <GameShell
      name={name}
      theme={theme}
      bgKey={`bg_bingo_${theme}`}
      extraAssetKeys={[`bingo_${theme}`]}
      gameType="bingo"
      win={game.win}
      bet={game.bet}
      onBet={game.setBet}
      onPlay={game.play}
      playLabel={game.drawing ? 'DRAWING...' : 'PLAY BINGO'}
      playDisabled={game.drawing || balance < game.bet}
      message={game.message}
      balance={balance}
      onBack={onBack}
    >
      <BingoSurface theme={theme} game={game} />
    </GameShell>
  );
}
