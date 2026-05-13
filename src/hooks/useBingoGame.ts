import { useState, useCallback, useEffect, useRef } from 'react';
import { evaluateBingoBoard } from '../components/Games/gameLogic';
import { soundEngine } from '../utils/SoundEngine';
import type { ThemeType } from '../utils/themeManifesto';

export const DRAW_INTERVAL_MS = 600;
export const MAX_DRAWS = 12;
export const POOL_SIZE = 30;

function makeBoard(): number[][] {
  const pool = Array.from({ length: POOL_SIZE }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
  return [pool.slice(0, 3), pool.slice(3, 6), pool.slice(6, 9)];
}

export interface UseBingoGameOptions {
  theme: ThemeType;
  balance: number;
  onUpdateBalance?: (delta: number) => void;
}

export interface UseBingoGameReturn {
  bet: number;
  setBet: (n: number) => void;
  board: number[][];
  drawn: number[];
  drawing: boolean;
  win: 'jackpot' | 'small' | 'loss' | null;
  lastPayout: number | null;
  message: string | null;
  /** drawn[drawn.length - 1] when drawn is non-empty; null otherwise. */
  lastDrawn: number | null;
  play: () => void;
}

export function useBingoGame(opts: UseBingoGameOptions): UseBingoGameReturn {
  const { theme, balance, onUpdateBalance } = opts;
  const [bet, setBet] = useState(10);
  const [board, setBoard] = useState<number[][]>(() => makeBoard());
  const [drawn, setDrawn] = useState<number[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [win, setWin] = useState<'jackpot' | 'small' | 'loss' | null>(null);
  const [lastPayout, setLastPayout] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const play = useCallback(() => {
    if (drawing || balance < bet) return;
    setDrawing(true);
    setWin(null);
    setLastPayout(null);
    setMessage(null);
    setDrawn([]);
    // Capture the freshly-made board in a local so the setInterval closure evaluates
    // against the new board rather than the stale React state. setBoard(...) is async
    // and the first interval tick can't see the new value otherwise. (Same pattern as
    // current Bingo.tsx; preserved verbatim.)
    const currentBoard = makeBoard();
    setBoard(currentBoard);
    onUpdateBalance?.(-bet);

    let drawCount = 0;
    const localDrawn: number[] = [];
    const interval = setInterval(() => {
      drawCount++;
      let n: number;
      do { n = Math.floor(Math.random() * POOL_SIZE) + 1; } while (localDrawn.includes(n));
      localDrawn.push(n);
      setDrawn([...localDrawn]);
      soundEngine.playBingoDraw(theme);
      if (drawCount >= MAX_DRAWS || evaluateBingoBoard(currentBoard, localDrawn)) {
        clearInterval(interval);
        intervalRef.current = null;
        const won = evaluateBingoBoard(currentBoard, localDrawn);
        if (won) {
          const payout = bet * 5;
          onUpdateBalance?.(payout);
          setWin('small');
          setLastPayout(payout);
          setMessage(`Bingo! +${payout}`);
          soundEngine.playWin(theme);
        } else {
          setWin('loss');
          setLastPayout(0);
          setMessage('No bingo this round.');
          soundEngine.playLose(theme);
        }
        setDrawing(false);
      }
    }, DRAW_INTERVAL_MS);
    intervalRef.current = interval;
  }, [drawing, balance, bet, theme, onUpdateBalance]);

  const lastDrawn = drawn.length > 0 ? drawn[drawn.length - 1] : null;

  return {
    bet, setBet,
    board,
    drawn,
    drawing,
    win, lastPayout, message,
    lastDrawn,
    play,
  };
}
