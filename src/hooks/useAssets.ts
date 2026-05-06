import { useState, useEffect, useMemo } from 'react';
import { getAsset } from '../lib/AssetManager';

export function useAssets(keys: string[]) {
  const memoKeys = useMemo(() => keys, [keys.join('|')]);
  const [assets, setAssets] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      const loaded: Record<string, string> = {};
      await Promise.all(memoKeys.map(async (k) => {
        try {
          loaded[k] = await getAsset(k);
        } catch (e) {
          console.error(`Asset load failed: ${k}`, e);
        }
      }));
      if (mounted) {
        setAssets(prev => ({ ...prev, ...loaded }));
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [memoKeys]);

  return { assets, loading };
}
