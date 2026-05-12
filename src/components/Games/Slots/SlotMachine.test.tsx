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
  lastPayout: null,
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

  it('marks middle-row symbols as winning when game.win is set', () => {
    render(
      <SlotMachine
        theme="sweets"
        game={{ ...baseGame, win: 'jackpot' }}
        symbols={['🍭', '🧁', '🍬']}
      />
    );
    // Each reel renders 3 SlotSymbol elements; the middle one should be data-winning="true".
    const reels = screen.getAllByTestId('slot-reel');
    for (const reel of reels) {
      const cells = reel.querySelectorAll('[data-cell]');
      expect(cells[1].getAttribute('data-cell')).toBe('middle');
      const innerSymbol = cells[1].querySelector('[data-testid="slot-symbol"]');
      expect(innerSymbol?.getAttribute('data-winning')).toBe('true');
    }
  });
});
