import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { AudioControlsProvider } from '../../contexts/AudioControlsContext';
import { CelebrationProvider } from '../../contexts/CelebrationContext';
import { Roulette } from './Roulette';

vi.mock('../../utils/SoundEngine', () => ({
  soundEngine: { playRouletteSpin: vi.fn(), playWin: vi.fn(), playLose: vi.fn(), setMuted: vi.fn() },
}));
vi.mock('../../hooks/useAssets', () => ({
  useAssets: () => ({
    assets: { bg_roulette_sweets: 'https://x/bg.png', roulette_sweets: 'https://x/icon.png' },
    loading: false,
  }),
}));
vi.mock('../../hooks/useMusic', () => ({ useMusic: () => ({ musicUrl: null, loading: false }) }));

const renderRoulette = (overrides: Partial<React.ComponentProps<typeof Roulette>> = {}) =>
  render(
    <AudioControlsProvider>
      <CelebrationProvider>
        <Roulette
          theme="sweets"
          balance={100}
          onUpdateBalance={vi.fn()}
          {...overrides}
        />
      </CelebrationProvider>
    </AudioControlsProvider>
  );

describe('Roulette (integration)', () => {
  afterEach(() => cleanup());

  it('renders the roulette wheel inside GameShell', () => {
    renderRoulette();
    expect(screen.getByTestId('roulette-wheel')).toBeTruthy();
  });

  it('renders the bet table with 4 cells', () => {
    renderRoulette();
    const cells = screen.getAllByTestId(/^bet-cell-/);
    expect(cells.length).toBe(4);
  });

  it('hero button label reads "Pick Red / Black / Even / Odd" until a bet type is chosen', () => {
    renderRoulette();
    expect(screen.getByRole('button', { name: /pick red \/ black \/ even \/ odd/i })).toBeTruthy();
  });

  it('after clicking a bet cell, hero button label changes to "SPIN THE WHEEL"', () => {
    renderRoulette();
    fireEvent.click(screen.getByTestId('bet-cell-red'));
    expect(screen.getByRole('button', { name: /spin the wheel/i })).toBeTruthy();
  });
});
