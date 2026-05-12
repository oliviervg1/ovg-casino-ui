import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBingoGame } from './useBingoGame';

vi.mock('../utils/SoundEngine', () => ({
  soundEngine: {
    playBingoDraw: vi.fn(),
    playWin: vi.fn(),
    playLose: vi.fn(),
  },
}));

describe('useBingoGame', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('starts with drawing=false, drawn=[], default bet=10, win=null', () => {
    const { result } = renderHook(() => useBingoGame({ theme: 'sweets', balance: 100 }));
    expect(result.current.drawing).toBe(false);
    expect(result.current.drawn).toEqual([]);
    expect(result.current.bet).toBe(10);
    expect(result.current.win).toBeNull();
    expect(result.current.message).toBeNull();
    expect(result.current.lastDrawn).toBeNull();
  });

  it('initial board is 3 rows × 3 numbers all in 1..30 with no duplicates', () => {
    const { result } = renderHook(() => useBingoGame({ theme: 'sweets', balance: 100 }));
    const board = result.current.board;
    expect(board.length).toBe(3);
    for (const row of board) {
      expect(row.length).toBe(3);
      for (const n of row) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(30);
      }
    }
    expect(new Set(board.flat()).size).toBe(9);
  });

  it('play() does nothing when balance < bet', () => {
    const onUpdateBalance = vi.fn();
    const { result } = renderHook(() => useBingoGame({ theme: 'sweets', balance: 5, onUpdateBalance }));
    act(() => { result.current.play(); });
    expect(result.current.drawing).toBe(false);
    expect(onUpdateBalance).not.toHaveBeenCalled();
  });

  it('play() flips drawing=true and debits the bet', () => {
    const onUpdateBalance = vi.fn();
    const { result } = renderHook(() => useBingoGame({ theme: 'sweets', balance: 100, onUpdateBalance }));
    act(() => { result.current.play(); });
    expect(result.current.drawing).toBe(true);
    expect(onUpdateBalance).toHaveBeenCalledWith(-10);
  });

  it('play() draws one number per 600ms tick and exposes it via drawn + lastDrawn', () => {
    const { result } = renderHook(() => useBingoGame({ theme: 'sweets', balance: 100, onUpdateBalance: vi.fn() }));
    act(() => { result.current.play(); });
    expect(result.current.drawn.length).toBe(0);
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current.drawn.length).toBe(1);
    expect(result.current.lastDrawn).toBe(result.current.drawn[0]);
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current.drawn.length).toBe(2);
    expect(result.current.lastDrawn).toBe(result.current.drawn[1]);
  });

  it('play() resolves by the 12th draw at the latest with drawing=false and a non-null message', () => {
    const { result } = renderHook(() => useBingoGame({ theme: 'sweets', balance: 100, onUpdateBalance: vi.fn() }));
    act(() => { result.current.play(); });
    // 12 ticks @ 600ms = 7200ms; allow +50ms slack.
    act(() => { vi.advanceTimersByTime(12 * 600 + 50); });
    expect(result.current.drawing).toBe(false);
    expect(result.current.message).not.toBeNull();
  });

  it('drawn numbers contain no duplicates', () => {
    const { result } = renderHook(() => useBingoGame({ theme: 'sweets', balance: 100, onUpdateBalance: vi.fn() }));
    act(() => { result.current.play(); });
    act(() => { vi.advanceTimersByTime(12 * 600 + 50); });
    expect(new Set(result.current.drawn).size).toBe(result.current.drawn.length);
  });

  it('a second play() call regenerates the board and resets drawn', () => {
    const { result } = renderHook(() => useBingoGame({ theme: 'sweets', balance: 100, onUpdateBalance: vi.fn() }));
    act(() => { result.current.play(); });
    act(() => { vi.advanceTimersByTime(12 * 600 + 50); });
    expect(result.current.drawing).toBe(false);
    expect(result.current.drawn.length).toBeGreaterThan(0);
    act(() => { result.current.play(); });
    expect(result.current.drawing).toBe(true);
    expect(result.current.drawn).toEqual([]);
  });

  it('clears the draw interval on unmount so no timers remain', () => {
    const { result, unmount } = renderHook(() =>
      useBingoGame({ theme: 'sweets', balance: 100, onUpdateBalance: vi.fn() }),
    );
    act(() => { result.current.play(); });
    expect(result.current.drawing).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
