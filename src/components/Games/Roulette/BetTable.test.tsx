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

  it('cell labels use fixed pixel font sizes (not vh) so BLACK fits at tall viewports', () => {
    // vh-based font scales with viewport HEIGHT — at portrait viewports
    // (e.g., 1471x1914), text-[2vh] resolves to ~38px which overflows the
    // ~140px-wide cell at md+. Fixed pixel sizes decouple font from
    // viewport height, keeping the label bounded regardless of orientation.
    render(<BetTable bet={10} betType={null} onSelect={vi.fn()} disabled={false} />);
    const cls = screen.getByTestId('bet-cell-black').className;
    expect(cls).toContain('text-[11px]');
    expect(cls).toContain('md:text-[14px]');
    expect(cls).toContain('tracking-tight');
    // whitespace-nowrap prevents the label from wrapping to a second line
    // when px-[1vh] horizontal padding is large at tall viewports.
    expect(cls).toContain('whitespace-nowrap');
  });
});
