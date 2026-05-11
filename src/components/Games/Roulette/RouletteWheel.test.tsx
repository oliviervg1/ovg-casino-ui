import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { RouletteWheel } from './RouletteWheel';

describe('RouletteWheel', () => {
  afterEach(() => cleanup());

  it('renders an SVG root with the slot-wheel testid', () => {
    render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} />);
    const svg = screen.getByTestId('roulette-wheel');
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('viewBox')).toBe('0 0 100 100');
  });

  it('renders 37 segment paths with data-pocket attributes 0..36', () => {
    const { container } = render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} />);
    const paths = container.querySelectorAll('[data-pocket]');
    expect(paths.length).toBe(37);
    const pockets = Array.from(paths).map(p => Number(p.getAttribute('data-pocket')));
    expect(pockets).toEqual([...Array(37).keys()]);
  });

  it('marks pocket 0 with data-colour="green"', () => {
    const { container } = render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} />);
    const zero = container.querySelector('[data-pocket="0"]');
    expect(zero?.getAttribute('data-colour')).toBe('green');
  });

  it('renders 37 number labels (text elements) for pockets 0..36', () => {
    const { container } = render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} />);
    const labels = container.querySelectorAll('[data-pocket-label]');
    expect(labels.length).toBe(37);
  });
});
