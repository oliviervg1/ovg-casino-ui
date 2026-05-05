import { useState, useEffect } from 'react';
import { getMusic } from '../lib/MusicManager';

export function useMusic(theme: string, gameType: string) {
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let currentUrl: string | null = null;
    setLoading(true);

    getMusic(theme, gameType).then(url => {
      if (mounted) {
        setMusicUrl(url);
        currentUrl = url;
        setLoading(false);
      } else if (url) {
        URL.revokeObjectURL(url);
      }
    }).catch(err => {
      console.error("Failed to load music:", err);
      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [theme, gameType]);

  return { musicUrl, loading };
}
