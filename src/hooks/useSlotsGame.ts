import { useState, useRef, useCallback } from 'react';
import { evaluateSlotsResult } from '../components/Games/gameLogic';
import { soundEngine } from '../utils/SoundEngine';
import type { ThemeType } from '../utils/themeManifesto';
import type { ReelCells } from '../components/Games/Slots/SlotReel';

export interface UseSlotsGameOptions {
  theme: ThemeType;
  /** Symbol pool for this theme (Gemini URLs or emoji fallbacks). */
  symbols: string[];
  balance: number;
  onUpdateBalance?: (delta: number) => void;
}

export interface UseSlotsGameReturn {
  bet: number;
  setBet: (n: number) => void;
  reelStates: [ReelCells, ReelCells, ReelCells];
  spinning: boolean;
  win: 'jackpot' | 'small' | null;
  message: string | null;
  spin: () => void;
}

const emptyCells: ReelCells = { top: '', middle: '', bottom: '' };

export function useSlotsGame(opts: UseSlotsGameOptions): UseSlotsGameReturn {
  const { theme, symbols, balance, onUpdateBalance } = opts;
  const [bet, setBet] = useState(10);
  const [reelStates, setReelStates] = useState<[ReelCells, ReelCells, ReelCells]>([emptyCells, emptyCells, emptyCells]);
  const [spinning, setSpinning] = useState(false);
  const [win, setWin] = useState<'jackpot' | 'small' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Keep the latest props readable from inside setInterval without re-creating the spin closure.
  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;

  const spin = useCallback(() => {
    if (spinning || balance < bet || symbols.length === 0) return;
    setSpinning(true);
    setWin(null);
    setMessage(null);
    onUpdateBalance?.(-bet);
    soundEngine.playSlotSpin(theme, 2000);

    const pick = () => symbolsRef.current[Math.floor(Math.random() * symbolsRef.current.length)];
    const pickReel = (): ReelCells => ({ top: pick(), middle: pick(), bottom: pick() });
    let spins = 0;
    const interval = setInterval(() => {
      setReelStates([pickReel(), pickReel(), pickReel()]);
      spins++;
      if (spins > 20) {
        clearInterval(interval);
        const finalReels: [ReelCells, ReelCells, ReelCells] = [pickReel(), pickReel(), pickReel()];
        setReelStates(finalReels);

        const payline = finalReels.map(r => r.middle);
        const result = evaluateSlotsResult(payline);
        if (result === 'jackpot') {
          const payout = bet * 50;
          onUpdateBalance?.(payout);
          setWin('jackpot');
          setMessage(`JACKPOT! +${payout}`);
          soundEngine.playWin(theme);
        } else if (result === 'small') {
          const payout = bet * 3;
          onUpdateBalance?.(payout);
          setWin('small');
          setMessage(`Small win: +${payout}`);
          soundEngine.playWin(theme);
        } else {
          setMessage('No match. Try again.');
          soundEngine.playLose(theme);
        }
        setSpinning(false);
      }
    }, 100);
  }, [bet, balance, theme, spinning, onUpdateBalance, symbols.length]);

  return { bet, setBet, reelStates, spinning, win, message, spin };
}
