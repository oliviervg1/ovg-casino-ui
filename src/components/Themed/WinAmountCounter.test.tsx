import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { cleanup, render, act } from '@testing-library/react';
import { WinAmountCounter } from './WinAmountCounter';

vi.mock('../../hooks/useMotion', () => ({
  useMotion: () => ({ shouldAnimate: true, durations: { fast: 200, medium: 600, slow: 1200 } }),
}));

describe('WinAmountCounter', () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  beforeEach(() => { vi.useFakeTimers(); });

  it('renders $0 initially and ticks to $amount over 600ms (small)', () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const rafCbs: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCbs.push(cb);
      return rafCbs.length;
    });

    const { container } = render(<WinAmountCounter amount={500} tier="small" theme="sweets" />);
    expect(container.textContent).toBe('$0');

    // Advance to mid-animation
    now = 300;
    act(() => { rafCbs.shift()?.(now); });
    expect(parseInt(container.textContent!.replace(/[^0-9]/g, ''), 10)).toBeGreaterThan(0);

    // Advance to end
    now = 600;
    act(() => { rafCbs.shift()?.(now); });
    expect(container.textContent).toBe('$500');
  });

  it('has aria-hidden="true"', () => {
    const { container } = render(<WinAmountCounter amount={100} tier="small" theme="sweets" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('uses themeManifesto font class for the given theme', () => {
    const { container } = render(<WinAmountCounter amount={100} tier="jackpot" theme="vampire" />);
    expect((container.firstElementChild as HTMLElement).className).toContain('font-vampire');
  });
});

describe('WinAmountCounter (reduced motion)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../../hooks/useMotion', () => ({
      useMotion: () => ({ shouldAnimate: false, durations: { fast: 200, medium: 600, slow: 1200 } }),
    }));
  });
  afterEach(() => { cleanup(); vi.doUnmock('../../hooks/useMotion'); vi.resetModules(); });

  it('renders the final amount immediately, no tick', async () => {
    const { WinAmountCounter: ReducedCounter } = await import('./WinAmountCounter');
    const { container } = render(<ReducedCounter amount={777} tier="jackpot" theme="space" />);
    expect(container.textContent).toBe('$777');
  });
});
