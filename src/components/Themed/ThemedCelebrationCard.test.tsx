import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent, act } from '@testing-library/react';
import { CelebrationProvider } from '../../contexts/CelebrationContext';
import { ThemedCelebrationCard } from './ThemedCelebrationCard';

afterEach(() => cleanup());

function renderCard(props: Partial<React.ComponentProps<typeof ThemedCelebrationCard>> = {}) {
  const onDismiss = vi.fn();
  const utils = render(
    <CelebrationProvider>
      <ThemedCelebrationCard
        tier="small"
        amount={20}
        theme="sweets"
        containerClass="bg-test"
        onDismiss={onDismiss}
        {...props}
      />
    </CelebrationProvider>
  );
  return { ...utils, onDismiss };
}

describe('ThemedCelebrationCard', () => {
  it('renders the small-tier themed copy from themeCopy[theme].small', () => {
    renderCard({ tier: 'small', theme: 'sweets' });
    expect(screen.getByTestId('celebration-card-small').textContent).toContain('Sweet match!');
  });

  it('renders the jackpot-tier themed label from themeCopy[theme].jackpotLabel', () => {
    renderCard({ tier: 'jackpot', theme: 'egypt', amount: 1000 });
    expect(screen.getByTestId('celebration-card-jackpot').textContent).toContain("PHARAOH'S BOUNTY!");
  });

  it('auto-dismisses after the small-tier duration (2500 ms)', () => {
    vi.useFakeTimers();
    try {
      const { onDismiss } = renderCard({ tier: 'small' });
      expect(onDismiss).not.toHaveBeenCalled();
      act(() => { vi.advanceTimersByTime(2499); });
      expect(onDismiss).not.toHaveBeenCalled();
      act(() => { vi.advanceTimersByTime(1); });
      expect(onDismiss).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('auto-dismisses after the jackpot-tier duration (5000 ms)', () => {
    vi.useFakeTimers();
    try {
      const { onDismiss } = renderCard({ tier: 'jackpot' });
      act(() => { vi.advanceTimersByTime(4999); });
      expect(onDismiss).not.toHaveBeenCalled();
      act(() => { vi.advanceTimersByTime(1); });
      expect(onDismiss).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('dismisses immediately on click of the outer container (the backdrop)', () => {
    const { onDismiss } = renderCard({ tier: 'small' });
    const backdrop = screen.getByTestId('celebration-card-small');
    fireEvent.click(backdrop);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('does NOT dismiss when an inner content element is clicked (e.target !== currentTarget)', () => {
    const { onDismiss } = renderCard({ tier: 'small' });
    const innerContent = screen.getByTestId('celebration-card-content');
    fireEvent.click(innerContent);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('small-tier card content centers itself within its container (mx-auto)', () => {
    // Bug evidence (DevTools getBoundingClientRect on prod 00017-8hb):
    //   viewport=1428w, positioner=1142.4w centered (x=142.8), but
    //   card-content max-w-[80%] resolves to 913.9px and was left-aligned
    //   inside the positioner — visible center 599.75 vs viewport center
    //   714, ~114px off-center to the left. mx-auto centers the
    //   visible card within its container, fixing the perceived offset.
    renderCard({ tier: 'small' });
    const cardContent = screen.getByTestId('celebration-card-content');
    expect(cardContent.className).toContain('mx-auto');
  });
});
