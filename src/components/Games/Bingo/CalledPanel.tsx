import { motion, AnimatePresence } from 'motion/react';
import { type BingoLines } from '../gameLogic';

export interface CalledPanelProps {
  lastDrawn: number | null;
  lines: BingoLines;
}

const TRACKER_ROW_LABELS: Array<{ id: string; label: string }> = [
  { id: 'rows0', label: 'Row 1' },
  { id: 'rows1', label: 'Row 2' },
  { id: 'rows2', label: 'Row 3' },
  { id: 'colsOrDiags', label: 'Cols & Diagonals' },
];

function isComplete(id: string, lines: BingoLines): boolean {
  if (id === 'rows0') return lines.rows[0];
  if (id === 'rows1') return lines.rows[1];
  if (id === 'rows2') return lines.rows[2];
  // colsOrDiags
  return lines.cols.some(b => b) || lines.diags.some(b => b);
}

export function CalledPanel({ lastDrawn, lines }: CalledPanelProps) {
  return (
    <div
      data-testid="called-panel"
      className="w-full md:w-[22vh] flex flex-col items-center gap-3 md:gap-4 p-3 md:p-4 rounded-2xl bg-theme-bg/70 backdrop-blur-sm border-[0.4vh] border-theme-primary/40 shadow-md"
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
      <div data-testid="lines-tracker" className="w-full flex flex-col gap-1.5 mt-1">
        {TRACKER_ROW_LABELS.map(({ id, label }) => {
          const complete = isComplete(id, lines);
          return (
            <div
              key={id}
              data-testid={`lines-tracker-${id}`}
              data-complete={complete ? 'true' : 'false'}
              className={`flex items-center justify-between text-[1.6vh] md:text-[1.7vh] px-3 py-1 rounded-md transition-colors ${
                complete
                  ? 'bg-theme-accent/30 text-white font-semibold'
                  : 'bg-theme-bg/30 text-theme-text/70'
              }`}
            >
              <span>{label}</span>
              <span aria-hidden="true">{complete ? '✓' : '—'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
