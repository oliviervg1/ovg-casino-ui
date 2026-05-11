import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SlotMachine } from './SlotMachine';
import type { UseSlotsGameReturn } from '../../../hooks/useSlotsGame';

const baseGame: UseSlotsGameReturn = {
  bet: 10,
  setBet: () => {},
  reelStates: [
    { top: '🍭', middle: '🧁', bottom: '🍬' },
    { top: '🍩', middle: '🍭', bottom: '🧁' },
    { top: '🍬', middle: '🍩', bottom: '🍭' },
  ],
  spinning: false,
  win: null,
  message: null,
  spin: () => {},
};

describe('SlotMachine', () => {
  afterEach(() => cleanup());

  it('renders the chassis, payline, three reels, and the bottom LED bar', () => {
    render(<SlotMachine theme="sweets" game={baseGame} symbols={['🍭','🧁','🍬','🍩']} />);
    expect(screen.getByTestId('slot-chassis')).toBeTruthy();
    expect(screen.getByTestId('payline-strip')).toBeTruthy();
    expect(screen.getAllByTestId('slot-reel').length).toBe(3);
    expect(screen.getByTestId('bottom-led-bar')).toBeTruthy();
  });

  it('switches payline data-state to "win" when game.win is non-null', () => {
    render(<SlotMachine theme="sweets" game={{ ...baseGame, win: 'jackpot' }} symbols={['🍭']} />);
    expect(screen.getByTestId('payline-strip').getAttribute('data-state')).toBe('win');
  });
});
