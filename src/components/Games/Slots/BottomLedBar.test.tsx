import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { BottomLedBar } from './BottomLedBar';

describe('BottomLedBar', () => {
  afterEach(() => cleanup());

  it('idle state when win is null', () => {
    render(<BottomLedBar win={null} />);
    expect(screen.getByTestId('bottom-led-bar').getAttribute('data-state')).toBe('idle');
  });

  it('small state for small win', () => {
    render(<BottomLedBar win="small" />);
    expect(screen.getByTestId('bottom-led-bar').getAttribute('data-state')).toBe('small');
  });

  it('jackpot state for jackpot win', () => {
    render(<BottomLedBar win="jackpot" />);
    expect(screen.getByTestId('bottom-led-bar').getAttribute('data-state')).toBe('jackpot');
  });
});
