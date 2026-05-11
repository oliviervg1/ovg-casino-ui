import { motion } from 'motion/react';

export interface BottomLedBarProps {
  win: 'jackpot' | 'small' | null;
}

const variants = {
  idle: { backgroundPosition: '0% 50%', opacity: 0.5 },
  small: { backgroundPosition: ['0% 50%', '100% 50%'], opacity: 0.85 },
  jackpot: { backgroundPosition: ['0% 50%', '100% 50%'], opacity: 1 },
};

export function BottomLedBar({ win }: BottomLedBarProps) {
  const state: keyof typeof variants = win ?? 'idle';
  const repeat = win ? Infinity : 0;
  const duration = win === 'jackpot' ? 0.6 : win === 'small' ? 1.0 : 0.2;
  return (
    <motion.div
      data-testid="bottom-led-bar"
      data-state={state}
      animate={variants[state]}
      transition={{ duration, repeat, ease: 'linear' }}
      className="h-[1vh] mt-3 rounded-full bg-[length:200%_100%] bg-gradient-to-r from-transparent via-theme-accent to-transparent"
      style={{ backgroundColor: 'transparent' }}
    />
  );
}
