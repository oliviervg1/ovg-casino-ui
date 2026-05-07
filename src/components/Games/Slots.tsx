import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { GameShell } from './GameShell';
import { evaluateSlotsResult } from './gameLogic';
import { useAssets } from '../../hooks/useAssets';
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

const FALLBACK_SYMBOLS_MAP: Record<string, string[]> = {
  sweets: ['🍭', '🧁', '🍬', '🍩'],
  egypt: ['🏺', '🛕', '🐪', '👁️'],
  space: ['🚀', '👽', '🪐', '☄️'],
  west: ['🤠', '🌵', '🐎', '🔫'],
  ocean: ['🦈', '🐙', '🐚', '🔱'],
  jungle: ['🐒', '🐍', '🗿', '🌴'],
  vampire: ['🦇', '🧛', '🩸', '🍷'],
  ninja: ['🥷', '🗡️', '🌸', '🏯'],
};

export function Slots({ name, theme, balance, onUpdateBalance, onBack }: Props) {
  const [bet, setBet] = useState(10);
  const [reels, setReels] = useState<string[]>(['', '', '']);
  const [spinning, setSpinning] = useState(false);
  const [win, setWin] = useState<'jackpot' | 'small' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const symbolKeys = [1, 2, 3, 4].map(n => `${theme}_${n}`);
  const extraAssetKeys = [`slots_${theme}`, ...symbolKeys];
  const { font: themeFont } = useTheme();

  // GameShell already preloads these via extraAssetKeys; this local call hits
  // the in-memory cache and gives us URL lookups for the reel rendering.
  const { assets } = useAssets(symbolKeys);

  const fallbackSymbols = FALLBACK_SYMBOLS_MAP[theme] || ['❓', '❓', '❓', '❓'];
  const currentSymbols = symbolKeys.map((k, i) => assets[k] || fallbackSymbols[i]);

  // Initialize reels once symbols resolve.
  useEffect(() => {
    if (reels[0] === '' && currentSymbols[0]) {
      setReels([currentSymbols[0], currentSymbols[1], currentSymbols[2]]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSymbols[0], currentSymbols[1], currentSymbols[2]]);

  function handleSpin() {
    if (spinning || balance < bet) return;
    setSpinning(true);
    setWin(null);
    setMessage(null);
    onUpdateBalance(-bet);
    soundEngine.playSlotSpin(theme as ThemeType, 2000);

    let spins = 0;
    const interval = setInterval(() => {
      setReels([
        currentSymbols[Math.floor(Math.random() * currentSymbols.length)],
        currentSymbols[Math.floor(Math.random() * currentSymbols.length)],
        currentSymbols[Math.floor(Math.random() * currentSymbols.length)],
      ]);
      spins++;
      if (spins > 20) {
        clearInterval(interval);

        const finalReels = [
          currentSymbols[Math.floor(Math.random() * currentSymbols.length)],
          currentSymbols[Math.floor(Math.random() * currentSymbols.length)],
          currentSymbols[Math.floor(Math.random() * currentSymbols.length)],
        ];
        setReels(finalReels);

        const result = evaluateSlotsResult(finalReels);
        if (result === 'jackpot') {
          const payout = bet * 50;
          onUpdateBalance(payout);
          setWin('jackpot');
          setMessage(`JACKPOT! +${payout}`);
          soundEngine.playWin(theme as ThemeType);
        } else if (result === 'small') {
          const payout = bet * 3;
          onUpdateBalance(payout);
          setWin('small');
          setMessage(`Small win: +${payout}`);
          soundEngine.playWin(theme as ThemeType);
        } else {
          setMessage('No match. Try again.');
          soundEngine.playLose(theme as ThemeType);
        }

        setSpinning(false);
      }
    }, 100);
  }

  return (
    <GameShell
      name={name}
      theme={theme}
      bgKey={`bg_slots_${theme}`}
      extraAssetKeys={extraAssetKeys}
      gameType="slots"
      win={win}
      bet={bet}
      onBet={setBet}
      onPlay={handleSpin}
      playLabel={spinning ? 'SPINNING...' : 'SPIN'}
      playDisabled={spinning || balance < bet}
      message={message}
      balance={balance}
      onBack={onBack}
    >
      <div data-testid="slots-surface" className="flex flex-col items-center">
        <motion.div
          animate={{
            x: spinning ? [-2, 2, -2, 2, 0] : 0,
            y: spinning ? [-1, 1, -1, 1, 0] : 0,
          }}
          transition={{ repeat: spinning ? Infinity : 0, duration: 0.2 }}
          className="bg-theme-bg/80 p-4 md:p-8 rounded-2xl border-[1vh] border-theme-primary mb-4 md:mb-8 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] relative w-full flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 pointer-events-none rounded-xl" />
          <div className="flex justify-center gap-[2vh] md:gap-[4vh] items-center">
            {reels.map((symbol, index) => (
              <motion.div
                key={index}
                animate={{
                  y: spinning ? [0, -60, 60, 0] : 0,
                  filter: spinning ? 'blur(4px)' : 'blur(0px)',
                  scale: win !== null && !spinning ? [1, 1.1, 1] : 1,
                }}
                transition={{
                  y: { repeat: spinning ? Infinity : 0, duration: 0.15, delay: index * 0.05 },
                  scale: { duration: 0.5, repeat: win !== null ? 3 : 0 },
                }}
                className={`w-[15vh] h-[20vh] md:w-[25vh] md:h-[35vh] bg-white rounded-xl flex items-center justify-center text-[8vh] md:text-[12vh] shadow-[0_5px_15px_rgba(0,0,0,0.3)] border-[0.5vh] border-gray-200 overflow-hidden relative ${themeFont} ${
                  win !== null && !spinning ? 'ring-[1vh] ring-yellow-400' : ''
                }`}
              >
                {symbol && symbol.startsWith('data:') ? (
                  <img src={symbol} alt="Slot symbol" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  symbol
                )}
                {win !== null && !spinning && (
                  <motion.div
                    animate={{ opacity: [0, 0.5, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute inset-0 bg-yellow-300 pointer-events-none mix-blend-overlay"
                  />
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </GameShell>
  );
}
