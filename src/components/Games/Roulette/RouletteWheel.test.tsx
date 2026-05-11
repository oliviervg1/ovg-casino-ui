import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { RouletteWheel } from './RouletteWheel';

describe('RouletteWheel', () => {
  afterEach(() => cleanup());

  it('renders an SVG root with the slot-wheel testid', () => {
    render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} wheelRotation={0} ballRotation={0} />);
    const svg = screen.getByTestId('roulette-wheel');
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('viewBox')).toBe('0 0 100 100');
  });

  it('renders 37 segment paths with data-pocket attributes 0..36', () => {
    const { container } = render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} wheelRotation={0} ballRotation={0} />);
    const paths = container.querySelectorAll('path[data-pocket]');
    expect(paths.length).toBe(37);
    const pockets = Array.from(paths).map(p => Number(p.getAttribute('data-pocket')));
    expect(pockets).toEqual([...Array(37).keys()]);
  });

  it('marks pocket 0 with data-colour="green"', () => {
    const { container } = render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} wheelRotation={0} ballRotation={0} />);
    const zero = container.querySelector('path[data-pocket="0"]');
    expect(zero?.getAttribute('data-colour')).toBe('green');
  });

  it('renders 37 number labels (text elements) for pockets 0..36', () => {
    const { container } = render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} wheelRotation={0} ballRotation={0} />);
    const labels = container.querySelectorAll('[data-pocket-label]');
    expect(labels.length).toBe(37);
  });

  it('renders the outer rim with data-testid="roulette-rim"', () => {
    render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} wheelRotation={0} ballRotation={0} />);
    expect(screen.getByTestId('roulette-rim')).toBeTruthy();
  });

  it('renders the inner cone with data-testid="roulette-cone"', () => {
    render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} wheelRotation={0} ballRotation={0} />);
    expect(screen.getByTestId('roulette-cone')).toBeTruthy();
  });

  it('renders the fixed pointer with data-testid="roulette-pointer"', () => {
    render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} wheelRotation={0} ballRotation={0} />);
    expect(screen.getByTestId('roulette-pointer')).toBeTruthy();
  });

  it('cone shows the result number when resultNum is set, "—" when null', () => {
    const { rerender } = render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} wheelRotation={0} ballRotation={0} />);
    expect(screen.getByTestId('roulette-cone').textContent).toContain('—');
    rerender(<RouletteWheel theme="sweets" spinning={false} resultNum={17} wheelRotation={0} ballRotation={0} />);
    expect(screen.getByTestId('roulette-cone').textContent).toContain('17');
  });

  it('renders the orbiting ball with data-testid="roulette-ball"', () => {
    render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} wheelRotation={0} ballRotation={0} />);
    expect(screen.getByTestId('roulette-ball')).toBeTruthy();
  });

  it('ball data-pocket attribute reflects resultNum (or 0 when null)', () => {
    const { rerender } = render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} wheelRotation={0} ballRotation={0} />);
    expect(screen.getByTestId('roulette-ball').getAttribute('data-pocket')).toBe('0');
    rerender(<RouletteWheel theme="sweets" spinning={false} resultNum={17} wheelRotation={0} ballRotation={0} />);
    expect(screen.getByTestId('roulette-ball').getAttribute('data-pocket')).toBe('17');
  });

  it('exposes data-spinning attribute reflecting the spinning prop', () => {
    const { rerender } = render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} wheelRotation={0} ballRotation={0} />);
    expect(screen.getByTestId('roulette-wheel-frame').getAttribute('data-spinning')).toBe('false');
    rerender(<RouletteWheel theme="sweets" spinning={true} resultNum={null} wheelRotation={0} ballRotation={0} />);
    expect(screen.getByTestId('roulette-wheel-frame').getAttribute('data-spinning')).toBe('true');
  });

  it('renders the segment-rotation group with data-testid="roulette-wheel-segments"', () => {
    render(<RouletteWheel theme="sweets" spinning={false} resultNum={null} wheelRotation={0} ballRotation={0} />);
    expect(screen.getByTestId('roulette-wheel-segments')).toBeTruthy();
  });
});
