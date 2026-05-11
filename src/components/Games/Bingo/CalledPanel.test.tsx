import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CalledPanel } from './CalledPanel';
import type { BingoLines } from '../gameLogic';

const noLines: BingoLines = {
  rows: [false, false, false],
  cols: [false, false, false],
  diags: [false, false],
};

describe('CalledPanel', () => {
  afterEach(() => cleanup());

  it('renders the panel root with data-testid="called-panel"', () => {
    render(<CalledPanel lastDrawn={null} lines={noLines} />);
    expect(screen.getByTestId('called-panel')).toBeTruthy();
  });

  it('renders the just-called badge container', () => {
    render(<CalledPanel lastDrawn={null} lines={noLines} />);
    expect(screen.getByTestId('just-called-badge')).toBeTruthy();
  });

  it('shows the lastDrawn number inside the badge when set', () => {
    render(<CalledPanel lastDrawn={17} lines={noLines} />);
    expect(screen.getByTestId('just-called-badge').textContent).toContain('17');
  });

  it('renders an empty badge when lastDrawn is null', () => {
    render(<CalledPanel lastDrawn={null} lines={noLines} />);
    expect((screen.getByTestId('just-called-badge').textContent ?? '').trim()).toBe('');
  });

  it('updates the badge contents when lastDrawn changes', () => {
    const { rerender } = render(<CalledPanel lastDrawn={5} lines={noLines} />);
    expect(screen.getByTestId('just-called-badge').textContent).toContain('5');
    rerender(<CalledPanel lastDrawn={22} lines={noLines} />);
    expect(screen.getByTestId('just-called-badge').textContent).toContain('22');
  });

  it('renders the lines tracker with 4 rows (Row 1, Row 2, Row 3, Cols & Diagonals)', () => {
    render(<CalledPanel lastDrawn={null} lines={noLines} />);
    expect(screen.getByTestId('lines-tracker')).toBeTruthy();
    expect(screen.getByTestId('lines-tracker-rows0')).toBeTruthy();
    expect(screen.getByTestId('lines-tracker-rows1')).toBeTruthy();
    expect(screen.getByTestId('lines-tracker-rows2')).toBeTruthy();
    expect(screen.getByTestId('lines-tracker-colsOrDiags')).toBeTruthy();
  });

  it('marks Row 1 complete when lines.rows[0]=true', () => {
    const lines: BingoLines = { ...noLines, rows: [true, false, false] };
    render(<CalledPanel lastDrawn={null} lines={lines} />);
    expect(screen.getByTestId('lines-tracker-rows0').getAttribute('data-complete')).toBe('true');
    expect(screen.getByTestId('lines-tracker-rows1').getAttribute('data-complete')).toBe('false');
    expect(screen.getByTestId('lines-tracker-rows2').getAttribute('data-complete')).toBe('false');
  });

  it('marks Cols & Diagonals complete when ANY column is complete', () => {
    const lines: BingoLines = { ...noLines, cols: [false, true, false] };
    render(<CalledPanel lastDrawn={null} lines={lines} />);
    expect(screen.getByTestId('lines-tracker-colsOrDiags').getAttribute('data-complete')).toBe('true');
  });

  it('marks Cols & Diagonals complete when ANY diagonal is complete', () => {
    const lines: BingoLines = { ...noLines, diags: [true, false] };
    render(<CalledPanel lastDrawn={null} lines={lines} />);
    expect(screen.getByTestId('lines-tracker-colsOrDiags').getAttribute('data-complete')).toBe('true');
  });

  it('marks Cols & Diagonals incomplete when no col or diag is complete', () => {
    render(<CalledPanel lastDrawn={null} lines={noLines} />);
    expect(screen.getByTestId('lines-tracker-colsOrDiags').getAttribute('data-complete')).toBe('false');
  });
});
