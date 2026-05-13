import { describe, it, expect, vi } from 'vitest';
import type { ComponentProps, ReactNode } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { GameShellProps } from './GameShell';

vi.mock('../../hooks/useAssets', () => ({ useAssets: () => ({ assets: { bg_test: 'https://x/bg' }, loading: false }) }));
vi.mock('../../hooks/useMusic', () => ({ useMusic: () => ({ musicUrl: 'https://x/m', loading: false }) }));

import { GameShell } from './GameShell';
import { AudioControlsProvider } from '../../contexts/AudioControlsContext';
import { CelebrationProvider } from '../../contexts/CelebrationContext';

function Providers({ children }: { children: ReactNode }) {
  return (
    <AudioControlsProvider>
      <CelebrationProvider>{children}</CelebrationProvider>
    </AudioControlsProvider>
  );
}

describe('GameShell', () => {
  const baseProps = {
    name: 'Roulette',
    theme: 'sweets' as const,
    bgKey: 'bg_test',
    extraAssetKeys: [] as string[],
    gameType: 'roulette' as const,
    win: null,
    lastPayout: null,
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
      <Providers>
        <GameShell {...baseProps} {...overrides}>
          <div data-testid="game-body" />
        </GameShell>
      </Providers>
    );
  };

  it('renders children', () => {
    render(
      <Providers>
        <GameShell {...baseProps}><div data-testid="surface">wheel</div></GameShell>
      </Providers>
    );
    expect(screen.getByTestId('surface')).toBeTruthy();
  });

  it('calls onPlay when the play button is clicked', () => {
    const onPlay = vi.fn();
    render(
      <Providers>
        <GameShell {...baseProps} onPlay={onPlay}><div /></GameShell>
      </Providers>
    );
    fireEvent.click(screen.getByText('SPIN'));
    expect(onPlay).toHaveBeenCalledOnce();
  });

  it('disables the play button when playDisabled is true', () => {
    render(
      <Providers>
        <GameShell {...baseProps} playDisabled><div /></GameShell>
      </Providers>
    );
    const btn = screen.getByText('SPIN').closest('button')!;
    expect(btn.disabled).toBe(true);
  });

  it('shows loading state when assets are loading', async () => {
    vi.doMock('../../hooks/useAssets', () => ({ useAssets: () => ({ assets: {}, loading: true }) }));
    vi.resetModules();
    const { GameShell: Shell2 } = await import('./GameShell');
    const { AudioControlsProvider: Provider2 } = await import('../../contexts/AudioControlsContext');
    const { CelebrationProvider: CProvider2 } = await import('../../contexts/CelebrationContext');
    render(
      <Provider2>
        <CProvider2>
          <Shell2 {...baseProps}><div /></Shell2>
        </CProvider2>
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

  it('accepts lastPayout: number | null', () => {
    const a: Pick<GameShellProps, 'lastPayout'> = { lastPayout: 100 };
    const b: Pick<GameShellProps, 'lastPayout'> = { lastPayout: null };
    expect(a.lastPayout).toBe(100);
    expect(b.lastPayout).toBe(null);
  });
});

describe('GameShell celebration integration', () => {
  const baseProps: GameShellProps = {
    name: 'Test', theme: 'sweets', bgKey: 'bg_test',
    extraAssetKeys: [], gameType: 'slots',
    win: null, lastPayout: null,
    bet: 10, onBet: () => {}, onPlay: () => {}, playLabel: 'PLAY',
    playDisabled: false, message: null, balance: 1000,
    onBack: () => {},
    children: <div>game</div>,
  };

  function withProvider(ui: ReactNode) {
    return (
      <AudioControlsProvider>
        <CelebrationProvider>{ui}</CelebrationProvider>
      </AudioControlsProvider>
    );
  }

  it('the message line carries aria-live="polite" role="status"', () => {
    const { container } = render(withProvider(
      <GameShell {...baseProps} message="Hello">
        <div>game</div>
      </GameShell>
    ));
    const live = container.querySelector('p[aria-live="polite"]');
    expect(live).toBeTruthy();
    expect(live!.getAttribute('role')).toBe('status');
    expect(live!.textContent).toBe('Hello');
  });

  it('does NOT render an inline JACKPOT! div directly (handled by ThemedCelebration)', () => {
    const { container } = render(withProvider(
      <GameShell {...baseProps} win="jackpot" lastPayout={500} message="JACKPOT! +500">
        <div>game</div>
      </GameShell>
    ));
    expect(container.textContent).toContain('CANDY JACKPOT!');
    expect(container.querySelector('.text-7xl.font-casino')).toBe(null);
  });

  it('renders ThemedCelebration LossPlate for win=loss', () => {
    const { container } = render(withProvider(
      <GameShell {...baseProps} win="loss" lastPayout={0} message="No match. Try again.">
        <div>game</div>
      </GameShell>
    ));
    expect(container.textContent).toContain('Empty wrapper.');
  });

  it("the message line is visually hidden via sr-only (screen reader only)", () => {
    render(withProvider(
      <GameShell {...baseProps} message="Won 20!" win="small" lastPayout={20}>
        <div>game</div>
      </GameShell>
    ));
    const msgEl = screen.getByText('Won 20!');
    expect(msgEl.className).toContain('sr-only');
  });

  it('the BetControl + PLAY row is horizontally centered at md+ via justify-center', () => {
    // At md+ the row is flex-row. items-center is the CROSS axis (vertical),
    // so without justify-center the BetControl + button align to the start
    // (left) of the row — visibly off-center within the centered max-w-2xl
    // wrapper. Same root-cause class as the SmallWinCard mx-auto fix.
    render(withProvider(
      <GameShell {...baseProps}>
        <div>game</div>
      </GameShell>
    ));
    const row = screen.getByTestId('bet-row');
    expect(row.className).toContain('justify-center');
  });
});
