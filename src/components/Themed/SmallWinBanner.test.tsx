import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup, render, act } from '@testing-library/react';
import { SmallWinBanner } from './SmallWinBanner';

vi.mock('../../hooks/useMotion', () => ({
  useMotion: () => ({ shouldAnimate: true, durations: { fast: 200, medium: 600, slow: 1200 } }),
}));

describe('SmallWinBanner', () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); });
  beforeEach(() => { vi.useFakeTimers(); });

  it('renders the themed small copy + first emoji from the pool', () => {
    const { container } = render(<SmallWinBanner amount={30} theme="sweets" onDismiss={() => {}} />);
    expect(container.textContent).toContain('Sweet match!');
    expect(container.textContent).toContain('🍬');
  });

  it('auto-dismisses after 3000ms', () => {
    const onDismiss = vi.fn();
    render(<SmallWinBanner amount={30} theme="sweets" onDismiss={onDismiss} />);
    act(() => { vi.advanceTimersByTime(2999); });
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('wrapper has pointer-events-none so it does not block input', () => {
    const { getByTestId } = render(<SmallWinBanner amount={30} theme="sweets" onDismiss={() => {}} />);
    const wrapper = getByTestId('small-win-wrapper');
    expect(wrapper.className).toContain('pointer-events-none');
  });
});
