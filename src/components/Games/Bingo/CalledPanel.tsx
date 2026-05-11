import { motion, AnimatePresence } from 'motion/react';

export interface CalledPanelProps {
  lastDrawn: number | null;
}

export function CalledPanel({ lastDrawn }: CalledPanelProps) {
  return (
    <div
      data-testid="called-panel"
      className="w-full md:w-[20vh] flex flex-col items-center gap-3 md:gap-4 p-3 md:p-4 rounded-2xl bg-theme-bg/70 backdrop-blur-sm border-[0.4vh] border-theme-primary/40 shadow-md"
    >
      <div className="text-[1.5vh] md:text-[1.6vh] uppercase tracking-wider text-theme-text/70 font-semibold">
        Just called
      </div>
      <div
        data-testid="just-called-badge"
        className="relative w-[10vh] h-[10vh] md:w-[12vh] md:h-[12vh] rounded-full bg-theme-bg/40 flex items-center justify-center"
      >
        <AnimatePresence mode="popLayout">
          {lastDrawn !== null && (
            <motion.div
              key={lastDrawn}
              initial={{ scale: 0, opacity: 0, y: -20 }}
              animate={{ scale: [1, 1.2, 1], opacity: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0, y: 20 }}
              transition={{ scale: { duration: 0.5 } }}
              className="absolute inset-0 rounded-full flex items-center justify-center text-[5vh] md:text-[6vh] font-bold text-white shadow-2xl border-[0.5vh] border-white bg-theme-primary"
            >
              {lastDrawn}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
