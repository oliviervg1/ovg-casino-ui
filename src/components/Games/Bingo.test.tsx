import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AudioControlsProvider } from '../../contexts/AudioControlsContext';
import { Bingo } from './Bingo';

vi.mock('../../utils/SoundEngine', () => ({
  soundEngine: {
    playBingoDraw: vi.fn(),
    playWin: vi.fn(),
    playLose: vi.fn(),
    setMuted: vi.fn(),
  },
}));
vi.mock('../../hooks/useAssets', () => ({
  useAssets: () => ({
    assets: { bg_bingo_sweets: 'https://x/bg.png', bingo_sweets: 'https://x/icon.png' },
    loading: false,
  }),
}));
vi.mock('../../hooks/useMusic', () => ({ useMusic: () => ({ musicUrl: null, loading: false }) }));

const renderBingo = (overrides: Partial<React.ComponentProps<typeof Bingo>> = {}) =>
  render(
    <AudioControlsProvider>
      <Bingo
        name="Sweet Bingo"
        theme="sweets"
        balance={100}
        onUpdateBalance={vi.fn()}
        onBack={vi.fn()}
        {...overrides}
      />
    </AudioControlsProvider>,
  );

describe('Bingo (integration)', () => {
  afterEach(() => cleanup());

  it('renders the bingo card inside GameShell', () => {
    renderBingo();
    expect(screen.getByTestId('bingo-card')).toBeTruthy();
  });

  it('renders 9 cells (3x3 board)', () => {
    renderBingo();
    const cells = screen.getAllByTestId(/^bingo-cell-/);
    expect(cells.length).toBe(9);
  });

  it('renders the called panel with JUST CALLED badge + LINES tracker', () => {
    renderBingo();
    expect(screen.getByTestId('called-panel')).toBeTruthy();
    expect(screen.getByTestId('just-called-badge')).toBeTruthy();
    expect(screen.getByTestId('lines-tracker')).toBeTruthy();
  });

  it('renders the called track strip (1-30)', () => {
    renderBingo();
    expect(screen.getByTestId('called-track')).toBeTruthy();
    for (let n = 1; n <= 30; n++) {
      expect(screen.getByTestId(`called-track-${n}`)).toBeTruthy();
    }
  });

  it('hero button label reads "PLAY BINGO" before drawing starts', () => {
    renderBingo();
    expect(screen.getByRole('button', { name: /play bingo/i })).toBeTruthy();
  });
});
