import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { BingoCard } from './BingoCard';
import type { BingoLines } from '../gameLogic';

const noLines: BingoLines = {
  rows: [false, false, false],
  cols: [false, false, false],
  diags: [false, false],
};

describe('BingoCard', () => {
  afterEach(() => cleanup());

  it('renders the card root with data-testid="bingo-card"', () => {
    const board = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    render(<BingoCard theme="sweets" board={board} drawn={new Set()} lastDrawn={null} lines={noLines} />);
    expect(screen.getByTestId('bingo-card')).toBeTruthy();
  });

  it('renders 9 cells (3x3) with the board values', () => {
    const board = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    render(<BingoCard theme="sweets" board={board} drawn={new Set()} lastDrawn={null} lines={noLines} />);
    for (let v = 1; v <= 9; v++) {
      expect(screen.getByTestId(`bingo-cell-${v}`)).toBeTruthy();
    }
  });

  it('marks cells whose value is in drawn', () => {
    const board = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    render(
      <BingoCard
        theme="sweets"
        board={board}
        drawn={new Set([2, 5, 8])}
        lastDrawn={8}
        lines={noLines}
      />,
    );
    expect(screen.getByTestId('bingo-cell-2').getAttribute('data-marked')).toBe('true');
    expect(screen.getByTestId('bingo-cell-5').getAttribute('data-marked')).toBe('true');
    expect(screen.getByTestId('bingo-cell-8').getAttribute('data-marked')).toBe('true');
    expect(screen.getByTestId('bingo-cell-1').getAttribute('data-marked')).toBe('false');
  });

  it('flags isWinningLine on cells of a completed row', () => {
    const board = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    const lines: BingoLines = { ...noLines, rows: [true, false, false] };
    render(
      <BingoCard
        theme="sweets"
        board={board}
        drawn={new Set([1, 2, 3])}
        lastDrawn={3}
        lines={lines}
      />,
    );
    expect(screen.getByTestId('bingo-cell-1').getAttribute('data-winning-line')).toBe('true');
    expect(screen.getByTestId('bingo-cell-2').getAttribute('data-winning-line')).toBe('true');
    expect(screen.getByTestId('bingo-cell-3').getAttribute('data-winning-line')).toBe('true');
    expect(screen.getByTestId('bingo-cell-4').getAttribute('data-winning-line')).toBe('false');
  });

  it('flags isWinningLine on cells of a completed column', () => {
    const board = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    const lines: BingoLines = { ...noLines, cols: [false, true, false] };
    render(
      <BingoCard
        theme="sweets"
        board={board}
        drawn={new Set([2, 5, 8])}
        lastDrawn={8}
        lines={lines}
      />,
    );
    expect(screen.getByTestId('bingo-cell-2').getAttribute('data-winning-line')).toBe('true');
    expect(screen.getByTestId('bingo-cell-5').getAttribute('data-winning-line')).toBe('true');
    expect(screen.getByTestId('bingo-cell-8').getAttribute('data-winning-line')).toBe('true');
    expect(screen.getByTestId('bingo-cell-1').getAttribute('data-winning-line')).toBe('false');
  });

  it('flags isWinningLine on cells of the main diagonal', () => {
    const board = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    const lines: BingoLines = { ...noLines, diags: [true, false] };
    render(
      <BingoCard
        theme="sweets"
        board={board}
        drawn={new Set([1, 5, 9])}
        lastDrawn={9}
        lines={lines}
      />,
    );
    expect(screen.getByTestId('bingo-cell-1').getAttribute('data-winning-line')).toBe('true');
    expect(screen.getByTestId('bingo-cell-5').getAttribute('data-winning-line')).toBe('true');
    expect(screen.getByTestId('bingo-cell-9').getAttribute('data-winning-line')).toBe('true');
  });

  it('flags isWinningLine on cells of the anti-diagonal', () => {
    const board = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    const lines: BingoLines = { ...noLines, diags: [false, true] };
    render(
      <BingoCard
        theme="sweets"
        board={board}
        drawn={new Set([3, 5, 7])}
        lastDrawn={7}
        lines={lines}
      />,
    );
    expect(screen.getByTestId('bingo-cell-3').getAttribute('data-winning-line')).toBe('true');
    expect(screen.getByTestId('bingo-cell-5').getAttribute('data-winning-line')).toBe('true');
    expect(screen.getByTestId('bingo-cell-7').getAttribute('data-winning-line')).toBe('true');
  });

  it('does not render the BINGO banner when win is null (or unset)', () => {
    const board = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    render(<BingoCard theme="sweets" board={board} drawn={new Set()} lastDrawn={null} lines={noLines} />);
    expect(screen.queryByTestId('bingo-win-banner')).toBeNull();
  });

  it('renders the BINGO banner when win="small"', () => {
    const board = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    render(
      <BingoCard
        theme="sweets"
        board={board}
        drawn={new Set([1, 2, 3])}
        lastDrawn={3}
        lines={{ ...noLines, rows: [true, false, false] }}
        win="small"
      />,
    );
    const banner = screen.getByTestId('bingo-win-banner');
    expect(banner.textContent).toContain('BINGO');
  });

  it('renders the BINGO banner when win="jackpot"', () => {
    const board = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    render(
      <BingoCard
        theme="sweets"
        board={board}
        drawn={new Set()}
        lastDrawn={null}
        lines={noLines}
        win="jackpot"
      />,
    );
    expect(screen.getByTestId('bingo-win-banner')).toBeTruthy();
  });
});
