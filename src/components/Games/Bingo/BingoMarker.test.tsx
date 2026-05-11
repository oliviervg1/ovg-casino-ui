import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { BingoMarker } from './BingoMarker';

describe('BingoMarker', () => {
  afterEach(() => cleanup());

  it('renders an element with data-testid="bingo-marker"', () => {
    render(<BingoMarker />);
    expect(screen.getByTestId('bingo-marker')).toBeTruthy();
  });

  it('renders as a div (Framer motion.div)', () => {
    render(<BingoMarker />);
    expect(screen.getByTestId('bingo-marker').tagName.toLowerCase()).toBe('div');
  });

  it('is absolutely positioned (so it overlays its parent cell)', () => {
    render(<BingoMarker />);
    const m = screen.getByTestId('bingo-marker');
    expect(m.className).toContain('absolute');
  });
});
