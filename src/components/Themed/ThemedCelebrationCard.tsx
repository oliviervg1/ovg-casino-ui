import { useEffect } from 'react';
import { themeManifesto, type ThemeType } from '../../utils/themeManifesto';
import { themeCopy } from '../../utils/themeCopy';
import { themeParticles } from '../../utils/themeParticles';
import { ParticleField } from './ParticleField';
import { WinAmountCounter } from './WinAmountCounter';

type CelebrationTier = 'small' | 'jackpot';

export interface ThemedCelebrationCardProps {
  tier: CelebrationTier;
  amount: number;
  theme: ThemeType;
  /** Tailwind classes for the outer container — caller picks fixed-viewport vs surface-anchored. */
  containerClass: string;
  onDismiss: () => void;
}

interface TierConfig {
  durationMs: number;
  particleCount: number;
  labelSize: string;       // tailwind text-[Xvh] class
  cardClass: string;       // wrapper around the inner content
  label: (theme: ThemeType) => string;
}

const TIER_CONFIG: Record<CelebrationTier, TierConfig> = {
  small: {
    durationMs: 2500,
    particleCount: 15,
    labelSize: 'text-[5vh]',
    cardClass: 'w-[60vh] max-w-[80%] mx-auto aspect-[3/2] bg-theme-card/95 rounded-3xl shadow-2xl border-[0.4vh] border-theme-accent flex flex-col items-center justify-center gap-[2vh] p-[3vh] relative overflow-hidden',
    label: (theme) => themeCopy[theme].small,
  },
  jackpot: {
    durationMs: 5000,
    particleCount: 50,
    labelSize: 'text-[8vh] md:text-[10vh]',
    cardClass: 'flex flex-col items-center justify-center gap-[3vh] relative',
    label: (theme) => themeCopy[theme].jackpotLabel,
  },
};

export function ThemedCelebrationCard({
  tier, amount, theme, containerClass, onDismiss,
}: ThemedCelebrationCardProps) {
  const config = TIER_CONFIG[tier];
  const particles = themeParticles[theme];

  useEffect(() => {
    const id = setTimeout(onDismiss, config.durationMs);
    return () => clearTimeout(id);
  }, [config.durationMs, onDismiss]);

  const handleClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onDismiss();
  };

  return (
    <div
      data-testid={`celebration-card-${tier}`}
      onClick={handleClick}
      className={containerClass}
      aria-hidden="true"
    >
      <ParticleField
        pool={particles.pool}
        primitives={particles.primitives}
        primitiveTint={particles.primitiveTint}
        count={config.particleCount}
        motion={particles.motion}
      />
      <div data-testid="celebration-card-content" className={config.cardClass}>
        <div className={`${config.labelSize} ${themeManifesto[theme].font} text-theme-accent text-center font-black tracking-wider drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]`}>
          {config.label(theme)}
        </div>
        <WinAmountCounter amount={amount} tier={tier} />
      </div>
    </div>
  );
}
