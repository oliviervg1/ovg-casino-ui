import { type UseSlotsGameReturn } from '../../../hooks/useSlotsGame';
import { type ThemeType } from '../../../utils/themeManifesto';
import { SlotChassis } from './SlotChassis';
import { SlotReel } from './SlotReel';
import { PaylineStrip } from './PaylineStrip';
import { BottomLedBar } from './BottomLedBar';

export interface SlotMachineProps {
  theme: ThemeType;
  game: UseSlotsGameReturn;
  symbols: string[];
}

export function SlotMachine({ theme, game, symbols }: SlotMachineProps) {
  const winTier = game.win === 'loss' ? null : game.win;
  const isWin = winTier !== null;
  return (
    <SlotChassis theme={theme}>
      <PaylineStrip winning={isWin} />
      <div className="flex justify-center gap-[2vh] md:gap-[3vh] items-center relative">
        {game.reelStates.map((cells, i) => (
          <SlotReel
            key={i}
            cells={cells}
            index={i}
            spinning={game.spinning}
            pool={symbols}
            winning={isWin}
          />
        ))}
      </div>
      <BottomLedBar win={winTier} />
    </SlotChassis>
  );
}
