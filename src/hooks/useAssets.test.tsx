import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('../lib/AssetManager', () => ({
  getAsset: vi.fn(async (k: string) => `https://signed/${k}`),
}));

import { useAssets } from './useAssets';
import { getAsset } from '../lib/AssetManager';

describe('useAssets', () => {
  beforeEach(() => vi.clearAllMocks());

  it('transitions from loading → loaded with the resolved URLs', async () => {
    const { result } = renderHook(() => useAssets(['k1', 'k2']));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.assets).toEqual({ k1: 'https://signed/k1', k2: 'https://signed/k2' });
  });

  it('does not call getAsset when enabled is false (waits for caller readiness, e.g. auth resolution)', async () => {
    const { result } = renderHook(() => useAssets(['k1'], { enabled: false }));
    // Give any effect time to fire.
    await new Promise(r => setTimeout(r, 20));
    expect(getAsset).not.toHaveBeenCalled();
    expect(result.current.assets).toEqual({});
    expect(result.current.loading).toBe(true);
  });

  it('fetches once enabled flips from false to true (auth-gated load pattern)', async () => {
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useAssets(['k1'], { enabled }),
      { initialProps: { enabled: false } }
    );
    expect(getAsset).not.toHaveBeenCalled();
    rerender({ enabled: true });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getAsset).toHaveBeenCalledWith('k1');
    expect(result.current.assets).toEqual({ k1: 'https://signed/k1' });
  });

  it('defaults enabled to true when options omitted (back-compat)', async () => {
    const { result } = renderHook(() => useAssets(['k1']));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getAsset).toHaveBeenCalledWith('k1');
    expect(result.current.assets).toEqual({ k1: 'https://signed/k1' });
  });
});
