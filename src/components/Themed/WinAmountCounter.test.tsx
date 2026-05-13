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

    const { container } = render(<WinAmountCounter amount={500} tier="small" />);
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
    const { container } = render(<WinAmountCounter amount={100} tier="small" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('does NOT apply the themeManifesto display font (counter is body-text, must stay legible)', () => {
    // Spec (2026-05-13-celebration-cleanup-design.md): "Body text — the
    // WinAmountCounter and any descriptive copy — uses the default sans-serif.
    // Egyptian / vampiric / etc. display fonts stay reserved for hero text
    // where they're legible." A `font-vampire`/`font-egypt` etc. on the
    // counter renders the dollar amount in an illegible decorative font.
    const { container } = render(<WinAmountCounter amount={100} tier="jackpot" />);
    const cls = (container.firstElementChild as HTMLElement).className;
    expect(cls).not.toContain('font-vampire');
    expect(cls).not.toContain('font-egypt');
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
    const { container } = render(<ReducedCounter amount={777} tier="jackpot" />);
    expect(container.textContent).toBe('$777');
  });
});
