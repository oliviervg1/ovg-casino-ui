import { useEffect, type ReactNode } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, render, screen, act } from '@testing-library/react';
import { BalancePill } from './BalancePill';
import { CelebrationProvider, useCelebration } from '../../contexts/CelebrationContext';

function Wrap({ children }: { children: ReactNode }) {
  return <CelebrationProvider>{children}</CelebrationProvider>;
}

describe('BalancePill', () => {
  afterEach(() => cleanup());

  it('renders the formatted balance with a $ prefix', () => {
    render(<Wrap><BalancePill balance={1234} /></Wrap>);
    expect(screen.getByTestId('balance-display').textContent).toBe('$1,234');
  });

  it('exposes the final balance to assistive tech via aria-live', () => {
    render(<Wrap><BalancePill balance={1234} /></Wrap>);
    const live = screen.getByTestId('balance-aria-live');
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toBe('$1,234');
  });

  it('updates when the balance prop changes', () => {
    const { rerender } = render(<Wrap><BalancePill balance={1000} /></Wrap>);
    expect(screen.getByTestId('balance-display').textContent).toBe('$1,000');
    act(() => { rerender(<Wrap><BalancePill balance={1500} /></Wrap>); });
    expect(screen.getByTestId('balance-aria-live').textContent).toBe('$1,500');
  });

  it('snaps to the new value on decrease (no count-up)', () => {
    const { rerender } = render(<Wrap><BalancePill balance={1000} /></Wrap>);
    act(() => { rerender(<Wrap><BalancePill balance={400} /></Wrap>); });
    expect(screen.getByTestId('balance-display').textContent).toBe('$400');
  });

  it('uses pendingTick.durationMs from CelebrationContext when set', () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const rafCbs: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCbs.push(cb);
      return rafCbs.length;
    });

    function Primer({ delta, durationMs }: { delta: number; durationMs: number }) {
      const { setPendingTick } = useCelebration();
      useEffect(() => { setPendingTick({ delta, durationMs }); }, [delta, durationMs, setPendingTick]);
      return null;
    }
    function PrimedWrap({ children }: { children: ReactNode }) {
      return (
        <CelebrationProvider>
          <Primer delta={500} durationMs={600} />
          {children}
        </CelebrationProvider>
      );
    }

    const { rerender } = render(<PrimedWrap><BalancePill balance={1000} /></PrimedWrap>);
    // Trigger the balance increase. start = performance.now() = 0.
    act(() => { rerender(<PrimedWrap><BalancePill balance={1500} /></PrimedWrap>); });

    // Drain RAF callbacks at t = pendingTick.durationMs (= 600). The animation should complete.
    now = 600;
    act(() => {
      while (rafCbs.length > 0) {
        const cb = rafCbs.shift();
        cb?.(now);
      }
    });
    expect(screen.getByTestId('balance-display').textContent).toBe('$1,500');

    vi.restoreAllMocks();
  });
});
