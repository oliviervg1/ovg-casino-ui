import { useState, useCallback } from 'react';
import { regenerateAsset } from '../lib/AssetManager';
import { regenerateMusic } from '../lib/MusicManager';
import { RegenQuotaExceededError, RateLimitError } from '../lib/errors';
import { THEME_NAMES } from '../utils/themeManifesto';

const REGEN_CONCURRENCY = 4;

const ASSET_KEYS = THEME_NAMES.flatMap(theme => [
  `roulette_${theme}`, `slots_${theme}`, `bingo_${theme}`,
  `${theme}_1`, `${theme}_2`, `${theme}_3`, `${theme}_4`,
  `bg_roulette_${theme}`, `bg_slots_${theme}`, `bg_bingo_${theme}`,
]).concat(['bg_main']);

const MUSIC_PAIRS: Array<[string, string]> = THEME_NAMES.flatMap(theme =>
  (['roulette', 'slots', 'bingo', 'world'] as const).map(gt => [theme, gt] as [string, string])
);

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= tasks.length) return;
      try {
        results[i] = { status: 'fulfilled', value: await tasks[i]() };
      } catch (reason) {
        results[i] = { status: 'rejected', reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
  return results;
}

export type BatchRegenerateError = 'quota' | 'rate-limit' | 'partial' | null;

interface BatchRegenerateApi {
  start: () => Promise<void>;
  isRegenerating: boolean;
  status: string | null;
  error: BatchRegenerateError;
}

/**
 * Orchestrates the full 105-asset (81 image + 1 bg_main + 24 music) regenerate
 * batch with bounded concurrency (4) so the per-minute generation limit is
 * not exceeded. Reports progress as a status string and classifies failures.
 *
 * Concurrency rationale: at RATE_LIMIT_RPM=30 a concurrency of 4 keeps inflight
 * ≤ 4 with steady drain; the full batch finishes in ~3.5 minutes without 429s
 * and without saturating the Firestore quota counter with contention.
 */
export function useBatchRegenerate(): BatchRegenerateApi {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<BatchRegenerateError>(null);

  const start = useCallback(async () => {
    setIsRegenerating(true);
    setStatus(null);
    setError(null);
    let done = 0;
    const total = ASSET_KEYS.length + MUSIC_PAIRS.length;
    let quotaHit = false;
    let rateLimitHit = false;
    const update = () => setStatus(`${++done}/${total} regenerated`);

    const tasks: Array<() => Promise<unknown>> = [
      ...ASSET_KEYS.map(k => async () => {
        try { const r = await regenerateAsset(k); update(); return r; } catch (err) {
          if (err instanceof RegenQuotaExceededError) quotaHit = true;
          else if (err instanceof RateLimitError) rateLimitHit = true;
          throw err;
        }
      }),
      ...MUSIC_PAIRS.map(([t, gt]) => async () => {
        try { const r = await regenerateMusic(t, gt); update(); return r; } catch (err) {
          if (err instanceof RegenQuotaExceededError) quotaHit = true;
          else if (err instanceof RateLimitError) rateLimitHit = true;
          throw err;
        }
      }),
    ];

    const results = await runWithConcurrency(tasks, REGEN_CONCURRENCY);
    const failures = results.filter(r => r.status === 'rejected').length;

    if (quotaHit) setError('quota');
    else if (rateLimitHit) setError('rate-limit');
    else if (failures > 0) setError('partial');
    else setError(null);

    setStatus(`${total}/${total} regenerated${failures > 0 ? ` · ${failures} failed` : ''}`);
    setIsRegenerating(false);
  }, []);

  return { start, isRegenerating, status, error };
}
