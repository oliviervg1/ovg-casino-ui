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

  it('spin() resolves to a final state after 20 cycles × 100ms', () => {
    const onUpdateBalance = vi.fn();
    const { result } = renderHook(() => useSlotsGame({ theme: 'sweets', symbols, balance: 100, onUpdateBalance }));
    act(() => { result.current.spin(); });
    // Loop terminates on the 21st tick (`spins > 20`), so advance past 21 * 100ms
    // to give the post-tick state updates a chance to flush.
    act(() => { vi.advanceTimersByTime(21 * 100 + 50); });
    expect(result.current.spinning).toBe(false);
    expect(onUpdateBalance).toHaveBeenCalledWith(-10); // bet deducted at spin start
  });
});
