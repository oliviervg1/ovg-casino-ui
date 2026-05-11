import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSlotsGame } from './useSlotsGame';

vi.mock('../utils/SoundEngine', () => ({
  soundEngine: {
    playSlotSpin: vi.fn(),
    playWin: vi.fn(),
    playLose: vi.fn(),
  },
}));

describe('useSlotsGame', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  const symbols = ['🍭', '🧁', '🍬', '🍩'];

  it('starts with spinning=false, win=null, default bet=10', () => {
    const { result } = renderHook(() => useSlotsGame({ theme: 'sweets', symbols, balance: 100 }));
    expect(result.current.spinning).toBe(false);
    expect(result.current.win).toBeNull();
    expect(result.current.bet).toBe(10);
  });

  it('spin() flips spinning=true and clears prior win/message', () => {
    const { result } = renderHook(() => useSlotsGame({ theme: 'sweets', symbols, balance: 100 }));
    act(() => { result.current.spin(); });
    expect(result.current.spinning).toBe(true);
    expect(result.current.win).toBeNull();
    expect(result.current.message).toBeNull();
  });

  it('spin() spinning state lasts ~2500ms (longest reel stop)', () => {
    const onUpdateBalance = vi.fn();
    const { result } = renderHook(() => useSlotsGame({ theme: 'sweets', symbols, balance: 100, onUpdateBalance }));
    act(() => { result.current.spin(); });

    // At 2400ms, still spinning (only reels 0+1 have stopped visually).
    act(() => { vi.advanceTimersByTime(2400); });
    expect(result.current.spinning).toBe(true);

    // At 2600ms, all three reels have settled and the win has been evaluated.
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current.spinning).toBe(false);

    // Bet was deducted at the start; nothing else happens between deduct and possible payout.
    expect(onUpdateBalance).toHaveBeenCalledWith(-10);
  });

  it('exposes reelStates with {top, middle, bottom} per reel', () => {
    const { result } = renderHook(() => useSlotsGame({ theme: 'sweets', symbols, balance: 100 }));
    expect(result.current.reelStates).toHaveLength(3);
    for (const r of result.current.reelStates) {
      expect(r).toHaveProperty('top');
      expect(r).toHaveProperty('middle');
      expect(r).toHaveProperty('bottom');
    }
  });

  it('after spin, middle row symbols are the payline (used by evaluateSlotsResult)', () => {
    const { result } = renderHook(() => useSlotsGame({ theme: 'sweets', symbols, balance: 100 }));
    act(() => { result.current.spin(); });
    act(() => { vi.advanceTimersByTime(2500 + 50); });
    const payline = result.current.reelStates.map(r => r.middle);
    // Symbols must come from the configured pool (no leakage of empty strings).
    for (const sym of payline) expect(symbols).toContain(sym);
  });

  it('reel-init effect re-runs when symbol URLs change (not stuck on emoji fallbacks)', () => {
    const initial = ['🍭', '🧁', '🍬', '🍩'];
    const { result, rerender } = renderHook(
      ({ symbols }: { symbols: string[] }) =>
        useSlotsGame({ theme: 'sweets', symbols, balance: 100 }),
      { initialProps: { symbols: initial } }
    );
    // Initial state — middle is one of the emoji fallbacks.
    const firstMiddle = result.current.reelStates[0].middle;
    expect(initial).toContain(firstMiddle);

    // Simulate Gemini URLs landing.
    const urls = [
      'https://storage.googleapis.com/x/1.png',
      'https://storage.googleapis.com/x/2.png',
      'https://storage.googleapis.com/x/3.png',
      'https://storage.googleapis.com/x/4.png',
    ];
    rerender({ symbols: urls });

    // After re-render, reels pick up the new pool.
    for (const r of result.current.reelStates) {
      expect(urls).toContain(r.middle);
    }
  });

  it('does NOT reinitialise reels mid-spin when the symbol pool changes', () => {
    const initial = ['🍭', '🧁', '🍬', '🍩'];
    const urls = ['https://storage.googleapis.com/a.png', 'https://storage.googleapis.com/b.png'];
    const { result, rerender } = renderHook(
      ({ symbols }: { symbols: string[] }) =>
        useSlotsGame({ theme: 'sweets', symbols, balance: 100 }),
      { initialProps: { symbols: initial } }
    );
    act(() => { result.current.spin(); });
    expect(result.current.spinning).toBe(true);
    rerender({ symbols: urls });
    // Still spinning; reels not snapped to a stable state from the new pool.
    expect(result.current.spinning).toBe(true);
    // After spin completes, the new pool drives the final state.
    act(() => { vi.advanceTimersByTime(2500 + 50); });
    expect(result.current.spinning).toBe(false);
    for (const r of result.current.reelStates) {
      expect(urls).toContain(r.middle);
    }
  });

  it('does NOT re-pick reelStates when spinning ends after a mid-spin pool change', () => {
    const initial = ['🍭', '🧁', '🍬', '🍩'];
    const urls = [
      'https://storage.googleapis.com/x/1.png',
      'https://storage.googleapis.com/x/2.png',
      'https://storage.googleapis.com/x/3.png',
      'https://storage.googleapis.com/x/4.png',
    ];
    const { result, rerender } = renderHook(
      ({ symbols }: { symbols: string[] }) =>
        useSlotsGame({ theme: 'sweets', symbols, balance: 100 }),
      { initialProps: { symbols: initial } }
    );
    act(() => { result.current.spin(); });
    // Mid-spin pool change.
    rerender({ symbols: urls });
    // Advance to settle.
    act(() => { vi.advanceTimersByTime(2500 + 50); });
    expect(result.current.spinning).toBe(false);
    // Snapshot the post-settle reels.
    const reelsAfterSettle = result.current.reelStates.map(r => ({ ...r }));
    // Tick once more — if the effect would re-fire, this is when it'd happen.
    act(() => { vi.advanceTimersByTime(0); });
    // Reels must be unchanged.
    expect(result.current.reelStates).toEqual(reelsAfterSettle);
    // (Sanity: the reels WERE picked from URLs, since the spin's setReels read symbolsRef.current after the rerender.)
    for (const r of result.current.reelStates) {
      expect(urls).toContain(r.middle);
    }
  });
});
