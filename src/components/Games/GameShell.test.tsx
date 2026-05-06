import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../hooks/useAssets', () => ({ useAssets: () => ({ assets: { bg_test: 'https://x/bg' }, loading: false }) }));
vi.mock('../../hooks/useMusic', () => ({ useMusic: () => ({ musicUrl: 'https://x/m', loading: false }) }));

import { GameShell } from './GameShell';

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

  it('renders children', () => {
    render(<GameShell {...baseProps}><div data-testid="surface">wheel</div></GameShell>);
    expect(screen.getByTestId('surface')).toBeTruthy();
  });

  it('calls onPlay when the play button is clicked', () => {
    const onPlay = vi.fn();
    render(<GameShell {...baseProps} onPlay={onPlay}><div /></GameShell>);
    fireEvent.click(screen.getByText('SPIN'));
    expect(onPlay).toHaveBeenCalledOnce();
  });

  it('disables the play button when playDisabled is true', () => {
    render(<GameShell {...baseProps} playDisabled><div /></GameShell>);
    const btn = screen.getByText('SPIN').closest('button')!;
    expect(btn.disabled).toBe(true);
  });

  it('shows loading state when assets are loading', async () => {
    vi.doMock('../../hooks/useAssets', () => ({ useAssets: () => ({ assets: {}, loading: true }) }));
    vi.resetModules();
    const { GameShell: Shell2 } = await import('./GameShell');
    render(<Shell2 {...baseProps}><div /></Shell2>);
    expect(screen.getByText(/generating/i)).toBeTruthy();
  });
});
