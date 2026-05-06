import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../lib/MusicManager', () => ({
  getMusic: vi.fn(async (theme: string, gt: string) => `https://signed/${theme}_${gt}`),
}));

import { useMusic } from './useMusic';

describe('useMusic', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads the URL for the (theme, gameType) pair', async () => {
    const { result } = renderHook(() => useMusic('sweets', 'roulette'));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.musicUrl).toBe('https://signed/sweets_roulette');
  });
});
