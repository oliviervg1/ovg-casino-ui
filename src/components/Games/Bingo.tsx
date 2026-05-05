import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { useAssets } from '../../hooks/useAssets';
import { useMusic } from '../../hooks/useMusic';
import { getThemeStyles } from '../../utils/themeStyles';
import { soundEngine } from '../../utils/SoundEngine';
import { ThemeType } from '../../App';

interface BingoProps {
  name: string;
  theme: string;
  balance: number;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

export function Bingo({ name, theme, balance, onUpdateBalance, onBack }: BingoProps) {
  const bgKey = `bg_bingo_${theme}`;
  
  const assetKeys = useMemo(() => [`${theme}_1`, bgKey], [theme, bgKey]);
  const { assets, loading, progress } = useAssets(assetKeys as any);
  const { musicUrl, loading: musicLoading } = useMusic(theme, 'bingo');
  const themeStyles = getThemeStyles(theme);

  const totalItems = assetKeys.length + 1;
  const loadedAssetsCount = Math.round((progress / 100) * assetKeys.length);
  const loadedMusicCount = musicLoading ? 0 : 1;
  const combinedProgress = Math.round(((loadedAssetsCount + loadedMusicCount) / totalItems) * 100);

  const [betAmount, setBetAmount] = useState<number>(10);
  const [playing, setPlaying] = useState(false);
  const [board, setBoard] = useState<{ number: number; marked: boolean }[][]>([]);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [message, setMessage] = useState<string>('Place your bet to start!');
  const [winAnimation, setWinAnimation] = useState(false);
  const [lastDrawn, setLastDrawn] = useState<number | null>(null);
  const { width, height } = useWindowSize();

  const freeSpaceAsset = assets[`${theme}_1`];
  const fallbackFreeSpaceMap: Record<string, string> = {
    sweets: '🍬',
    egypt: '🐪',
    space: '🚀',
    west: '🤠',
    ocean: '🦈',
    jungle: '🐒',
    vampire: '🦇',
    ninja: '🥷',
  };
  const fallbackFreeSpace = fallbackFreeSpaceMap[theme] || '❓';

  const generateBoard = () => {
    const newBoard: { number: number; marked: boolean }[][] = [];
    const usedNumbers = new Set<number>();

    for (let i = 0; i < 5; i++) {
      const row: { number: number; marked: boolean }[] = [];
      for (let j = 0; j < 5; j++) {
        if (i === 2 && j === 2) {
          row.push({ number: 0, marked: true }); // Free space
          continue;
        }
        let num;
        do {
          num = Math.floor(Math.random() * 75) + 1;
        } while (usedNumbers.has(num));
        usedNumbers.add(num);
        row.push({ number: num, marked: false });
      }
      newBoard.push(row);
    }
    setBoard(newBoard);
    setDrawnNumbers([]);
    setLastDrawn(null);
    setWinAnimation(false);
    setPlaying(true);
    setMessage('Game started! Draw a number.');
    onUpdateBalance(-betAmount);
  };

  const drawNumber = () => {
    if (!playing) return;
    
    let num;
    do {
      num = Math.floor(Math.random() * 75) + 1;
    } while (drawnNumbers.includes(num) && drawnNumbers.length < 75);

    if (drawnNumbers.length >= 75) {
      setMessage('Game over! No bingo.');
      setPlaying(false);
      soundEngine.playLose(theme as ThemeType);
      return;
    }

    setDrawnNumbers([...drawnNumbers, num]);
    setLastDrawn(num);
    setMessage(`Drawn: ${num}`);
    soundEngine.playBingoDraw(theme as ThemeType);

    const newBoard = board.map(row => 
      row.map(cell => 
        cell.number === num ? { ...cell, marked: true } : cell
      )
    );
    setBoard(newBoard);

    // Check win condition (simple horizontal/vertical line)
    let won = false;
    
    // Check rows
    for (let i = 0; i < 5; i++) {
      if (newBoard[i].every(cell => cell.marked)) won = true;
    }
    
    // Check columns
    for (let j = 0; j < 5; j++) {
      let colWin = true;
      for (let i = 0; i < 5; i++) {
        if (!newBoard[i][j].marked) colWin = false;
      }
      if (colWin) won = true;
    }

    if (won) {
      const winAmount = betAmount * 5;
      onUpdateBalance(winAmount);
      setMessage(`BINGO! You won $${winAmount}!`);
      setWinAnimation(true);
      setPlaying(false);
      soundEngine.playWin(theme as ThemeType);
    }
  };

  if (loading || musicLoading) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-theme-primary mb-6"></div>
        <p className="text-xl opacity-80 animate-pulse mb-4 text-center">Generating unique game assets and music using Google Cloud AI</p>
        <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-theme-primary transition-all duration-300 ease-out"
            style={{ width: `${combinedProgress}%` }}
          ></div>
        </div>
        <p className="mt-2 text-sm opacity-60">{combinedProgress}%</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full mx-auto relative flex flex-col">
      {musicUrl && <audio src={musicUrl} autoPlay loop />}
      {winAnimation && <Confetti width={width} height={height} recycle={false} numberOfPieces={600} gravity={0.2} />}
      <div className="flex justify-between items-center mb-4 md:mb-8 flex-shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity bg-black/40 px-4 py-2 rounded-full backdrop-blur-md">
          <ArrowLeft className="w-5 h-5" /> Back to Lobby
        </button>
      </div>

      <div className={`bg-theme-card/80 backdrop-blur-xl rounded-3xl p-4 md:p-8 shadow-2xl border border-white/20 text-center relative overflow-hidden flex-1 flex flex-col justify-between ${winAnimation ? 'ring-4 ring-yellow-400 ring-opacity-50' : ''}`}>
        {assets[bgKey] && (
          <div 
            className="absolute inset-0 opacity-30 bg-cover bg-center pointer-events-none"
            style={{ backgroundImage: `url(${assets[bgKey]})` }}
          />
        )}
        <AnimatePresence>
          {winAnimation && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none flex items-center justify-center z-50"
            >
              <div className="absolute inset-0 bg-yellow-400/20 animate-pulse" />
              <div className="text-[10vh] md:text-[15vh] font-bold text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] rotate-[-10deg]">
                BINGO!
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="relative z-10 flex-1 flex flex-col justify-between h-full">
        <h2 className={`mb-4 md:mb-8 text-[4vh] md:text-[6vh] ${themeStyles.title}`}>{name}</h2>

        <div className="mb-4 md:mb-8 relative flex-1 flex flex-col items-center justify-center min-h-0">
          <div className="grid grid-cols-5 gap-[1vh] md:gap-[2vh] w-full max-w-[60vh] mx-auto bg-theme-bg/80 p-[2vh] md:p-[3vh] rounded-2xl shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] border-[0.5vh] border-theme-primary">
            {board.length > 0 ? board.map((row, i) => 
              row.map((cell, j) => (
                <motion.div
                  key={`${i}-${j}`}
                  animate={{ 
                    scale: cell.marked ? [1, 1.15, 1] : 1,
                    rotate: cell.number === lastDrawn ? [0, -10, 10, 0] : 0
                  }}
                  transition={{ duration: 0.3 }}
                  className={`aspect-square flex items-center justify-center rounded-xl text-[3vh] md:text-[4vh] transition-all duration-300 overflow-hidden relative ${themeStyles.font} ${
                    cell.marked 
                      ? 'bg-theme-accent text-white shadow-[0_0_20px_rgba(0,0,0,0.4)] ring-[0.5vh] ring-white/50' 
                      : 'bg-white text-gray-800 border-b-[0.5vh] border-gray-300'
                  }`}
                >
                  {cell.marked && cell.number !== 0 && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 0.3 }}
                      className="absolute inset-0 bg-black rounded-full m-[0.5vh]"
                    />
                  )}
                  <span className="relative z-10">
                    {i === 2 && j === 2 ? (
                      freeSpaceAsset ? (
                        <img src={freeSpaceAsset} alt="Free Space" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        fallbackFreeSpace
                      )
                    ) : cell.number}
                  </span>
                </motion.div>
              ))
            ) : (
              <div className="col-span-5 py-[10vh] text-gray-400 font-medium text-[2vh] md:text-[3vh]">
                Click Start Game to generate a board
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center mb-4 md:mb-8 flex-shrink-0">
          <AnimatePresence mode="wait">
            {lastDrawn && (
              <motion.div
                key={lastDrawn}
                initial={{ scale: 0, opacity: 0, y: -20 }}
                animate={{ scale: [1, 1.2, 1], opacity: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0, y: 20 }}
                transition={{ scale: { duration: 0.5 } }}
                className={`w-[10vh] h-[10vh] md:w-[15vh] md:h-[15vh] rounded-full flex items-center justify-center text-[5vh] md:text-[7vh] shadow-2xl border-[0.5vh] border-white mb-[2vh] bg-theme-primary text-white ${themeStyles.font}`}
              >
                {lastDrawn}
              </motion.div>
            )}
          </AnimatePresence>
          <div className={`h-[4vh] text-[2.5vh] md:text-[3.5vh] ${themeStyles.message}`}>
            {message}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 bg-black/20 p-4 md:p-6 rounded-2xl backdrop-blur-sm flex-shrink-0">
          {!playing ? (
            <>
              <div className="flex items-center gap-2 md:gap-4 bg-theme-bg/80 p-2 md:p-4 rounded-xl shadow-inner">
                <span className={`pl-2 md:pl-4 text-[2vh] md:text-[3vh] ${themeStyles.label}`}>Bet: $</span>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className={`bg-transparent w-[12vh] md:w-[15vh] text-[3vh] md:text-[4vh] outline-none ${themeStyles.font}`}
                  min="1"
                />
              </div>
              <button
                onClick={generateBoard}
                disabled={betAmount > balance || betAmount <= 0}
                className={`bg-theme-primary text-white px-[4vh] py-[2vh] rounded-xl text-[2.5vh] md:text-[3.5vh] hover:bg-theme-secondary transition-all shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 w-full md:w-auto ${themeStyles.font}`}
              >
                START GAME
              </button>
            </>
          ) : (
            <button
              onClick={drawNumber}
              className={`bg-theme-accent text-white px-[4vh] py-[2vh] rounded-xl text-[2.5vh] md:text-[3.5vh] hover:bg-theme-primary transition-all shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:-translate-y-1 w-full md:w-auto ${themeStyles.font}`}
            >
              DRAW NUMBER
            </button>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
