import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });
  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute('data-theme');
  });

  it('returns the sweets manifesto when data-theme is "sweets"', () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    const { result } = renderHook(() => useTheme());
    expect(result.current.displayName).toBe('Sweets');
    expect(result.current.surface).toBe('pillowy-glass');
  });

  it('returns the ninja manifesto when data-theme is "ninja"', () => {
    document.documentElement.setAttribute('data-theme', 'ninja');
    const { result } = renderHook(() => useTheme());
    expect(result.current.displayName).toBe('Ninja');
    expect(result.current.surface).toBe('dark-wood-paper');
  });

  it('falls back to sweets when no data-theme is set', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.displayName).toBe('Sweets');
  });

  it('falls back to sweets when data-theme is an unknown value', () => {
    document.documentElement.setAttribute('data-theme', 'mystery');
    const { result } = renderHook(() => useTheme());
    expect(result.current.displayName).toBe('Sweets');
  });

  it('re-renders when data-theme attribute changes mid-session (MutationObserver)', async () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    const { result } = renderHook(() => useTheme());
    expect(result.current.displayName).toBe('Sweets');

    // Switch the attribute — the MutationObserver inside useTheme should
    // fire and trigger a re-render with the ninja manifesto.
    await act(async () => {
      document.documentElement.setAttribute('data-theme', 'ninja');
      // Yield a tick so the observer's microtask runs.
      await Promise.resolve();
    });

    expect(result.current.displayName).toBe('Ninja');
    expect(result.current.surface).toBe('dark-wood-paper');
  });
});
