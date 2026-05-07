import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';

// AssetManager / MusicManager mocks. The hook calls regenerateAsset/regenerateMusic.
const regenerateAsset = vi.fn();
const regenerateMusic = vi.fn();

vi.mock('../lib/AssetManager', () => ({ regenerateAsset: (k: string) => regenerateAsset(k) }));
vi.mock('../lib/MusicManager', () => ({ regenerateMusic: (t: string, gt: string) => regenerateMusic(t, gt) }));

import { useBatchRegenerate } from './useBatchRegenerate';
import { RegenQuotaExceededError, RateLimitError } from '../lib/errors';

describe('useBatchRegenerate', () => {
  beforeEach(() => {
    regenerateAsset.mockReset();
    regenerateMusic.mockReset();
    cleanup();
  });

  it('calls regenerateAsset for every asset key and regenerateMusic for every music pair', async () => {
    regenerateAsset.mockResolvedValue('url');
    regenerateMusic.mockResolvedValue('url');

    const { result } = renderHook(() => useBatchRegenerate());

    await act(async () => { await result.current.start(); });

    // 81 themed asset keys (8 themes × 10) + bg_main = 81 asset calls
    expect(regenerateAsset).toHaveBeenCalledTimes(81);
    // 32 music pairs (8 themes × 4 contexts: roulette/slots/bingo/world)
    expect(regenerateMusic).toHaveBeenCalledTimes(32);
  });

  it('updates status as tasks complete', async () => {
    regenerateAsset.mockResolvedValue('url');
    regenerateMusic.mockResolvedValue('url');

    const { result } = renderHook(() => useBatchRegenerate());

    expect(result.current.status).toBeNull();

    await act(async () => { await result.current.start(); });

    await waitFor(() => {
      // Final status mentions completion count = 81 + 32 = 113
      expect(result.current.status).toMatch(/113\/113/);
    });
  });

  it('reports a quota error when one task throws RegenQuotaExceededError', async () => {
    regenerateAsset.mockRejectedValueOnce(new RegenQuotaExceededError());
    regenerateAsset.mockResolvedValue('url');
    regenerateMusic.mockResolvedValue('url');

    const { result } = renderHook(() => useBatchRegenerate());

    await act(async () => { await result.current.start(); });

    expect(result.current.error).toBe('quota');
  });

  it('reports a rate-limit error when one task throws RateLimitError', async () => {
    regenerateAsset.mockRejectedValueOnce(new RateLimitError());
    regenerateAsset.mockResolvedValue('url');
    regenerateMusic.mockResolvedValue('url');

    const { result } = renderHook(() => useBatchRegenerate());

    await act(async () => { await result.current.start(); });

    expect(result.current.error).toBe('rate-limit');
  });

  it('isRegenerating is true during the run, false after', async () => {
    // Track every resolver so we can flush all 4 in-flight asset workers when ready.
    const resolvers: Array<(v: string) => void> = [];
    regenerateAsset.mockImplementation(() => new Promise<string>((r) => { resolvers.push(r); }));
    regenerateMusic.mockResolvedValue('url');

    const { result } = renderHook(() => useBatchRegenerate());
    expect(result.current.isRegenerating).toBe(false);

    let runPromise!: Promise<void>;
    act(() => { runPromise = result.current.start(); });
    await waitFor(() => expect(result.current.isRegenerating).toBe(true));

    // Swap to instant-resolve for any subsequent calls, then flush the parked ones.
    regenerateAsset.mockResolvedValue('url');
    await act(async () => {
      // Drain the queue: each call to a resolver lets one worker pick the next task.
      while (resolvers.length > 0) {
        const r = resolvers.shift()!;
        r('url');
        // Yield so React/microtasks can advance and queue any new pending promises.
        await Promise.resolve();
      }
      await runPromise;
    });

    expect(result.current.isRegenerating).toBe(false);
  });
});
