import { GameShell } from './GameShell';
import { useBingoGame } from '../../hooks/useBingoGame';
import { BingoSurface } from './Bingo/BingoSurface';
import { type ThemeType } from '../../utils/themeManifesto';

interface Props {
  theme: ThemeType;
  balance: number;
  onUpdateBalance: (delta: number) => void;
}

export function Bingo({ theme, balance, onUpdateBalance }: Props) {
  const game = useBingoGame({ theme, balance, onUpdateBalance });

  return (
    <GameShell
      theme={theme}
      bgKey={`bg_bingo_${theme}`}
      extraAssetKeys={[`bingo_${theme}`]}
      gameType="bingo"
      win={game.win}
      lastPayout={game.lastPayout}
      bet={game.bet}
      onBet={game.setBet}
      onPlay={game.play}
      playLabel={game.drawing ? 'DRAWING...' : 'PLAY BINGO'}
      playDisabled={game.drawing || balance < game.bet}
      message={game.message}
      balance={balance}
    >
      <BingoSurface theme={theme} game={game} />
    </GameShell>
  );
}
