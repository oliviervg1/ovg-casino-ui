import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { useRef } from 'react';
import { ThemedCelebration } from './ThemedCelebration';
import { CelebrationProvider, useCelebration } from '../../contexts/CelebrationContext';

vi.mock('../../hooks/useMotion', () => ({
  useMotion: () => ({ shouldAnimate: true, durations: { fast: 200, medium: 600, slow: 1200 } }),
}));

function Probe({ onState }: { onState: (s: { pendingTick: ReturnType<typeof useCelebration>['pendingTick'] }) => void }) {
  const { pendingTick } = useCelebration();
  onState({ pendingTick });
  return null;
}

function Harness({ tier, amount }: { tier: 'jackpot' | 'small' | 'loss' | null; amount: number | null }) {
  const ref = useRef<HTMLDivElement | null>(null);
  return (
    <CelebrationProvider>
      <div ref={ref} />
      <ThemedCelebration tier={tier} amount={amount} theme="sweets" surfaceRef={ref} />
      <Probe onState={() => {}} />
    </CelebrationProvider>
  );
}

describe('ThemedCelebration', () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); });
  beforeEach(() => { vi.useFakeTimers(); });

  it('renders nothing when tier is null', () => {
    const { container } = render(<Harness tier={null} amount={null} />);
    // Probe + ref div + provider render only the empty marker; ThemedCelebration renders nothing.
    expect(container.textContent).toBe('');
  });

  it('renders SmallWinCard for tier=small', () => {
    const { container, getByTestId } = render(<Harness tier="small" amount={30} />);
    expect(getByTestId('small-win-backdrop')).toBeTruthy();
    expect(container.textContent).toContain('Sweet match!');
  });

  it('renders JackpotOverlay for tier=jackpot', () => {
    const { container } = render(<Harness tier="jackpot" amount={500} />);
    expect(container.textContent).toContain('CANDY JACKPOT!');
  });

  it('renders LossPlate for tier=loss', () => {
    const { container } = render(<Harness tier="loss" amount={0} />);
    expect(container.textContent).toContain('Empty wrapper.');
  });

  it('pushes pendingTick={ delta:30, durationMs:600 } for small', () => {
    // Wrapper-object pattern: TS narrows closure-mutated `let` to its initial
    // value; an object property bypasses that flow analysis.
    const captured: { observed: { pendingTick: ReturnType<typeof useCelebration>['pendingTick'] } | null } = { observed: null };
    const ref = { current: null };
    function ProbeHarness() {
      return (
        <CelebrationProvider>
          <ThemedCelebration tier="small" amount={30} theme="sweets" surfaceRef={ref as React.RefObject<HTMLDivElement | null>} />
          <Probe onState={(s) => { captured.observed = s; }} />
        </CelebrationProvider>
      );
    }
    render(<ProbeHarness />);
    expect(captured.observed?.pendingTick).toEqual({ delta: 30, durationMs: 600 });
  });

  it('pushes pendingTick={ delta:500, durationMs:1200 } for jackpot', () => {
    // Wrapper-object pattern: TS narrows closure-mutated `let` to its initial
    // value; an object property bypasses that flow analysis.
    const captured: { observed: { pendingTick: ReturnType<typeof useCelebration>['pendingTick'] } | null } = { observed: null };
    const ref = { current: null };
    function ProbeHarness() {
      return (
        <CelebrationProvider>
          <ThemedCelebration tier="jackpot" amount={500} theme="sweets" surfaceRef={ref as React.RefObject<HTMLDivElement | null>} />
          <Probe onState={(s) => { captured.observed = s; }} />
        </CelebrationProvider>
      );
    }
    render(<ProbeHarness />);
    expect(captured.observed?.pendingTick).toEqual({ delta: 500, durationMs: 1200 });
  });

  it('does NOT push pendingTick for loss', () => {
    // Wrapper-object pattern: TS narrows closure-mutated `let` to its initial
    // value; an object property bypasses that flow analysis.
    const captured: { observed: { pendingTick: ReturnType<typeof useCelebration>['pendingTick'] } | null } = { observed: null };
    const ref = { current: null };
    function ProbeHarness() {
      return (
        <CelebrationProvider>
          <ThemedCelebration tier="loss" amount={0} theme="sweets" surfaceRef={ref as React.RefObject<HTMLDivElement | null>} />
          <Probe onState={(s) => { captured.observed = s; }} />
        </CelebrationProvider>
      );
    }
    render(<ProbeHarness />);
    expect(captured.observed?.pendingTick).toBe(null);
  });
});
