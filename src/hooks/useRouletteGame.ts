import { useState, useRef, useCallback } from 'react';
import { angleOfPocket, evaluateRouletteBet, type RouletteColour } from '../components/Games/gameLogic';
import { soundEngine } from '../utils/SoundEngine';
import type { ThemeType } from '../utils/themeManifesto';

export const SETTLE_MS = 2500;
const WHEEL_TURNS = 5;
const BALL_TURNS = 7;

export interface UseRouletteGameOptions {
  theme: ThemeType;
  balance: number;
  onUpdateBalance?: (delta: number) => void;
}

export interface UseRouletteGameReturn {
  bet: number;
  setBet: (n: number) => void;
  betType: string | null;
  setBetType: (t: string | null) => void;
  spinning: boolean;
  /** Result pocket. null while spinning AND before any spin. Set at the end of each spin. */
  resultNum: number | null;
  resultColour: RouletteColour | null;
  win: 'jackpot' | 'small' | 'loss' | null;
  lastPayout: number | null;
  message: string | null;
  /** Cumulative wheel rotation (degrees, clockwise). Updates AT spin start so the wheel
   *  has a known target to decelerate into during the 2.5s spin window. */
  wheelRotation: number;
  /** Cumulative ball rotation (degrees, counter-clockwise — always negative or 0).
   *  Each spin subtracts BALL_TURNS × 360. */
  ballRotation: number;
  spin: () => void;
}

export function useRouletteGame(opts: UseRouletteGameOptions): UseRouletteGameReturn {
  const { theme, balance, onUpdateBalance } = opts;
  const [bet, setBet] = useState(10);
  const [betType, setBetType] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [resultNum, setResultNum] = useState<number | null>(null);
  const [resultColour, setResultColour] = useState<RouletteColour | null>(null);
  const [win, setWin] = useState<'jackpot' | 'small' | 'loss' | null>(null);
  const [lastPayout, setLastPayout] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ballRotation, setBallRotation] = useState(0);
  const lastTargetRef = useRef<number | null>(null);

  const spin = useCallback(() => {
    if (!betType || spinning || balance < bet) return;

    const num = Math.floor(Math.random() * 37);
    const colour: RouletteColour = num === 0 ? 'green' : num % 2 === 1 ? 'red' : 'black';

    const lastN = lastTargetRef.current;
    const angleCorrection = lastN === null ? -angleOfPocket(num) : angleOfPocket(lastN) - angleOfPocket(num);
    setWheelRotation(prev => prev + WHEEL_TURNS * 360 + angleCorrection);
    setBallRotation(prev => prev - BALL_TURNS * 360);
    lastTargetRef.current = num;

    setSpinning(true);
    setWin(null);
    setLastPayout(null);
    setMessage(null);
    setResultNum(null);
    setResultColour(null);
    onUpdateBalance?.(-bet);
    soundEngine.playRouletteSpin(theme, SETTLE_MS);

    setTimeout(() => {
      setResultNum(num);
      setResultColour(colour);
      const won = evaluateRouletteBet(num, colour, betType);
      if (won) {
        const payout = betType.startsWith('number-') ? bet * 35 : bet * 2;
        onUpdateBalance?.(payout);
        const tier: 'jackpot' | 'small' = payout >= bet * 10 ? 'jackpot' : 'small';
        setWin(tier);
        setLastPayout(payout);
        setMessage(`Won ${payout}!`);
        soundEngine.playWin(theme);
      } else {
        setWin('loss');
        setLastPayout(0);
        setMessage(`Landed on ${num} (${colour}). Better luck next time.`);
        soundEngine.playLose(theme);
      }
      setSpinning(false);
    }, SETTLE_MS);
  }, [bet, balance, betType, theme, spinning, onUpdateBalance]);

  return {
    bet, setBet,
    betType, setBetType,
    spinning,
    resultNum, resultColour,
    win, lastPayout, message,
    wheelRotation, ballRotation,
    spin,
  };
}
