import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { RouletteSurface } from './RouletteSurface';
import type { UseRouletteGameReturn } from '../../../hooks/useRouletteGame';

const baseGame: UseRouletteGameReturn = {
  bet: 10,
  setBet: () => {},
  betType: null,
  setBetType: () => {},
  spinning: false,
  resultNum: null,
  resultColour: null,
  win: null,
  lastPayout: null,
  message: null,
  wheelRotation: 0,
  ballRotation: 0,
  spin: () => {},
};

describe('RouletteSurface', () => {
  afterEach(() => cleanup());

  it('renders the wheel, bet table, and (no) result strip when no result', () => {
    render(<RouletteSurface theme="sweets" game={baseGame} />);
    expect(screen.getByTestId('roulette-wheel')).toBeTruthy();
    expect(screen.getByTestId('bet-table')).toBeTruthy();
    expect(screen.queryByTestId('result-strip')).toBeNull();
  });

  it('renders the result strip when resultNum is set', () => {
    render(<RouletteSurface theme="sweets" game={{ ...baseGame, resultNum: 17, resultColour: 'black' }} />);
    expect(screen.getByTestId('result-strip')).toBeTruthy();
  });

  it('cone shows resultNum when set', () => {
    render(<RouletteSurface theme="sweets" game={{ ...baseGame, resultNum: 7, resultColour: 'red' }} />);
    expect(screen.getByTestId('roulette-cone').textContent).toContain('7');
  });
});
