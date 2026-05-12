import { describe, it, expect, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { GameShellProps } from './GameShell';

vi.mock('../../hooks/useAssets', () => ({ useAssets: () => ({ assets: { bg_test: 'https://x/bg' }, loading: false }) }));
vi.mock('../../hooks/useMusic', () => ({ useMusic: () => ({ musicUrl: 'https://x/m', loading: false }) }));

import { GameShell } from './GameShell';
import { AudioControlsProvider } from '../../contexts/AudioControlsContext';

describe('GameShell', () => {
  const baseProps = {
    name: 'Roulette',
    theme: 'sweets' as const,
    bgKey: 'bg_test',
    extraAssetKeys: [] as string[],
    gameType: 'roulette' as const,
    win: null,
    bet: 10,
    onBet: vi.fn(),
    onPlay: vi.fn(),
    playLabel: 'SPIN',
    playDisabled: false,
    message: null,
    balance: 100,
    onBack: vi.fn(),
  };

  const renderShell = (overrides: Partial<ComponentProps<typeof GameShell>> = {}) => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    return render(
      <AudioControlsProvider>
        <GameShell {...baseProps} {...overrides}>
          <div data-testid="game-body" />
        </GameShell>
      </AudioControlsProvider>
    );
  };

  it('renders children', () => {
    render(
      <AudioControlsProvider>
        <GameShell {...baseProps}><div data-testid="surface">wheel</div></GameShell>
      </AudioControlsProvider>
    );
    expect(screen.getByTestId('surface')).toBeTruthy();
  });

  it('calls onPlay when the play button is clicked', () => {
    const onPlay = vi.fn();
    render(
      <AudioControlsProvider>
        <GameShell {...baseProps} onPlay={onPlay}><div /></GameShell>
      </AudioControlsProvider>
    );
    fireEvent.click(screen.getByText('SPIN'));
    expect(onPlay).toHaveBeenCalledOnce();
  });

  it('disables the play button when playDisabled is true', () => {
    render(
      <AudioControlsProvider>
        <GameShell {...baseProps} playDisabled><div /></GameShell>
      </AudioControlsProvider>
    );
    const btn = screen.getByText('SPIN').closest('button')!;
    expect(btn.disabled).toBe(true);
  });

  it('shows loading state when assets are loading', async () => {
    vi.doMock('../../hooks/useAssets', () => ({ useAssets: () => ({ assets: {}, loading: true }) }));
    vi.resetModules();
    const { GameShell: Shell2 } = await import('./GameShell');
    const { AudioControlsProvider: Provider2 } = await import('../../contexts/AudioControlsContext');
    render(
      <Provider2>
        <Shell2 {...baseProps}><div /></Shell2>
      </Provider2>
    );
    expect(screen.getByText(/generating unique/i)).toBeTruthy();
  });

  it('renders a <BetControl> instead of a bare number input', () => {
    renderShell();
    expect(screen.getByTestId('bet-control')).toBeTruthy();
    expect(document.querySelector('input[type="number"]')).toBeNull();
  });

  it('renders the play button as a ThemedButton (carries data-button-variant)', () => {
    renderShell();
    const btn = screen.getByRole('button', { name: 'SPIN' });
    expect(btn.getAttribute('data-button-variant')).toBeTruthy();
    expect(btn.getAttribute('data-size')).toBe('hero');
  });

  it('does not render the legacy back-to-lobby button (lives in AppHeader now)', () => {
    renderShell();
    expect(screen.queryByRole('button', { name: /back to lobby/i })).toBeNull();
  });
});

describe('GameShellProps typing', () => {
  it("accepts 'loss' in the win prop union", () => {
    const _props: Pick<GameShellProps, 'win'> = { win: 'loss' };
    expect(_props.win).toBe('loss');
  });

  it('accepts lastPayout: number | null | undefined', () => {
    const a: Pick<GameShellProps, 'lastPayout'> = { lastPayout: 100 };
    const b: Pick<GameShellProps, 'lastPayout'> = { lastPayout: null };
    const c: Pick<GameShellProps, 'lastPayout'> = {};
    expect(a.lastPayout).toBe(100);
    expect(b.lastPayout).toBe(null);
    expect(c.lastPayout).toBeUndefined();
  });
});
