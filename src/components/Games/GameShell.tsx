import { type ReactNode, useRef, useEffect } from 'react';
import { useAssets } from '../../hooks/useAssets';
import { useMusic } from '../../hooks/useMusic';
import { useAudioControls, type NowPlayingGameType } from '../../contexts/AudioControlsContext';
import { ThemedButton } from '../Themed/ThemedButton';
import { ThemedSkeleton } from '../Themed/ThemedSkeleton';
import { ThemedCelebration } from '../Themed/ThemedCelebration';
import { BetControl } from './BetControl';
import { GameStatusLine } from './GameStatusLine';
import type { ThemeType } from '../../utils/themeManifesto';

export interface GameShellProps {
  theme: ThemeType;
  bgKey: string;
  extraAssetKeys: string[];
  gameType: 'roulette' | 'slots' | 'bingo';
  win: 'jackpot' | 'small' | 'loss' | null;
  lastPayout: number | null;
  bet: number;
  onBet: (n: number) => void;
  onPlay: () => void;
  playLabel: string;
  playDisabled: boolean;
  message: string | null;
  balance: number;
  children: ReactNode;
}

export function GameShell(props: GameShellProps) {
  const { assets, loading: assetsLoading } = useAssets([props.bgKey, ...props.extraAssetKeys]);
  const { musicUrl, loading: musicLoading } = useMusic(props.theme, props.gameType);
  const { muted, setNowPlaying } = useAudioControls();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  // Register what's playing for the header MusicPill while this shell is mounted.
  useEffect(() => {
    setNowPlaying({ theme: props.theme, gameType: props.gameType as NowPlayingGameType });
    return () => setNowPlaying(null);
  }, [props.theme, props.gameType, setNowPlaying]);

  useEffect(() => {
    if (audioRef.current && musicUrl) {
      audioRef.current.src = musicUrl;
      audioRef.current.loop = true;
      audioRef.current.volume = 0.4;
      audioRef.current.play()?.catch(() => { /* user-gesture required */ });
    }
    // `muted` is intentionally NOT in deps — the dedicated mute effect below owns it
    // so toggling mute does not re-assign src and restart playback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicUrl]);

  // Apply mute changes immediately to a playing audio element. Runs on mount too,
  // so initial-mount mute state is established here, not in the load effect.
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
      <div ref={surfaceRef} className="flex-1 flex flex-col bg-black/30 backdrop-blur-sm p-6">
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
          <div data-testid="bet-row" className="flex flex-col md:flex-row items-center justify-center gap-4 w-full">
            <BetControl value={props.bet} onChange={props.onBet} disabled={props.playDisabled} />
            <ThemedButton onClick={props.onPlay} disabled={props.playDisabled} size="hero">
              {props.playLabel}
            </ThemedButton>
          </div>
          <GameStatusLine isLoading={loading} />
          {props.message && <p aria-live="polite" role="status" className="sr-only">{props.message}</p>}
        </div>

        <ThemedCelebration
          tier={props.win}
          amount={props.lastPayout}
          theme={props.theme}
          surfaceRef={surfaceRef}
        />
      </div>
    </div>
  );
}
