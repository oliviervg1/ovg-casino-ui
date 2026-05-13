import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup, render, act, fireEvent } from '@testing-library/react';
import { JackpotOverlay } from './JackpotOverlay';

vi.mock('../../hooks/useMotion', () => ({
  useMotion: () => ({ shouldAnimate: true, durations: { fast: 200, medium: 600, slow: 1200 } }),
}));

describe('JackpotOverlay', () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); });
  beforeEach(() => { vi.useFakeTimers(); });

  it('renders the themed jackpotLabel for the given theme', () => {
    const { container } = render(<JackpotOverlay amount={500} theme="egypt" onDismiss={() => {}} />);
    expect(container.textContent).toContain("PHARAOH'S BOUNTY!");
  });

  it('auto-dismisses after 5000ms', () => {
    const onDismiss = vi.fn();
    render(<JackpotOverlay amount={500} theme="sweets" onDismiss={onDismiss} />);
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(4999); });
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('clicking the backdrop dismisses', () => {
    const onDismiss = vi.fn();
    const { getByTestId } = render(<JackpotOverlay amount={500} theme="sweets" onDismiss={onDismiss} />);
    const backdrop = getByTestId('jackpot-backdrop');
    fireEvent.click(backdrop);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('clicking a child does NOT dismiss', () => {
    const onDismiss = vi.fn();
    const { getByTestId } = render(<JackpotOverlay amount={500} theme="sweets" onDismiss={onDismiss} />);
    // Inner card content lives inside ThemedCelebrationCard now; clicking it must not bubble a dismiss.
    const cardContent = getByTestId('celebration-card-content');
    fireEvent.click(cardContent);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('does NOT pass pointer-events-none to the card (would let card-body clicks pass through to backdrop in real browsers)', () => {
    // Structural regression test: jsdom can't reproduce the click-through bug
    // (synthetic fireEvent.click ignores CSS pointer-events). Lock the intent here.
    const { getByTestId } = render(<JackpotOverlay amount={1000} theme="sweets" onDismiss={vi.fn()} />);
    const card = getByTestId('celebration-card-jackpot');
    expect(card.className).not.toContain('pointer-events-none');
  });
});
