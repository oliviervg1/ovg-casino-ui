import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { Roulette } from './Roulette';
import { AudioControlsProvider } from '../../contexts/AudioControlsContext';

// GameShell hides children behind a skeleton until assets+music resolve.
// Stub both hooks so the bet-type buttons (children) actually render.
vi.mock('../../hooks/useAssets', () => ({
  useAssets: () => ({ assets: { bg_roulette_sweets: 'https://x/bg', roulette_sweets: 'https://x/r' }, loading: false }),
}));
vi.mock('../../hooks/useMusic', () => ({
  useMusic: () => ({ musicUrl: 'https://x/m', loading: false }),
}));

describe('Roulette', () => {
  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute('data-theme');
  });

  it('shows "Pick Red / Black / Even / Odd" as the play label until a bet type is chosen', () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    render(
      <AudioControlsProvider>
        <Roulette
          name="Wheel"
          theme="sweets"
          balance={100}
          onUpdateBalance={() => {}}
          onBack={() => {}}
        />
      </AudioControlsProvider>
    );
    expect(screen.getByRole('button', { name: /pick red/i })).toBeTruthy();
    // Choose red, then the SPIN label takes over.
    fireEvent.click(screen.getByRole('button', { name: 'red' }));
    expect(screen.getByRole('button', { name: /spin the wheel/i })).toBeTruthy();
  });
});
