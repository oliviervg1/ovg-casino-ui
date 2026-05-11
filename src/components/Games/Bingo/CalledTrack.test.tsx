import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CalledTrack } from './CalledTrack';

describe('CalledTrack', () => {
  afterEach(() => cleanup());

  it('renders the track root with data-testid="called-track"', () => {
    render(<CalledTrack theme="sweets" drawn={new Set()} />);
    expect(screen.getByTestId('called-track')).toBeTruthy();
  });

  it('renders 30 cells (1..30) inside the track', () => {
    render(<CalledTrack theme="sweets" drawn={new Set()} />);
    for (let n = 1; n <= 30; n++) {
      expect(screen.getByTestId(`called-track-${n}`)).toBeTruthy();
    }
  });

  it('marks data-drawn="true" on cells whose number is in drawn', () => {
    render(<CalledTrack theme="sweets" drawn={new Set([5, 17, 22])} />);
    expect(screen.getByTestId('called-track-5').getAttribute('data-drawn')).toBe('true');
    expect(screen.getByTestId('called-track-17').getAttribute('data-drawn')).toBe('true');
    expect(screen.getByTestId('called-track-22').getAttribute('data-drawn')).toBe('true');
    expect(screen.getByTestId('called-track-1').getAttribute('data-drawn')).toBe('false');
  });

  it('shows the caption "Called so far · N / 12" with N = drawn.size', () => {
    render(<CalledTrack theme="sweets" drawn={new Set([5, 17, 22])} />);
    const text = screen.getByTestId('called-track').textContent ?? '';
    expect(text).toContain('Called so far');
    expect(text).toContain('3');
    expect(text).toContain('12');
  });

  it('caption updates when drawn changes', () => {
    const { rerender } = render(<CalledTrack theme="sweets" drawn={new Set([1])} />);
    expect(screen.getByTestId('called-track').textContent).toContain('1');
    rerender(<CalledTrack theme="sweets" drawn={new Set([1, 2, 3, 4, 5, 6, 7])} />);
    expect(screen.getByTestId('called-track').textContent).toContain('7');
  });
});
