import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../lib/AssetManager', () => ({
  getAsset: vi.fn(async (k: string) => `https://signed/${k}`),
}));

import { useAssets } from './useAssets';

describe('useAssets', () => {
  beforeEach(() => vi.clearAllMocks());

  it('transitions from loading → loaded with the resolved URLs', async () => {
    const { result } = renderHook(() => useAssets(['k1', 'k2']));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.assets).toEqual({ k1: 'https://signed/k1', k2: 'https://signed/k2' });
  });
});
