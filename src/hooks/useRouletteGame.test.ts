import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRouletteGame } from './useRouletteGame';

vi.mock('../utils/SoundEngine', () => ({
  soundEngine: {
    playRouletteSpin: vi.fn(),
    playWin: vi.fn(),
    playLose: vi.fn(),
  },
}));

describe('useRouletteGame', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('starts with spinning=false, betType=null, resultNum=null, default bet=10', () => {
    const { result } = renderHook(() => useRouletteGame({ theme: 'sweets', balance: 100 }));
    expect(result.current.spinning).toBe(false);
    expect(result.current.betType).toBeNull();
    expect(result.current.resultNum).toBeNull();
    expect(result.current.resultColour).toBeNull();
    expect(result.current.win).toBeNull();
    expect(result.current.bet).toBe(10);
  });

  it('setBetType(t) updates betType', () => {
    const { result } = renderHook(() => useRouletteGame({ theme: 'sweets', balance: 100 }));
    act(() => { result.current.setBetType('red'); });
    expect(result.current.betType).toBe('red');
  });

  it('spin() does nothing when betType is not set', () => {
    const onUpdateBalance = vi.fn();
    const { result } = renderHook(() => useRouletteGame({ theme: 'sweets', balance: 100, onUpdateBalance }));
    act(() => { result.current.spin(); });
    expect(result.current.spinning).toBe(false);
    expect(onUpdateBalance).not.toHaveBeenCalled();
  });

  it('spin() flips spinning=true, debits the bet, clears prior win/message', () => {
    const onUpdateBalance = vi.fn();
    const { result } = renderHook(() => useRouletteGame({ theme: 'sweets', balance: 100, onUpdateBalance }));
    act(() => { result.current.setBetType('red'); });
    act(() => { result.current.spin(); });
    expect(result.current.spinning).toBe(true);
    expect(result.current.win).toBeNull();
    expect(result.current.message).toBeNull();
    expect(onUpdateBalance).toHaveBeenCalledWith(-10);
  });

  it('spin() resolves at ~2500ms — spinning=false and resultNum is in 0..36', () => {
    const { result } = renderHook(() => useRouletteGame({ theme: 'sweets', balance: 100, onUpdateBalance: vi.fn() }));
    act(() => { result.current.setBetType('red'); });
    act(() => { result.current.spin(); });
    act(() => { vi.advanceTimersByTime(2500 + 50); });
    expect(result.current.spinning).toBe(false);
    expect(result.current.resultNum).not.toBeNull();
    expect(result.current.resultNum!).toBeGreaterThanOrEqual(0);
    expect(result.current.resultNum!).toBeLessThanOrEqual(36);
    expect(result.current.resultColour).toMatch(/^(red|black|green)$/);
  });

  it('resultNum is hidden (null) during the spin window and revealed at the end', () => {
    const { result } = renderHook(() => useRouletteGame({ theme: 'sweets', balance: 100, onUpdateBalance: vi.fn() }));
    act(() => { result.current.setBetType('red'); });
    act(() => { result.current.spin(); });
    expect(result.current.spinning).toBe(true);
    expect(result.current.resultNum).toBeNull();
    expect(result.current.resultColour).toBeNull();
    act(() => { vi.advanceTimersByTime(2500 + 50); });
    expect(result.current.resultNum).not.toBeNull();
  });

  it('wheelRotation accumulates by ~1800° per spin (5 forward turns + small angle correction)', () => {
    const { result } = renderHook(() => useRouletteGame({ theme: 'sweets', balance: 1000, onUpdateBalance: vi.fn() }));
    act(() => { result.current.setBetType('red'); });
    const start = result.current.wheelRotation;
    act(() => { result.current.spin(); });
    const delta = result.current.wheelRotation - start;
    expect(delta).toBeGreaterThan(1800 - 360);
    expect(delta).toBeLessThan(1800 + 360);
  });

  it('ballRotation decreases by exactly 2520° per spin (7 ccw turns)', () => {
    const { result } = renderHook(() => useRouletteGame({ theme: 'sweets', balance: 100, onUpdateBalance: vi.fn() }));
    act(() => { result.current.setBetType('red'); });
    const start = result.current.ballRotation;
    act(() => { result.current.spin(); });
    expect(result.current.ballRotation - start).toBe(-2520);
  });
});
