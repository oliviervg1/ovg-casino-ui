import { useEffect, useRef } from 'react';
import { useMusic } from './useMusic';
import { useAudioControls, type NowPlayingGameType } from '../contexts/AudioControlsContext';
import type { ThemeType } from '../utils/themeManifesto';

/**
 * Owns the audio lifecycle for any themed music-playing surface (GameShell + WorldPage):
 *
 * 1. Resolves the per-(theme, gameType) Lyria-generated music URL via useMusic.
 * 2. Registers the (theme, gameType) pair with AudioControlsContext so the
 *    AppHeader MusicPill displays "now playing" while this surface is mounted.
 * 3. On musicUrl change: assigns src, sets loop + volume, and calls play().
 *    Autoplay rejections are swallowed (browsers require a user gesture before
 *    audio can start; the page becomes audible after the first interaction).
 * 4. Syncs the audio element's muted property with AudioControlsContext.muted.
 *
 * Returns { audioRef, musicLoading }. Caller renders `<audio ref={audioRef} />`.
 */
export function useThemedMusic(theme: ThemeType, gameType: NowPlayingGameType) {
  const { musicUrl, loading: musicLoading } = useMusic(theme, gameType);
  const { muted, setNowPlaying } = useAudioControls();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Register what's playing for the header MusicPill while mounted.
  useEffect(() => {
    setNowPlaying({ theme, gameType });
    return () => setNowPlaying(null);
  }, [theme, gameType, setNowPlaying]);

  useEffect(() => {
    if (audioRef.current && musicUrl) {
      audioRef.current.src = musicUrl;
      audioRef.current.loop = true;
      audioRef.current.volume = 0.4;
      audioRef.current.play()?.catch(() => { /* user-gesture required */ });
    }
    // `muted` is intentionally NOT in deps — the dedicated mute effect below
    // owns it so toggling mute does not re-assign src and restart playback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicUrl]);

  // Apply mute changes immediately. Runs on mount too so initial-mount mute
  // state is established here, not in the load effect.
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  return { audioRef, musicLoading };
}
