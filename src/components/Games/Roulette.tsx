import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { useAssets } from '../../hooks/useAssets';
import { useMusic } from '../../hooks/useMusic';
import { getThemeStyles } from '../../utils/themeStyles';
import { soundEngine } from '../../utils/SoundEngine';
import { ThemeType } from '../../App';

interface RouletteProps {
  name: string;
  theme: string;
  balance: number;
  onUpdateBalance: (amount: number) => void;
  onBack: () => void;
}

type BetType = 'red' | 'black' | 'even' | 'odd' | null;

export function Roulette({ name, theme, balance, onUpdateBalance, onBack }: RouletteProps) {
  const [betAmount, setBetAmount] = useState<number>(10);
  const [betType, setBetType] = useState<BetType>(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ number: number; color: 'red' | 'black' | 'green' } | null>(null);
  const [message, setMessage] = useState<string>('Place your bet!');
  const [winAnimation, setWinAnimation] = useState(false);
  const { width, height } = useWindowSize();

  const bgKey = `bg_roulette_${theme}`;
  const { assets, loading, progress } = useAssets([bgKey]);
  const { musicUrl, loading: musicLoading } = useMusic(theme, 'roulette');
  const themeStyles = getThemeStyles(theme);

  const totalItems = 2; // 1 asset + 1 music
  const loadedAssetsCount = Math.round((progress / 100) * 1);
  const loadedMusicCount = musicLoading ? 0 : 1;
  const combinedProgress = Math.round(((loadedAssetsCount + loadedMusicCount) / totalItems) * 100);

  const handleSpin = () => {
    if (!betType) {
      setMessage('Please select a bet type first!');
      return;
    }
    if (betAmount > balance) {
      setMessage('Insufficient balance!');
      return;
    }
    if (betAmount <= 0) {
      setMessage('Bet amount must be greater than 0!');
      return;
    }

    setSpinning(true);
    setWinAnimation(false);
    setMessage('Spinning...');
    onUpdateBalance(-betAmount);
    soundEngine.playRouletteSpin(theme as ThemeType, 3000);

    setTimeout(() => {
      const num = Math.floor(Math.random() * 37);
      let color: 'red' | 'black' | 'green' = 'green';
      
      if (num !== 0) {
        // Simplified roulette colors
        color = num % 2 === 0 ? 'black' : 'red';
      }

      setResult({ number: num, color });

      let won = false;
      if (num !== 0) {
        if (betType === color) won = true;
        if (betType === 'even' && num % 2 === 0) won = true;
        if (betType === 'odd' && num % 2 !== 0) won = true;
      }

      if (won) {
        const winAmount = betAmount * 2;
        onUpdateBalance(winAmount);
        setMessage(`You won $${winAmount}!`);
        setWinAnimation(true);
        soundEngine.playWin(theme as ThemeType);
      } else {
        setMessage('You lost. Try again!');
        soundEngine.playLose(theme as ThemeType);
      }
      
      setSpinning(false);
    }, 3000);
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
      {winAnimation && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} gravity={0.2} />}
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
                WINNER!
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="relative z-10 flex-1 flex flex-col justify-between h-full">
          <h2 className={`mb-4 md:mb-8 text-[4vh] md:text-[6vh] ${themeStyles.title}`}>{name}</h2>

          <div className="mb-4 md:mb-8 relative flex-1 flex flex-col items-center justify-center min-h-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35vh] h-[35vh] md:w-[45vh] md:h-[45vh] bg-black/20 rounded-full blur-xl" />
            <motion.div 
              animate={{ 
                rotate: spinning ? 3600 : 0,
                scale: spinning ? [1, 1.05, 1] : winAnimation ? [1, 1.2, 1] : 1,
                boxShadow: winAnimation ? ['0 0 30px rgba(0,0,0,0.5)', '0 0 60px rgba(250,204,21,0.8)', '0 0 30px rgba(0,0,0,0.5)'] : '0 0 30px rgba(0,0,0,0.5)'
              }}
              transition={{ 
                rotate: { duration: 3, ease: [0.2, 0.8, 0.2, 1] },
                scale: { duration: spinning ? 0.5 : 0.5, repeat: spinning ? Infinity : (winAnimation ? 3 : 0) },
                boxShadow: { duration: 0.5, repeat: winAnimation ? 3 : 0 }
              }}
              className={`w-[30vh] h-[30vh] md:w-[40vh] md:h-[40vh] mx-auto rounded-full border-[1vh] border-theme-primary flex items-center justify-center text-[8vh] md:text-[12vh] relative z-10 ${themeStyles.font} ${
                result?.color === 'red' ? 'bg-red-600 text-white' : 
                result?.color === 'black' ? 'bg-gray-900 text-white' : 
                result?.color === 'green' ? 'bg-green-500 text-white' : 'bg-theme-bg'
              }`}
            >
              {/* Inner ring */}
              <div className="absolute inset-3 rounded-full border-4 border-black/20 pointer-events-none" />
              
              {/* Spinning ball */}
              <motion.div
                animate={{ rotate: spinning ? -7200 : 0 }}
                transition={{ duration: 3, ease: [0.2, 0.8, 0.2, 1] }}
                className="absolute inset-0 rounded-full"
              >
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[1.5vh] h-[1.5vh] bg-white rounded-full shadow-md" />
              </motion.div>

              <span className="relative z-10 drop-shadow-md">{spinning ? '?' : result ? result.number : '0'}</span>
            </motion.div>
            <div className={`mt-4 md:mt-8 h-[4vh] text-[2.5vh] md:text-[3.5vh] ${themeStyles.message}`}>{message}</div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-8 flex-shrink-0">
            {(['red', 'black', 'even', 'odd'] as BetType[]).map((type) => (
              <button
                key={type}
                onClick={() => setBetType(type)}
                disabled={spinning}
                className={`py-[1.5vh] rounded-xl text-[2vh] md:text-[2.5vh] capitalize transition-all duration-300 shadow-lg ${themeStyles.font} ${
                  betType === type 
                    ? 'bg-theme-accent text-white ring-4 ring-theme-accent/50 scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]' 
                    : 'bg-theme-bg/80 opacity-80 hover:opacity-100 hover:scale-105 hover:bg-theme-bg'
                } ${type === 'red' ? 'border-b-8 border-red-500' : type === 'black' ? 'border-b-8 border-gray-800' : 'border-b-8 border-theme-primary'}`}
              >
                {type}
              </button>
            ))}
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
              disabled={spinning || !betType}
              className={`bg-theme-primary text-white px-[4vh] py-[2vh] rounded-xl text-[2.5vh] md:text-[3.5vh] hover:bg-theme-secondary transition-all shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 w-full md:w-auto ${themeStyles.font}`}
            >
              {spinning ? 'SPINNING...' : 'SPIN THE WHEEL'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
