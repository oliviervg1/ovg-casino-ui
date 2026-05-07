import { type ReactNode, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Confetti from 'react-confetti';
import { useAssets } from '../../hooks/useAssets';
import { useMusic } from '../../hooks/useMusic';
import { useAudioControls, type NowPlayingGameType } from '../../contexts/AudioControlsContext';
import { ThemedButton } from '../Themed/ThemedButton';
import { ThemedSkeleton } from '../Themed/ThemedSkeleton';
import { BetControl } from './BetControl';
import { GameStatusLine } from './GameStatusLine';
import type { ThemeType } from '../../utils/themeManifesto';

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
  const { muted, setNowPlaying } = useAudioControls();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Register what's playing for the header MusicPill while this shell is mounted.
  useEffect(() => {
    setNowPlaying({ theme: props.theme as ThemeType, gameType: props.gameType as NowPlayingGameType });
    return () => setNowPlaying(null);
  }, [props.theme, props.gameType, setNowPlaying]);

  useEffect(() => {
    if (audioRef.current && musicUrl) {
      audioRef.current.src = musicUrl;
      audioRef.current.loop = true;
      audioRef.current.volume = 0.4;
      audioRef.current.muted = muted;
      audioRef.current.play()?.catch(() => { /* user-gesture required */ });
    }
  }, [musicUrl, muted]);

  // Apply mute changes immediately to a playing audio element.
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const loading = assetsLoading || musicLoading;

  return (
    <div
      className="flex-1 flex flex-col bg-theme-bg text-white relative"
      style={
        assets[props.bgKey]
          ? { backgroundImage: `url(${assets[props.bgKey]})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : undefined
      }
    >
      <audio ref={audioRef} />
      {/* Backdrop-blur instead of the previous solid 60% black wash. */}
      <div className="flex-1 flex flex-col bg-black/30 backdrop-blur-sm p-6">
        <main className="flex-1 max-w-4xl w-full mx-auto flex flex-col items-stretch justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <ThemedSkeleton aspectRatio="16/9" width="min(80%, 480px)" data-testid="game-shell-skeleton" />
              <p className="text-sm opacity-80">Generating unique {props.theme} world…</p>
            </div>
          ) : (
            props.children
          )}
        </main>

        <div className="max-w-2xl w-full mx-auto mt-8 flex flex-col items-center gap-3">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full">
            <BetControl value={props.bet} onChange={props.onBet} disabled={props.playDisabled} />
            <ThemedButton onClick={props.onPlay} disabled={props.playDisabled} size="hero">
              {props.playLabel}
            </ThemedButton>
          </div>
          <GameStatusLine isLoading={loading} />
          {props.message && <p className="text-center text-sm opacity-90">{props.message}</p>}
        </div>

        <AnimatePresence>
          {props.win === 'jackpot' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center bg-black/70 z-40"
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
              className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-green-500 px-6 py-3 rounded-full text-black font-bold z-40"
            >
              You won!
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
