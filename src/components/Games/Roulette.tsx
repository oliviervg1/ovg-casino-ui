import { useState } from 'react';
import { motion } from 'motion/react';
import { GameShell } from './GameShell';
import { evaluateRouletteBet, type RouletteColour } from './gameLogic';
import { useTheme } from '../../hooks/useTheme';
import { soundEngine } from '../../utils/SoundEngine';
import { ThemeType } from '../../App';

interface Props {
  name: string;
  theme: string;
  balance: number;
  onUpdateBalance: (delta: number) => void;
  onBack: () => void;
}

type BetType = 'red' | 'black' | 'even' | 'odd';
const BET_TYPES: BetType[] = ['red', 'black', 'even', 'odd'];

export function Roulette({ name, theme, balance, onUpdateBalance, onBack }: Props) {
  const [bet, setBet] = useState(10);
  const [betType, setBetType] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [resultNum, setResultNum] = useState<number | null>(null);
  const [resultColour, setResultColour] = useState<RouletteColour | null>(null);
  const [win, setWin] = useState<'jackpot' | 'small' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const extraAssetKeys = [`roulette_${theme}`];
  const { font: themeFont } = useTheme();

  function handleSpin() {
    if (!betType || spinning || balance < bet) return;
    setSpinning(true);
    setWin(null);
    setMessage(null);
    onUpdateBalance(-bet);
    soundEngine.playRouletteSpin(theme as ThemeType, 2500);

    const num = Math.floor(Math.random() * 37);
    const colour: RouletteColour = num === 0 ? 'green' : (num % 2 === 1 ? 'red' : 'black');

    setTimeout(() => {
      setResultNum(num);
      setResultColour(colour);
      const won = evaluateRouletteBet(num, colour, betType);
      if (won) {
        const payout = betType.startsWith('number-') ? bet * 35 : bet * 2;
        onUpdateBalance(payout);
        const tier: 'jackpot' | 'small' = payout >= bet * 10 ? 'jackpot' : 'small';
        setWin(tier);
        setMessage(`Won ${payout}!`);
        soundEngine.playWin(theme as ThemeType);
      } else {
        setMessage(`Landed on ${num} (${colour}). Better luck next time.`);
        soundEngine.playLose(theme as ThemeType);
      }
      setSpinning(false);
    }, 2500);
  }

  return (
    <GameShell
      name={name}
      theme={theme}
      bgKey={`bg_roulette_${theme}`}
      extraAssetKeys={extraAssetKeys}
      gameType="roulette"
      win={win}
      bet={bet}
      onBet={setBet}
      onPlay={handleSpin}
      playLabel={spinning ? 'SPINNING...' : 'SPIN THE WHEEL'}
      playDisabled={spinning || !betType}
      message={message}
      balance={balance}
      onBack={onBack}
    >
      <div data-testid="roulette-surface" className="flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35vh] h-[35vh] md:w-[45vh] md:h-[45vh] bg-black/20 rounded-full blur-xl" />
          <motion.div
            animate={{
              rotate: spinning ? 3600 : 0,
              scale: spinning ? [1, 1.05, 1] : 1,
            }}
            transition={{
              rotate: { duration: 2.5, ease: [0.2, 0.8, 0.2, 1] },
              scale: { duration: 0.5, repeat: spinning ? Infinity : 0 },
            }}
            className={`w-[30vh] h-[30vh] md:w-[40vh] md:h-[40vh] rounded-full border-[1vh] border-theme-primary flex items-center justify-center text-[8vh] md:text-[12vh] relative z-10 ${themeFont} ${
              resultColour === 'red'
                ? 'bg-red-600 text-white'
                : resultColour === 'black'
                ? 'bg-gray-900 text-white'
                : resultColour === 'green'
                ? 'bg-green-500 text-white'
                : 'bg-theme-bg'
            }`}
          >
            <div className="absolute inset-3 rounded-full border-4 border-black/20 pointer-events-none" />
            <motion.div
              animate={{ rotate: spinning ? -7200 : 0 }}
              transition={{ duration: 2.5, ease: [0.2, 0.8, 0.2, 1] }}
              className="absolute inset-0 rounded-full"
            >
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[1.5vh] h-[1.5vh] bg-white rounded-full shadow-md" />
            </motion.div>
            <span className="relative z-10 drop-shadow-md">
              {spinning ? '?' : resultNum !== null ? resultNum : '0'}
            </span>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 w-full max-w-2xl">
          {BET_TYPES.map(type => (
            <button
              key={type}
              onClick={() => setBetType(type)}
              disabled={spinning}
              className={`py-[1.5vh] rounded-xl text-[2vh] md:text-[2.5vh] capitalize transition-all duration-300 shadow-lg ${themeFont} ${
                betType === type
                  ? 'bg-theme-accent text-white ring-4 ring-theme-accent/50 scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                  : 'bg-theme-bg/80 opacity-80 hover:opacity-100 hover:scale-105 hover:bg-theme-bg'
              } ${
                type === 'red'
                  ? 'border-b-8 border-red-500'
                  : type === 'black'
                  ? 'border-b-8 border-gray-800'
                  : 'border-b-8 border-theme-primary'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
