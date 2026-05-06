import { useState, useEffect } from 'react';
import { getMusic } from '../lib/MusicManager';

export function useMusic(theme: string, gameType: string) {
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getMusic(theme, gameType)
      .then((url) => {
        if (mounted) {
          setMusicUrl(url);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Music load failed:', err);
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [theme, gameType]);

  return { musicUrl, loading };
}
