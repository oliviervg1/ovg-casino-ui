import { useState, useEffect, useMemo } from 'react';
import { getAsset } from '../lib/AssetManager';

export interface UseAssetsOptions {
  // When false, the effect is a no-op — useful when the caller knows the
  // asset request will fail (e.g. before Firebase auth has resolved and
  // AssetManager would throw "not_authenticated"). Once flipped to true the
  // effect re-runs and the fetch proceeds. Defaults to true for back-compat.
  enabled?: boolean;
}

export function useAssets(keys: string[], options: UseAssetsOptions = {}) {
  const { enabled = true } = options;
  const memoKeys = useMemo(() => keys, [keys.join('|')]);
  const [assets, setAssets] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;
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
  }, [memoKeys, enabled]);

  return { assets, loading };
}
