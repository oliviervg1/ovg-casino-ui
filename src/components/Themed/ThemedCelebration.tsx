import { useCallback, useEffect, useState } from 'react';
import type { ThemeType } from '../../utils/themeManifesto';
import { useCelebration } from '../../contexts/CelebrationContext';
import { JackpotOverlay } from './JackpotOverlay';
import { SmallWinCard } from './SmallWinCard';
import { LossPlate } from './LossPlate';

export interface ThemedCelebrationProps {
  tier: 'jackpot' | 'small' | 'loss' | null;
  amount: number | null;
  message: string | null;
  theme: ThemeType;
  surfaceRef: React.RefObject<HTMLDivElement | null>;
}

export function ThemedCelebration({ tier, amount, theme, surfaceRef }: ThemedCelebrationProps) {
  const { setPendingTick, clearPendingTick } = useCelebration();
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => { setDismissed(false); }, [tier, amount]);

  useEffect(() => {
    if (tier === 'small' || tier === 'jackpot') {
      const delta = amount ?? 0;
      if (delta > 0) {
        setPendingTick({ delta, durationMs: tier === 'jackpot' ? 1200 : 600 });
        return () => clearPendingTick();
      }
    }
    return undefined;
  }, [tier, amount, setPendingTick, clearPendingTick]);

  const onDismiss = useCallback(() => setDismissed(true), []);

  if (tier === null || dismissed) return null;

  if (tier === 'jackpot' && amount !== null) {
    return <JackpotOverlay amount={amount} theme={theme} onDismiss={onDismiss} />;
  }
  if (tier === 'small' && amount !== null) {
    return <SmallWinCard amount={amount} theme={theme} onDismiss={onDismiss} />;
  }
  if (tier === 'loss') {
    return <LossPlate theme={theme} surfaceRef={surfaceRef} onDismiss={onDismiss} />;
  }
  return null;
}
