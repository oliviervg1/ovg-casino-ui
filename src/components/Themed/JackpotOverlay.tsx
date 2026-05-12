import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { themeManifesto, type ThemeType } from '../../utils/themeManifesto';
import { themeCopy } from '../../utils/themeCopy';
import { themeParticles } from '../../utils/themeParticles';
import { ParticleField } from './ParticleField';
import { WinAmountCounter } from './WinAmountCounter';

interface Props {
  amount: number;
  theme: ThemeType;
  onDismiss: () => void;
}

export function JackpotOverlay({ amount, theme, onDismiss }: Props) {
  useEffect(() => {
    const id = setTimeout(onDismiss, 5000);
    return () => clearTimeout(id);
  }, [onDismiss]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onDismiss();
  };

  const particles = themeParticles[theme];

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key="jackpot-overlay"
        data-testid="jackpot-backdrop"
        onClick={handleBackdropClick}
        aria-hidden="true"
        className="fixed inset-0 z-40 flex items-center justify-center"
        style={{ background: 'radial-gradient(circle at center, var(--theme-accent) 0%, rgba(0,0,0,0.85) 70%)' }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ParticleField
          pool={particles.pool}
          primitives={particles.primitives}
          primitiveTint={particles.primitiveTint}
          count={50}
          motion={particles.motion}
        />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div data-testid="jackpot-label" className={`${themeManifesto[theme].font} text-7xl text-theme-accent drop-shadow-lg`}>
            {themeCopy[theme].jackpotLabel}
          </div>
          <div className="text-5xl">
            <WinAmountCounter amount={amount} tier="jackpot" theme={theme} />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
