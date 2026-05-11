import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PaylineStrip } from './PaylineStrip';

describe('PaylineStrip', () => {
  afterEach(() => cleanup());

  it('defaults to idle state', () => {
    render(<PaylineStrip winning={false} />);
    expect(screen.getByTestId('payline-strip').getAttribute('data-state')).toBe('idle');
  });

  it('switches to win state when winning is true', () => {
    render(<PaylineStrip winning={true} />);
    expect(screen.getByTestId('payline-strip').getAttribute('data-state')).toBe('win');
  });

  it('renders left and right arrow markers', () => {
    render(<PaylineStrip winning={false} />);
    expect(screen.queryByTestId('payline-arrow-left')).not.toBeNull();
    expect(screen.queryByTestId('payline-arrow-right')).not.toBeNull();
  });
});
