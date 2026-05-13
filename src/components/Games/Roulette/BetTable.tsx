import { motion } from 'motion/react';

export type BetType = 'red' | 'black' | 'even' | 'odd';

export interface BetTableProps {
  bet: number;
  betType: string | null;
  onSelect: (t: BetType) => void;
  disabled: boolean;
}

const BET_CELL_TREATMENT: Record<BetType, string> = {
  red: 'bg-gradient-to-br from-red-500 to-red-700',
  black: 'bg-gradient-to-br from-gray-800 to-black',
  even: 'bg-[linear-gradient(135deg,_#dc2626_0%,_#dc2626_50%,_#171717_50%,_#171717_100%)]',
  odd: 'bg-[linear-gradient(135deg,_#171717_0%,_#171717_50%,_#dc2626_50%,_#dc2626_100%)]',
};

const BET_CELLS: BetType[] = ['red', 'black', 'even', 'odd'];

export function BetTable({ bet, betType, onSelect, disabled }: BetTableProps) {
  return (
    <div
      data-testid="bet-table"
      className="w-full max-w-2xl rounded-xl p-3 md:p-4 bg-[repeating-linear-gradient(45deg,_var(--theme-secondary)_0px,_var(--theme-secondary)_8px,_var(--theme-primary)_8px,_var(--theme-primary)_16px)] shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {BET_CELLS.map(type => {
          const isActive = betType === type;
          return (
            <button
              key={type}
              data-testid={`bet-cell-${type}`}
              data-bet-type={type}
              data-active={isActive ? 'true' : 'false'}
              onClick={() => onSelect(type)}
              disabled={disabled}
              className={`relative py-[2vh] px-2 rounded-lg text-[11px] md:text-[14px] tracking-tight whitespace-nowrap uppercase font-bold text-white transition-all duration-200 ${BET_CELL_TREATMENT[type]} ${
                isActive
                  ? 'ring-[0.4vh] ring-yellow-400 scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                  : 'opacity-90 hover:opacity-100 hover:scale-[1.02]'
              } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            >
              {type}
              {isActive && (
                <motion.div
                  data-testid="bet-chip"
                  initial={{ y: -40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[5vh] h-[5vh] rounded-full bg-theme-accent border-[0.4vh] border-white flex items-center justify-center text-[1.5vh] md:text-[1.8vh] text-white font-bold shadow-[0_4px_8px_rgba(0,0,0,0.4)] pointer-events-none"
                >
                  {bet}
                </motion.div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
