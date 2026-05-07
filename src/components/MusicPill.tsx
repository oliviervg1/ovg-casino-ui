import { Music, VolumeX } from 'lucide-react';
import { useAudioControls } from '../contexts/AudioControlsContext';
import { useTheme } from '../hooks/useTheme';
import { useMotion } from '../hooks/useMotion';
import { themeManifesto } from '../utils/themeManifesto';

const GAME_TYPE_LABEL: Record<string, string> = {
  slots: 'Slots',
  roulette: 'Roulette',
  bingo: 'Bingo',
  world: 'World',
};

export function MusicPill() {
  const { muted, toggleMute, nowPlaying } = useAudioControls();
  const motion = useMotion();
  const docTheme = useTheme();
  if (!nowPlaying) return null;

  const themeName = themeManifesto[nowPlaying.theme]?.displayName ?? docTheme.displayName;
  const gameLabel = GAME_TYPE_LABEL[nowPlaying.gameType] ?? nowPlaying.gameType;
  const animating = !muted && motion.shouldAnimate;

  return (
    <button
      type="button"
      data-testid="music-pill"
      data-muted={String(muted)}
      onClick={toggleMute}
      aria-label={muted ? 'Unmute music' : 'Mute music'}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-xs"
    >
      {muted ? (
        <VolumeX className="w-3.5 h-3.5 opacity-70" />
      ) : (
        <Music className="w-3.5 h-3.5 opacity-70" />
      )}
      <span className="font-medium opacity-90">Lyria 3 · {themeName} {gameLabel}</span>
      <span className="flex items-end gap-[2px] h-3">
        {[0, 1, 2, 3].map(i => (
          <span
            key={i}
            data-testid="music-pill-bar"
            className="w-[3px] bg-current rounded-sm"
            style={{
              height: muted ? '20%' : '40%',
              animation: animating ? `music-pill-bar-${i} 600ms ease-in-out infinite alternate` : 'none',
              opacity: muted ? 0.3 : 0.9,
            }}
          />
        ))}
      </span>
      <style>{`
        @keyframes music-pill-bar-0 { from { height: 30%; } to { height: 90%; } }
        @keyframes music-pill-bar-1 { from { height: 80%; } to { height: 35%; } }
        @keyframes music-pill-bar-2 { from { height: 45%; } to { height: 100%; } }
        @keyframes music-pill-bar-3 { from { height: 70%; } to { height: 25%; } }
      `}</style>
    </button>
  );
}
