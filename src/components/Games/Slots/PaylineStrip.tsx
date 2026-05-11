import { motion } from 'motion/react';

export interface PaylineStripProps {
  winning: boolean;
}

export function PaylineStrip({ winning }: PaylineStripProps) {
  return (
    <div
      data-testid="payline-strip"
      data-state={winning ? 'win' : 'idle'}
      className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex items-center pointer-events-none z-10"
    >
      <div
        data-testid="payline-arrow-left"
        className="text-theme-accent text-[3vh] md:text-[4vh] -ml-[1vh]"
        aria-hidden
      >
        ▶
      </div>
      <motion.div
        animate={
          winning
            ? { opacity: [0.3, 1, 0.3], scaleY: [1, 1.6, 1] }
            : { opacity: 0.3, scaleY: 1 }
        }
        transition={
          winning
            ? { duration: 0.6, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.2 }
        }
        className="flex-1 h-[0.6vh] mx-2 rounded-full bg-theme-accent shadow-[0_0_12px_var(--theme-accent,_currentColor)]"
      />
      <div
        data-testid="payline-arrow-right"
        className="text-theme-accent text-[3vh] md:text-[4vh] -mr-[1vh]"
        aria-hidden
      >
        ◀
      </div>
    </div>
  );
}
