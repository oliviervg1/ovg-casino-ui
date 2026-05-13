import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ThemeType } from '../utils/themeManifesto';
import { soundEngine, AUDIO_MUTED_STORAGE_KEY } from '../utils/SoundEngine';

export type NowPlayingGameType = 'roulette' | 'slots' | 'bingo' | 'world';

export interface NowPlaying {
  theme: ThemeType;
  gameType: NowPlayingGameType;
}

export interface AudioControls {
  muted: boolean;
  toggleMute: () => void;
  nowPlaying: NowPlaying | null;
  setNowPlaying: (np: NowPlaying | null) => void;
}

const AudioControlsContext = createContext<AudioControls | null>(null);

function readInitialMuted(): boolean {
  try {
    return localStorage.getItem(AUDIO_MUTED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function AudioControlsProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState<boolean>(readInitialMuted);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);

  // Keep SoundEngine's mute in lockstep with the React-side truth. SoundEngine
  // reads localStorage once at module load; without this, a user who muted in
  // one session and unmutes in the next has the music element unmute correctly
  // while SFX (SoundEngine masterGain) stay silent.
  useEffect(() => { soundEngine.setMuted(muted); }, [muted]);

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev;
      try { localStorage.setItem(AUDIO_MUTED_STORAGE_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const value = useMemo<AudioControls>(
    () => ({ muted, toggleMute, nowPlaying, setNowPlaying }),
    [muted, toggleMute, nowPlaying],
  );

  return <AudioControlsContext.Provider value={value}>{children}</AudioControlsContext.Provider>;
}

export function useAudioControls(): AudioControls {
  const ctx = useContext(AudioControlsContext);
  if (!ctx) throw new Error('useAudioControls must be used within an AudioControlsProvider');
  return ctx;
}
