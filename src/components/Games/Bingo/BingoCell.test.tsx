import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { BingoCell } from './BingoCell';

describe('BingoCell', () => {
  afterEach(() => cleanup());

  it('renders the value in the cell text content', () => {
    render(<BingoCell value={17} marked={false} isLastDrawn={false} isWinningLine={false} />);
    expect(screen.getByTestId('bingo-cell-17').textContent).toContain('17');
  });

  it('shows no marker when marked=false', () => {
    render(<BingoCell value={5} marked={false} isLastDrawn={false} isWinningLine={false} />);
    expect(screen.queryByTestId('bingo-marker')).toBeNull();
  });

  it('shows the marker when marked=true', () => {
    render(<BingoCell value={5} marked={true} isLastDrawn={false} isWinningLine={false} />);
    expect(screen.getByTestId('bingo-marker')).toBeTruthy();
  });

  it('reflects marked state via data-marked attribute', () => {
    const { rerender } = render(
      <BingoCell value={5} marked={false} isLastDrawn={false} isWinningLine={false} />,
    );
    expect(screen.getByTestId('bingo-cell-5').getAttribute('data-marked')).toBe('false');
    rerender(<BingoCell value={5} marked={true} isLastDrawn={false} isWinningLine={false} />);
    expect(screen.getByTestId('bingo-cell-5').getAttribute('data-marked')).toBe('true');
  });

  it('reflects winning-line state via data-winning-line attribute', () => {
    const { rerender } = render(
      <BingoCell value={5} marked={true} isLastDrawn={false} isWinningLine={false} />,
    );
    expect(screen.getByTestId('bingo-cell-5').getAttribute('data-winning-line')).toBe('false');
    rerender(<BingoCell value={5} marked={true} isLastDrawn={false} isWinningLine={true} />);
    expect(screen.getByTestId('bingo-cell-5').getAttribute('data-winning-line')).toBe('true');
  });
});
