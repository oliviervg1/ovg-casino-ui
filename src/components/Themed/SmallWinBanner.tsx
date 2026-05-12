import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { themeManifesto, type ThemeType } from '../../utils/themeManifesto';
import { themeCopy } from '../../utils/themeCopy';
import { themeParticles } from '../../utils/themeParticles';
import { WinAmountCounter } from './WinAmountCounter';

interface Props {
  amount: number;
  theme: ThemeType;
  onDismiss: () => void;
}

export function SmallWinBanner({ amount, theme, onDismiss }: Props) {
  useEffect(() => {
    const id = setTimeout(onDismiss, 3000);
    return () => clearTimeout(id);
  }, [onDismiss]);

  const marker = themeParticles[theme].pool[0];

  return (
    <AnimatePresence>
      <motion.div
        key="small-win-banner"
        data-testid="small-win-wrapper"
        aria-hidden="true"
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="pointer-events-auto bg-theme-card/90 px-6 py-3 rounded-full shadow-lg flex items-center gap-3">
          <span className="text-2xl">{marker}</span>
          <span className={`${themeManifesto[theme].font} text-theme-accent`}>{themeCopy[theme].small}</span>
          <WinAmountCounter amount={amount} tier="small" theme={theme} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
