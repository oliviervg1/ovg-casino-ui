import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { BetTable } from './BetTable';

describe('BetTable', () => {
  afterEach(() => cleanup());

  it('renders 4 bet cells: red, black, even, odd', () => {
    render(<BetTable bet={10} betType={null} onSelect={vi.fn()} disabled={false} />);
    const cells = screen.getAllByTestId(/^bet-cell-/);
    expect(cells.length).toBe(4);
    const types = cells.map(c => c.getAttribute('data-bet-type')).sort();
    expect(types).toEqual(['black', 'even', 'odd', 'red']);
  });

  it('clicking a cell calls onSelect with that bet type', () => {
    const onSelect = vi.fn();
    render(<BetTable bet={10} betType={null} onSelect={onSelect} disabled={false} />);
    fireEvent.click(screen.getByTestId('bet-cell-red'));
    expect(onSelect).toHaveBeenCalledWith('red');
  });

  it('the active cell has data-active="true"', () => {
    render(<BetTable bet={10} betType="even" onSelect={vi.fn()} disabled={false} />);
    expect(screen.getByTestId('bet-cell-even').getAttribute('data-active')).toBe('true');
    expect(screen.getByTestId('bet-cell-red').getAttribute('data-active')).toBe('false');
  });

  it('renders the bet chip on the active cell with the bet amount', () => {
    render(<BetTable bet={25} betType="black" onSelect={vi.fn()} disabled={false} />);
    const chip = screen.getByTestId('bet-chip');
    expect(chip.textContent).toContain('25');
    const activeCell = screen.getByTestId('bet-cell-black');
    expect(activeCell.contains(chip)).toBe(true);
  });

  it('renders no chip when betType is null', () => {
    render(<BetTable bet={10} betType={null} onSelect={vi.fn()} disabled={false} />);
    expect(screen.queryByTestId('bet-chip')).toBeNull();
  });

  it('disables all cells when disabled=true', () => {
    render(<BetTable bet={10} betType={null} onSelect={vi.fn()} disabled={true} />);
    for (const cell of screen.getAllByTestId(/^bet-cell-/)) {
      expect(cell.hasAttribute('disabled')).toBe(true);
    }
  });
});
