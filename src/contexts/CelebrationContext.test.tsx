import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, render, renderHook, act } from '@testing-library/react';
import { CelebrationProvider, useCelebration } from './CelebrationContext';

describe('CelebrationContext', () => {
  afterEach(() => cleanup());

  it('exposes pendingTick=null by default', () => {
    const { result } = renderHook(() => useCelebration(), {
      wrapper: ({ children }) => <CelebrationProvider>{children}</CelebrationProvider>,
    });
    expect(result.current.pendingTick).toBe(null);
  });

  it('setPendingTick stores the value; clearPendingTick clears it', () => {
    const { result } = renderHook(() => useCelebration(), {
      wrapper: ({ children }) => <CelebrationProvider>{children}</CelebrationProvider>,
    });
    act(() => { result.current.setPendingTick({ delta: 100, durationMs: 600 }); });
    expect(result.current.pendingTick).toEqual({ delta: 100, durationMs: 600 });
    act(() => { result.current.clearPendingTick(); });
    expect(result.current.pendingTick).toBe(null);
  });

  it('throws when used outside the provider', () => {
    // Suppress React error boundary noise.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useCelebration())).toThrow(/within a CelebrationProvider/);
    spy.mockRestore();
  });
});
