import { type ReactNode, useRef, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Confetti from 'react-confetti';
import { useAssets } from '../../hooks/useAssets';
import { useMusic } from '../../hooks/useMusic';

export interface GameShellProps {
  name: string;
  theme: string;
  bgKey: string;
  extraAssetKeys: string[];
  gameType: 'roulette' | 'slots' | 'bingo';
  win: 'jackpot' | 'small' | null;
  bet: number;
  onBet: (n: number) => void;
  onPlay: () => void;
  playLabel: string;
  playDisabled: boolean;
  message: string | null;
  balance: number;
  onBack: () => void;
  children: ReactNode;
}

export function GameShell(props: GameShellProps) {
  const { assets, loading: assetsLoading } = useAssets([props.bgKey, ...props.extraAssetKeys]);
  const { musicUrl, loading: musicLoading } = useMusic(props.theme, props.gameType);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current && musicUrl) {
      audioRef.current.src = musicUrl;
      audioRef.current.loop = true;
      audioRef.current.volume = 0.4;
      audioRef.current.play()?.catch(() => { /* user-gesture required */ });
    }
  }, [musicUrl]);

  if (assetsLoading || musicLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-bg text-white">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-theme-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p>Generating unique game assets…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-bg text-white" style={{ backgroundImage: `url(${assets[props.bgKey]})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <audio ref={audioRef} />
      <div className="bg-black/60 min-h-screen p-6">
        <header className="flex items-center justify-between mb-8">
          <button onClick={props.onBack} className="flex items-center gap-2 opacity-80 hover:opacity-100">
            <ArrowLeft className="w-5 h-5" /> Back to Lobby
          </button>
          <h1 className="text-3xl font-casino tracking-wider">{props.name}</h1>
          <div className="opacity-90">Balance: {props.balance}</div>
        </header>

        <main className="max-w-4xl mx-auto">{props.children}</main>

        <div className="max-w-md mx-auto mt-8 flex items-center gap-4">
          <input
            type="number"
            value={props.bet}
            onChange={e => props.onBet(Number(e.target.value))}
            className="flex-1 bg-black/40 border border-white/20 rounded px-3 py-2 text-white"
            min={1}
          />
          <button
            onClick={props.onPlay}
            disabled={props.playDisabled}
            className="px-8 py-3 rounded-xl bg-theme-primary text-black font-bold tracking-wider disabled:opacity-50"
          >
            {props.playLabel}
          </button>
        </div>

        {props.message && <p className="text-center mt-4">{props.message}</p>}

        <AnimatePresence>
          {props.win === 'jackpot' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center bg-black/70 z-50"
            >
              <Confetti />
              <div className="text-7xl font-casino text-yellow-300">JACKPOT!</div>
            </motion.div>
          )}
          {props.win === 'small' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-green-500 px-6 py-3 rounded-full text-black font-bold"
            >
              You won!
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
