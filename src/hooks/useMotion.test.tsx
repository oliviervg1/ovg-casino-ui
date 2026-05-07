import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { useMotion } from './useMotion';

function mockReducedMotion(value: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? value : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('useMotion', () => {
  beforeEach(() => {
    mockReducedMotion(false);
  });
  // Force unmount BEFORE the next test setup so any observers/listeners
  // registered by the previous test's hook are torn down before we mock
  // matchMedia again. Prevents act() warnings from late re-renders.
  afterEach(() => {
    cleanup();
  });

  it('returns shouldAnimate=true when prefers-reduced-motion is not set', () => {
    const { result } = renderHook(() => useMotion());
    expect(result.current.shouldAnimate).toBe(true);
  });

  it('returns shouldAnimate=false when prefers-reduced-motion: reduce', () => {
    mockReducedMotion(true);
    const { result } = renderHook(() => useMotion());
    expect(result.current.shouldAnimate).toBe(false);
  });

  it('exposes the standard duration constants', () => {
    const { result } = renderHook(() => useMotion());
    expect(result.current.durations.instant).toBe(100);
    expect(result.current.durations.quick).toBe(250);
    expect(result.current.durations.standard).toBe(400);
    expect(result.current.durations.slow).toBe(1200);
    expect(result.current.durations.spin).toBe(2500);
  });

  it('motionVariant returns the full variant when shouldAnimate is true', () => {
    const { result } = renderHook(() => useMotion());
    expect(result.current.motionVariant({ x: 100 }, { x: 0 })).toEqual({ x: 100 });
  });

  it('motionVariant returns the reduced variant when shouldAnimate is false', () => {
    mockReducedMotion(true);
    const { result } = renderHook(() => useMotion());
    expect(result.current.motionVariant({ x: 100 }, { x: 0 })).toEqual({ x: 0 });
  });
});
