import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameShell } from './GameShell';
import { evaluateBingoBoard } from './gameLogic';
import { getThemeStyles } from '../../utils/themeStyles';
import { soundEngine } from '../../utils/SoundEngine';
import { ThemeType } from '../../App';

interface Props {
  name: string;
  theme: string;
  balance: number;
  onUpdateBalance: (delta: number) => void;
  onBack: () => void;
}

function makeBoard(): number[][] {
  const pool = Array.from({ length: 30 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
  return [pool.slice(0, 3), pool.slice(3, 6), pool.slice(6, 9)];
}

export function Bingo({ name, theme, balance, onUpdateBalance, onBack }: Props) {
  const [bet, setBet] = useState(10);
  const [board, setBoard] = useState<number[][]>(() => makeBoard());
  const [drawn, setDrawn] = useState<number[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [win, setWin] = useState<'jackpot' | 'small' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const extraAssetKeys = [`bingo_${theme}`];
  const themeStyles = getThemeStyles(theme);

  function handlePlay() {
    if (drawing || balance < bet) return;
    setDrawing(true);
    setWin(null);
    setMessage(null);
    setDrawn([]);
    // Deviation from plan: capture the freshly-made board in a local variable so
    // the setInterval closure evaluates against the new board rather than the
    // stale React state. setBoard(...) is async and would not update `board` in
    // time for the first interval tick.
    const currentBoard = makeBoard();
    setBoard(currentBoard);
    onUpdateBalance(-bet);

    let drawCount = 0;
    const localDrawn: number[] = [];
    const interval = setInterval(() => {
      drawCount++;
      let n: number;
      do { n = Math.floor(Math.random() * 30) + 1; } while (localDrawn.includes(n));
      localDrawn.push(n);
      setDrawn([...localDrawn]);
      soundEngine.playBingoDraw(theme as ThemeType);
      if (drawCount >= 12 || evaluateBingoBoard(currentBoard, localDrawn)) {
        clearInterval(interval);
        const won = evaluateBingoBoard(currentBoard, localDrawn);
        if (won) {
          const payout = bet * 5;
          onUpdateBalance(payout);
          setWin('small');
          setMessage(`Bingo! +${payout}`);
          soundEngine.playWin(theme as ThemeType);
        } else {
          setMessage('No bingo this round.');
          soundEngine.playLose(theme as ThemeType);
        }
        setDrawing(false);
      }
    }, 600);
  }

  const drawnSet = new Set(drawn);
  const lastDrawn = drawn.length > 0 ? drawn[drawn.length - 1] : null;

  return (
    <GameShell
      name={name}
      theme={theme}
      bgKey={`bg_bingo_${theme}`}
      extraAssetKeys={extraAssetKeys}
      gameType="bingo"
      win={win}
      bet={bet}
      onBet={setBet}
      onPlay={handlePlay}
      playLabel={drawing ? 'DRAWING...' : 'PLAY BINGO'}
      playDisabled={drawing || balance < bet}
      message={message}
      balance={balance}
      onBack={onBack}
    >
      <div data-testid="bingo-surface" className="flex flex-col items-center gap-6">
        <div className="grid grid-cols-3 gap-[1vh] md:gap-[2vh] w-full max-w-[40vh] mx-auto bg-theme-bg/80 p-[2vh] md:p-[3vh] rounded-2xl shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] border-[0.5vh] border-theme-primary">
          {board.map((row, i) =>
            row.map((value, j) => {
              const marked = drawnSet.has(value);
              return (
                <motion.div
                  key={`${i}-${j}`}
                  animate={{
                    scale: marked ? [1, 1.15, 1] : 1,
                    rotate: value === lastDrawn ? [0, -10, 10, 0] : 0,
                  }}
                  transition={{ duration: 0.3 }}
                  className={`aspect-square flex items-center justify-center rounded-xl text-[3vh] md:text-[4vh] transition-all duration-300 overflow-hidden relative ${themeStyles.font} ${
                    marked
                      ? 'bg-theme-accent text-white shadow-[0_0_20px_rgba(0,0,0,0.4)] ring-[0.5vh] ring-white/50'
                      : 'bg-white text-gray-800 border-b-[0.5vh] border-gray-300'
                  }`}
                >
                  {marked && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 0.3 }}
                      className="absolute inset-0 bg-black rounded-full m-[0.5vh]"
                    />
                  )}
                  <span className="relative z-10">{value}</span>
                </motion.div>
              );
            })
          )}
        </div>

        <div className="flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {lastDrawn !== null && (
              <motion.div
                key={lastDrawn}
                initial={{ scale: 0, opacity: 0, y: -20 }}
                animate={{ scale: [1, 1.2, 1], opacity: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0, y: 20 }}
                transition={{ scale: { duration: 0.5 } }}
                className={`w-[10vh] h-[10vh] md:w-[12vh] md:h-[12vh] rounded-full flex items-center justify-center text-[5vh] md:text-[6vh] shadow-2xl border-[0.5vh] border-white mb-[2vh] bg-theme-primary text-white ${themeStyles.font}`}
              >
                {lastDrawn}
              </motion.div>
            )}
          </AnimatePresence>

          {drawn.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-md">
              {drawn.map((n, idx) => (
                <span
                  key={`${n}-${idx}`}
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm bg-theme-bg/60 border border-theme-primary text-white ${themeStyles.font}`}
                >
                  {n}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </GameShell>
  );
}
