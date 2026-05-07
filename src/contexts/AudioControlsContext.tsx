import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ThemeType } from '../utils/themeManifesto';

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

const STORAGE_KEY = 'ovg-audio-muted';

const AudioControlsContext = createContext<AudioControls | null>(null);

function readInitialMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function AudioControlsProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState<boolean>(readInitialMuted);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* ignore */ }
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
