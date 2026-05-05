import { useState, useEffect } from 'react';
import { getAsset } from '../lib/AssetManager';

export function useAssets(keys: string[]) {
  const [assets, setAssets] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadAssets() {
      setLoading(true);
      setProgress(0);
      const loadedAssets: Record<string, string> = {};
      
      let loadedCount = 0;
      const promises = keys.map(async (key) => {
        try {
          const url = await getAsset(key as any);
          loadedAssets[key] = url;
        } catch (e) {
          console.error(`Error loading asset ${key}:`, e);
        }
        loadedCount++;
        if (mounted) {
          setProgress(Math.round((loadedCount / keys.length) * 100));
        }
      });

      await Promise.all(promises);

      if (mounted) {
        setAssets(prev => ({ ...prev, ...loadedAssets }));
        setLoading(false);
      }
    }

    loadAssets();

    return () => {
      mounted = false;
    };
  }, [keys.join(',')]);

  return { assets, loading, progress };
}
