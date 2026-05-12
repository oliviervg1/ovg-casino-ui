import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useMotion } from '../../hooks/useMotion';
import { themeManifesto, type ThemeType } from '../../utils/themeManifesto';
import { themeCopy } from '../../utils/themeCopy';

interface Props {
  theme: ThemeType;
  surfaceRef: React.RefObject<HTMLDivElement | null>;
  onDismiss: () => void;
}

export function LossPlate({ theme, surfaceRef, onDismiss }: Props) {
  const motionPrefs = useMotion();
  const wiggle = themeManifesto[theme].wiggle;

  useEffect(() => {
    const dismissTimer = setTimeout(onDismiss, 2000);
    return () => clearTimeout(dismissTimer);
  }, [onDismiss]);

  useEffect(() => {
    if (!motionPrefs.shouldAnimate) return;
    const el = surfaceRef.current;
    if (!el) return;
    el.style.setProperty('--wiggle-duration', `${wiggle.duration_ms}ms`);
    el.style.setProperty('--wiggle-magnitude', `${wiggle.magnitude_px}px`);
    el.classList.add('wiggle-active');
    const removeTimer = setTimeout(() => {
      el.classList.remove('wiggle-active');
      el.style.removeProperty('--wiggle-duration');
      el.style.removeProperty('--wiggle-magnitude');
    }, wiggle.duration_ms);
    return () => {
      clearTimeout(removeTimer);
      el.classList.remove('wiggle-active');
      el.style.removeProperty('--wiggle-duration');
      el.style.removeProperty('--wiggle-magnitude');
    };
  }, [motionPrefs.shouldAnimate, surfaceRef, wiggle.duration_ms, wiggle.magnitude_px]);

  return (
    <AnimatePresence>
      <motion.div
        key="loss-plate"
        aria-hidden="true"
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="bg-black/70 px-6 py-3 rounded-full">
          <span className={`${themeManifesto[theme].font} text-white/80`}>{themeCopy[theme].loss}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
