import { motion } from 'motion/react';

export function BingoMarker() {
  return (
    <motion.div
      data-testid="bingo-marker"
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 0.85 }}
      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      className="absolute inset-[8%] rounded-full bg-theme-accent border-[0.4vh] border-white shadow-[0_2px_6px_rgba(0,0,0,0.5)] pointer-events-none"
    />
  );
}
