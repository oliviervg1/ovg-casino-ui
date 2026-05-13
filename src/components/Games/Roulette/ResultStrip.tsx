import { motion } from 'motion/react';
import { type RouletteColour } from '../gameLogic';

export interface ResultStripProps {
  resultNum: number | null;
  resultColour: RouletteColour | null;
}

const BADGE_BG: Record<RouletteColour, string> = {
  red: 'bg-red-600',
  black: 'bg-black',
  green: 'bg-green-600',
};

export function ResultStrip({ resultNum, resultColour }: ResultStripProps) {
  if (resultNum === null || resultColour === null) return null;
  return (
    <motion.div
      data-testid="result-strip"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex items-center gap-3 md:gap-4 px-4 py-2 md:py-3 rounded-xl bg-theme-bg/70 backdrop-blur-sm border-[0.3vh] border-theme-accent/40 shadow-md"
    >
      <div
        data-testid="result-pocket-badge"
        data-colour={resultColour}
        className={`w-[5vh] h-[5vh] rounded-full ${BADGE_BG[resultColour]} flex items-center justify-center text-white text-[2.5vh] font-bold border-[0.3vh] border-white shadow-md`}
      >
        {resultNum}
      </div>
    </motion.div>
  );
}
