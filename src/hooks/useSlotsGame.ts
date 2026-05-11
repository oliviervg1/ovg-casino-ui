import { useState, useRef, useCallback, useEffect } from 'react';
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

/**
 * Spin settle time, in ms. Aligned with SlotReel's slowest staggered stop
 * (reel index 2 stops at 2500ms — see `STAGGER_MS` in `Slots/SlotReel.tsx`).
 * Visual cycling runs every 100ms until this point; win evaluation fires here.
 */
const SETTLE_MS = 2500;

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

  // Re-init reels whenever the symbol pool changes (e.g. emoji fallbacks → Gemini URLs land).
  // Gated by a ref so the effect doesn't fire on identity-only re-renders or on the
  // post-spin spinning=true→false flip (which would otherwise wipe a freshly-set winning payline).
  const lastSymbolsKey = useRef<string>('');
  useEffect(() => {
    if (symbols.length === 0) return;
    const key = symbols.join('|');
    if (spinning) {
      // Track the latest pool key without re-picking, so when spinning ends the
      // post-spin re-run finds key === lastSymbolsKey.current and early-returns.
      // Without this, a mid-spin pool change would cause the effect to overwrite
      // the spin's finalReels at end-of-spin, decoupling visible reels from the
      // win that was just evaluated.
      lastSymbolsKey.current = key;
      return;
    }
    if (key === lastSymbolsKey.current) return;
    lastSymbolsKey.current = key;
    const pick = () => symbols[Math.floor(Math.random() * symbols.length)];
    setReelStates([
      { top: pick(), middle: pick(), bottom: pick() },
      { top: pick(), middle: pick(), bottom: pick() },
      { top: pick(), middle: pick(), bottom: pick() },
    ]);
  }, [symbols, spinning]);

  const spin = useCallback(() => {
    if (spinning || balance < bet || symbols.length === 0) return;
    setSpinning(true);
    setWin(null);
    setMessage(null);
    onUpdateBalance?.(-bet);
    soundEngine.playSlotSpin(theme, SETTLE_MS);

    const pick = () => symbolsRef.current[Math.floor(Math.random() * symbolsRef.current.length)];
    const pickReel = (): ReelCells => ({ top: pick(), middle: pick(), bottom: pick() });

    // Live cycling for the visual reel-state change while spinning is still useful as a fallback
    // when SlotReel's animated stack isn't visible (test/jsdom environments). Cap at the slowest
    // reel duration so cycling stops in lockstep with the visual.
    const cycleInterval = setInterval(() => {
      setReelStates([pickReel(), pickReel(), pickReel()]);
    }, 100);

    setTimeout(() => {
      clearInterval(cycleInterval);
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
    }, SETTLE_MS);

    // No need to return a cleanup from spin() itself — the spin function is invoked imperatively;
    // the interval + timeout always reach completion within SETTLE_MS and clean themselves up.
  }, [bet, balance, theme, spinning, onUpdateBalance, symbols.length]);

  return { bet, setBet, reelStates, spinning, win, message, spin };
}
