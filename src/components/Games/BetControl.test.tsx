import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { BetControl } from './BetControl';

describe('BetControl', () => {
  afterEach(() => cleanup());

  it('renders the four default preset chips', () => {
    render(<BetControl value={10} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Bet 5' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bet 10' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bet 25' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bet 100' })).toBeTruthy();
  });

  it('marks the chip whose value matches the current bet as active', () => {
    render(<BetControl value={25} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Bet 25' }).getAttribute('data-active')).toBe('true');
    expect(screen.getByRole('button', { name: 'Bet 10' }).getAttribute('data-active')).toBe('false');
  });

  it('calls onChange with the chip value when a chip is clicked', () => {
    let value = 10;
    const onChange = (n: number) => { value = n; };
    render(<BetControl value={value} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bet 25' }));
    expect(value).toBe(25);
  });

  it('+ stepper increments by 1', () => {
    let value = 10;
    const onChange = (n: number) => { value = n; };
    render(<BetControl value={value} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /increase bet/i }));
    expect(value).toBe(11);
  });

  it('− stepper decrements by 1 but clamps at min (default 1)', () => {
    let value = 1;
    const onChange = (n: number) => { value = n; };
    render(<BetControl value={value} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /decrease bet/i }));
    expect(value).toBe(1); // clamped at default min=1
  });

  it('shows the current value as a number readout', () => {
    render(<BetControl value={42} onChange={() => {}} />);
    expect(screen.getByTestId('bet-value').textContent).toBe('42');
  });

  it('disables every interactive element when disabled=true', () => {
    render(<BetControl value={10} onChange={() => {}} disabled />);
    expect((screen.getByRole('button', { name: 'Bet 10' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /increase bet/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /decrease bet/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});
