import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen, act } from '@testing-library/react';
import { BalancePill } from './BalancePill';

describe('BalancePill', () => {
  afterEach(() => cleanup());

  it('renders the formatted balance with a $ prefix', () => {
    render(<BalancePill balance={1234} />);
    expect(screen.getByTestId('balance-display').textContent).toBe('$1,234');
  });

  it('exposes the final balance to assistive tech via aria-live', () => {
    render(<BalancePill balance={1234} />);
    const live = screen.getByTestId('balance-aria-live');
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toBe('$1,234');
  });

  it('updates when the balance prop changes', () => {
    const { rerender } = render(<BalancePill balance={1000} />);
    expect(screen.getByTestId('balance-display').textContent).toBe('$1,000');
    act(() => { rerender(<BalancePill balance={1500} />); });
    expect(screen.getByTestId('balance-aria-live').textContent).toBe('$1,500');
  });

  it('snaps to the new value on decrease (no count-up)', () => {
    const { rerender } = render(<BalancePill balance={1000} />);
    act(() => { rerender(<BalancePill balance={400} />); });
    expect(screen.getByTestId('balance-display').textContent).toBe('$400');
  });
});
