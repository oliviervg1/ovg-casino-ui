import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { GameStatusLine } from './GameStatusLine';

describe('GameStatusLine', () => {
  afterEach(() => cleanup());

  it('renders the Gemini 3.1 + Lyria 3 attribution while loading', () => {
    render(<GameStatusLine isLoading />);
    const node = screen.getByTestId('game-status-line');
    expect(node.textContent).toMatch(/Gemini 3\.1/);
    expect(node.textContent).toMatch(/Lyria 3/);
  });

  it('renders nothing when isLoading is false', () => {
    render(<GameStatusLine isLoading={false} />);
    expect(screen.queryByTestId('game-status-line')).toBeNull();
  });
});
