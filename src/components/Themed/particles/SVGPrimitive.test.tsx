import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Sparkle } from './Sparkle';
import { Dot } from './Dot';
import { Arc } from './Arc';

describe('SVG primitives', () => {
  afterEach(() => cleanup());

  it.each([
    ['Sparkle', Sparkle],
    ['Dot', Dot],
    ['Arc', Arc],
  ])('%s renders an svg with default size 12 and color="currentColor"', (_name, Comp) => {
    const { container } = render(<Comp />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg!.getAttribute('width')).toBe('12');
    expect(svg!.getAttribute('height')).toBe('12');
    // currentColor is the default — concrete fill/stroke uses currentColor literal.
    expect(svg!.outerHTML).toContain('currentColor');
  });

  it('Sparkle respects custom size and color props', () => {
    const { container } = render(<Sparkle size={24} color="#ff0" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('24');
    expect(svg.outerHTML).toContain('#ff0');
  });
});
