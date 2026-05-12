import { useMemo } from 'react';
import { GameShell } from './GameShell';
import { SlotMachine } from './Slots/SlotMachine';
import { useAssets } from '../../hooks/useAssets';
import { useSlotsGame } from '../../hooks/useSlotsGame';
import { type ThemeType } from '../../utils/themeManifesto';

interface Props {
  name: string;
  theme: ThemeType;
  balance: number;
  onUpdateBalance: (delta: number) => void;
  onBack: () => void;
}

const FALLBACK_SYMBOLS_MAP: Record<ThemeType, string[]> = {
  sweets: ['🍭', '🧁', '🍬', '🍩'],
  egypt: ['🏺', '🛕', '🐪', '👁️'],
  space: ['🚀', '👽', '🪐', '☄️'],
  west: ['🤠', '🌵', '🐎', '🔫'],
  ocean: ['🦈', '🐙', '🐚', '🔱'],
  jungle: ['🐒', '🐍', '🗿', '🌴'],
  vampire: ['🦇', '🧛', '🩸', '🍷'],
  ninja: ['🥷', '🗡️', '🌸', '🏯'],
};

export function Slots({ name, theme, balance, onUpdateBalance, onBack }: Props) {
  const symbolKeys = useMemo(() => [1, 2, 3, 4].map(n => `${theme}_${n}`), [theme]);
  const extraAssetKeys = useMemo(() => [`slots_${theme}`, ...symbolKeys], [theme, symbolKeys]);
  const { assets } = useAssets(symbolKeys);

  const fallbacks = FALLBACK_SYMBOLS_MAP[theme];
  const symbols = useMemo(
    () => symbolKeys.map((k, i) => assets[k] || fallbacks[i]),
    [symbolKeys, assets, fallbacks]
  );

  const game = useSlotsGame({ theme, symbols, balance, onUpdateBalance });

  return (
    <GameShell
      name={name}
      theme={theme}
      bgKey={`bg_slots_${theme}`}
      extraAssetKeys={extraAssetKeys}
      gameType="slots"
      win={game.win}
      lastPayout={game.lastPayout}
      bet={game.bet}
      onBet={game.setBet}
      onPlay={game.spin}
      playLabel={game.spinning ? 'SPINNING...' : 'SPIN'}
      playDisabled={game.spinning || balance < game.bet}
      message={game.message}
      balance={balance}
      onBack={onBack}
    >
      <SlotMachine theme={theme} game={game} symbols={symbols} />
    </GameShell>
  );
}
