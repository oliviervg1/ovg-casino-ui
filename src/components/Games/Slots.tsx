import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { useAssets } from '../../hooks/useAssets';
import { useMusic } from '../../hooks/useMusic';
import { getThemeStyles } from '../../utils/themeStyles';
import { soundEngine } from '../../utils/SoundEngine';
import { ThemeType } from '../../App';

interface SlotsProps {
  name: string;
  theme: string;
  balance: number;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

export function Slots({ name, theme, balance, onUpdateBalance, onBack }: SlotsProps) {
  const bgKey = `bg_slots_${theme}`;
  
  const assetKeys = useMemo(() => [
    `${theme}_1`, `${theme}_2`, `${theme}_3`, `${theme}_4`,
    bgKey
  ], [theme, bgKey]);
  
  const { assets, loading, progress } = useAssets(assetKeys as any);
  const { musicUrl, loading: musicLoading } = useMusic(theme, 'slots');
  const themeStyles = getThemeStyles(theme);

  const totalItems = assetKeys.length + 1;
  const loadedAssetsCount = Math.round((progress / 100) * assetKeys.length);
  const loadedMusicCount = musicLoading ? 0 : 1;
  const combinedProgress = Math.round(((loadedAssetsCount + loadedMusicCount) / totalItems) * 100);

  const [betAmount, setBetAmount] = useState<number>(10);
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState<string[]>(['?', '?', '?']);
  const [message, setMessage] = useState<string>('Ready to spin!');
  const [winType, setWinType] = useState<'none' | 'small' | 'jackpot'>('none');
  const { width, height } = useWindowSize();

  const fallbackSymbolsMap: Record<string, string[]> = {
    sweets: ['🍭', '🧁', '🍬', '🍩'],
    egypt: ['🏺', '🛕', '🐪', '👁️'],
    space: ['🚀', '👽', '🪐', '☄️'],
    west: ['🤠', '🌵', '🐎', '🔫'],
    ocean: ['🦈', '🐙', '🐚', '🔱'],
    jungle: ['🐒', '🐍', '🗿', '🌴'],
    vampire: ['🦇', '🧛', '🩸', '🍷'],
    ninja: ['🥷', '🗡️', '🌸', '🏯'],
  };
  const fallbackSymbols = fallbackSymbolsMap[theme] || ['❓', '❓', '❓', '❓'];

  const getSymbols = () => {
    return [
      assets[`${theme}_1`] || fallbackSymbols[0],
      assets[`${theme}_2`] || fallbackSymbols[1],
      assets[`${theme}_3`] || fallbackSymbols[2],
      assets[`${theme}_4`] || fallbackSymbols[3],
    ];
  };

  const currentSymbols = getSymbols();

  // Initialize reels once symbols are loaded
  useEffect(() => {
    if (!loading && reels[0] === '?') {
      setReels([
        currentSymbols[0],
        currentSymbols[1],
        currentSymbols[2],
      ]);
    }
  }, [loading, currentSymbols, reels]);

  const handleSpin = () => {
    if (betAmount > balance) {
      setMessage('Insufficient balance!');
      return;
    }
    if (betAmount <= 0) {
      setMessage('Bet amount must be greater than 0!');
      return;
    }

    setSpinning(true);
    setWinType('none');
    setMessage('Spinning...');
    onUpdateBalance(-betAmount);
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
        
        if (finalReels[0] === finalReels[1] && finalReels[1] === finalReels[2]) {
          const winAmount = betAmount * 10;
          onUpdateBalance(winAmount);
          setMessage(`JACKPOT! You won $${winAmount}!`);
          setWinType('jackpot');
          soundEngine.playWin(theme as ThemeType);
        } else if (finalReels[0] === finalReels[1] || finalReels[1] === finalReels[2] || finalReels[0] === finalReels[2]) {
          const winAmount = betAmount * 2;
          onUpdateBalance(winAmount);
          setMessage(`Small win! You won $${winAmount}!`);
          setWinType('small');
          soundEngine.playWin(theme as ThemeType);
        } else {
          setMessage('No match. Try again!');
          soundEngine.playLose(theme as ThemeType);
        }
        
        setSpinning(false);
      }
    }, 100);
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
      {winType === 'jackpot' && <Confetti width={width} height={height} recycle={false} numberOfPieces={800} gravity={0.15} />}
      {winType === 'small' && <Confetti width={width} height={height} recycle={false} numberOfPieces={200} gravity={0.25} />}
      <div className="flex justify-between items-center mb-4 md:mb-8 flex-shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity bg-black/40 px-4 py-2 rounded-full backdrop-blur-md">
          <ArrowLeft className="w-5 h-5" /> Back to Lobby
        </button>
      </div>

      <div className={`bg-theme-card/80 backdrop-blur-xl rounded-3xl p-4 md:p-8 shadow-2xl border border-white/20 text-center relative overflow-hidden flex-1 flex flex-col justify-between ${winType !== 'none' ? 'ring-4 ring-yellow-400 ring-opacity-50' : ''}`}>
        {assets[bgKey] && (
          <div 
            className="absolute inset-0 opacity-30 bg-cover bg-center pointer-events-none"
            style={{ backgroundImage: `url(${assets[bgKey]})` }}
          />
        )}
        <AnimatePresence>
          {winType === 'jackpot' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none flex items-center justify-center z-50"
            >
              <div className="absolute inset-0 bg-yellow-400/20 animate-pulse" />
              <div className="text-[10vh] md:text-[15vh] font-bold text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] rotate-[-10deg]">
                JACKPOT!
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="relative z-10 flex-1 flex flex-col justify-between h-full">
          <h2 className={`mb-4 md:mb-8 text-[4vh] md:text-[6vh] ${themeStyles.title}`}>{name}</h2>

          <motion.div 
            animate={{ 
              x: spinning ? [-2, 2, -2, 2, 0] : 0,
              y: spinning ? [-1, 1, -1, 1, 0] : 0
            }}
            transition={{ repeat: spinning ? Infinity : 0, duration: 0.2 }}
            className="bg-theme-bg/80 p-4 md:p-8 rounded-2xl border-[1vh] border-theme-primary mb-4 md:mb-8 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] relative flex-1 flex items-center justify-center min-h-0"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 pointer-events-none rounded-xl" />
            <div className="flex justify-center gap-[2vh] md:gap-[4vh] h-full items-center">
              {reels.map((symbol, index) => (
                <motion.div
                  key={index}
                  animate={{ 
                    y: spinning ? [0, -60, 60, 0] : 0,
                    filter: spinning ? 'blur(4px)' : 'blur(0px)',
                    scale: winType !== 'none' && !spinning ? [1, 1.1, 1] : 1
                  }}
                  transition={{ 
                    y: { repeat: spinning ? Infinity : 0, duration: 0.15, delay: index * 0.05 },
                    scale: { duration: 0.5, repeat: winType !== 'none' ? 3 : 0 }
                  }}
                  className={`w-[15vh] h-[20vh] md:w-[25vh] md:h-[35vh] bg-white rounded-xl flex items-center justify-center text-[8vh] md:text-[12vh] shadow-[0_5px_15px_rgba(0,0,0,0.3)] border-[0.5vh] border-gray-200 overflow-hidden relative ${winType !== 'none' && !spinning ? 'ring-[1vh] ring-yellow-400' : ''}`}
                >
                  {symbol.startsWith('data:') ? (
                    <img src={symbol} alt="Slot symbol" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    symbol
                  )}
                  {winType !== 'none' && !spinning && (
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

          <div className={`h-[4vh] mb-4 md:mb-8 text-[2.5vh] md:text-[3.5vh] ${themeStyles.message}`}>
            {message}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 bg-black/20 p-4 md:p-6 rounded-2xl backdrop-blur-sm flex-shrink-0">
            <div className="flex items-center gap-2 md:gap-4 bg-theme-bg/80 p-2 md:p-4 rounded-xl shadow-inner">
              <span className={`pl-2 md:pl-4 text-[2vh] md:text-[3vh] ${themeStyles.label}`}>Bet: $</span>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Number(e.target.value))}
                disabled={spinning}
                className={`bg-transparent w-[12vh] md:w-[15vh] text-[3vh] md:text-[4vh] outline-none ${themeStyles.font}`}
                min="1"
              />
            </div>
            <button
              onClick={handleSpin}
              disabled={spinning}
              className={`bg-theme-secondary text-white px-[4vh] py-[2vh] rounded-xl text-[2.5vh] md:text-[3.5vh] hover:bg-theme-primary transition-all shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 w-full md:w-auto ${themeStyles.font}`}
            >
              {spinning ? 'SPINNING...' : 'SPIN'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
