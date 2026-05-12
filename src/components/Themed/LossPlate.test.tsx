import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup, render, act } from '@testing-library/react';
import { useRef } from 'react';
import { LossPlate } from './LossPlate';

vi.mock('../../hooks/useMotion', () => ({
  useMotion: () => ({ shouldAnimate: true, durations: { fast: 200, medium: 600, slow: 1200 } }),
}));

function Harness({ theme = 'vampire' as const, onDismiss = () => {} }) {
  const ref = useRef<HTMLDivElement | null>(null);
  return (
    <div>
      <div ref={ref} data-testid="surface" />
      <LossPlate theme={theme} surfaceRef={ref} onDismiss={onDismiss} />
    </div>
  );
}

describe('LossPlate', () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); });
  beforeEach(() => { vi.useFakeTimers(); });

  it('renders the themed loss copy', () => {
    const { container } = render(<Harness theme="vampire" />);
    expect(container.textContent).toContain('The night is empty.');
  });

  it('applies the wiggle class + custom props to surfaceRef on mount, removes after wiggle.duration_ms (vampire = 400ms)', () => {
    const { getByTestId } = render(<Harness theme="vampire" />);
    const surface = getByTestId('surface') as HTMLElement;
    expect(surface.classList.contains('wiggle-active')).toBe(true);
    expect(surface.style.getPropertyValue('--wiggle-duration')).toBe('400ms');
    expect(surface.style.getPropertyValue('--wiggle-magnitude')).toBe('6px');
    act(() => { vi.advanceTimersByTime(400); });
    expect(surface.classList.contains('wiggle-active')).toBe(false);
  });

  it('auto-dismisses after 2000ms', () => {
    const onDismiss = vi.fn();
    render(<Harness theme="vampire" onDismiss={onDismiss} />);
    act(() => { vi.advanceTimersByTime(1999); });
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('LossPlate (reduced motion)', () => {
  afterEach(() => { cleanup(); vi.doUnmock('../../hooks/useMotion'); vi.resetModules(); vi.useRealTimers(); });
  beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); });

  it('skips the wiggle when reduced motion', async () => {
    vi.doMock('../../hooks/useMotion', () => ({
      useMotion: () => ({ shouldAnimate: false, durations: { fast: 200, medium: 600, slow: 1200 } }),
    }));
    const { LossPlate: ReducedPlate } = await import('./LossPlate');
    function Local() {
      const ref = useRef<HTMLDivElement | null>(null);
      return (
        <div>
          <div ref={ref} data-testid="surface" />
          <ReducedPlate theme="vampire" surfaceRef={ref} onDismiss={() => {}} />
        </div>
      );
    }
    const { getByTestId } = render(<Local />);
    expect((getByTestId('surface') as HTMLElement).classList.contains('wiggle-active')).toBe(false);
  });
});
