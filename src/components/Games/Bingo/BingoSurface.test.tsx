import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { BingoSurface } from './BingoSurface';
import type { UseBingoGameReturn } from '../../../hooks/useBingoGame';

const baseGame: UseBingoGameReturn = {
  bet: 10,
  setBet: () => {},
  board: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
  drawn: [],
  drawing: false,
  win: null,
  message: null,
  lastDrawn: null,
  play: () => {},
};

describe('BingoSurface', () => {
  afterEach(() => cleanup());

  it('renders the card, called panel, and called track', () => {
    render(<BingoSurface theme="sweets" game={baseGame} />);
    expect(screen.getByTestId('bingo-card')).toBeTruthy();
    expect(screen.getByTestId('called-panel')).toBeTruthy();
    expect(screen.getByTestId('called-track')).toBeTruthy();
  });

  it('marks cells whose values are in drawn', () => {
    render(
      <BingoSurface
        theme="sweets"
        game={{ ...baseGame, drawn: [2, 5], lastDrawn: 5 }}
      />,
    );
    expect(screen.getByTestId('bingo-cell-2').getAttribute('data-marked')).toBe('true');
    expect(screen.getByTestId('bingo-cell-5').getAttribute('data-marked')).toBe('true');
    expect(screen.getByTestId('bingo-cell-1').getAttribute('data-marked')).toBe('false');
  });

  it('the just-called badge shows lastDrawn', () => {
    render(
      <BingoSurface theme="sweets" game={{ ...baseGame, drawn: [2], lastDrawn: 2 }} />,
    );
    expect(screen.getByTestId('just-called-badge').textContent).toContain('2');
  });

  it('the called-track lights cells in drawn', () => {
    render(
      <BingoSurface theme="sweets" game={{ ...baseGame, drawn: [2, 5, 8], lastDrawn: 8 }} />,
    );
    expect(screen.getByTestId('called-track-2').getAttribute('data-drawn')).toBe('true');
    expect(screen.getByTestId('called-track-5').getAttribute('data-drawn')).toBe('true');
    expect(screen.getByTestId('called-track-8').getAttribute('data-drawn')).toBe('true');
    expect(screen.getByTestId('called-track-1').getAttribute('data-drawn')).toBe('false');
  });

  it('flags lines tracker Row 1 complete when row 1 is fully drawn', () => {
    render(
      <BingoSurface theme="sweets" game={{ ...baseGame, drawn: [1, 2, 3], lastDrawn: 3 }} />,
    );
    expect(screen.getByTestId('lines-tracker-rows0').getAttribute('data-complete')).toBe('true');
  });

  it('flags winning-line cells on completed row', () => {
    render(
      <BingoSurface theme="sweets" game={{ ...baseGame, drawn: [1, 2, 3], lastDrawn: 3 }} />,
    );
    expect(screen.getByTestId('bingo-cell-1').getAttribute('data-winning-line')).toBe('true');
    expect(screen.getByTestId('bingo-cell-2').getAttribute('data-winning-line')).toBe('true');
    expect(screen.getByTestId('bingo-cell-3').getAttribute('data-winning-line')).toBe('true');
  });

  it('passes win through to BingoCard so the BINGO banner shows on win', () => {
    render(
      <BingoSurface theme="sweets" game={{ ...baseGame, drawn: [1, 2, 3], lastDrawn: 3, win: 'small' }} />,
    );
    expect(screen.getByTestId('bingo-win-banner')).toBeTruthy();
  });

  it('does not show the BINGO banner when win is null', () => {
    render(<BingoSurface theme="sweets" game={baseGame} />);
    expect(screen.queryByTestId('bingo-win-banner')).toBeNull();
  });
});
