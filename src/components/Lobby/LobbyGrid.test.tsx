import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('../../hooks/useAssets', () => ({
  useAssets: vi.fn(),
}));

import { useAssets } from '../../hooks/useAssets';
import { LobbyGrid } from './LobbyGrid';
import { THEME_NAMES } from '../../utils/themeManifesto';

const mockUseAssets = vi.mocked(useAssets);

describe('LobbyGrid', () => {
  beforeEach(() => {
    mockUseAssets.mockReset();
    cleanup();
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders 8 placeholder skeletons while loading', () => {
    mockUseAssets.mockReturnValue({ assets: {}, loading: true });
    const { container } = render(<LobbyGrid onSelectGame={() => {}} onSelectWorld={() => {}} />);
    const skeletons = container.querySelectorAll('[data-skeleton-variant]');
    expect(skeletons.length).toBe(8);
  });

  it('renders 8 world cards (one per theme) when loaded', () => {
    const assets: Record<string, string> = {};
    THEME_NAMES.forEach(t => { assets[`bg_slots_${t}`] = `https://example/${t}.png`; });
    mockUseAssets.mockReturnValue({ assets, loading: false });
    render(<LobbyGrid onSelectGame={() => {}} onSelectWorld={() => {}} />);
    const displayNames = ['Sweets', 'Egypt', 'Space', 'Wild West', 'Ocean', 'Jungle', 'Vampire', 'Ninja'];
    displayNames.forEach(name => expect(screen.getByText(name)).toBeTruthy());
  });

  it('passes the per-theme bg URL to each WorldCard', () => {
    const assets: Record<string, string> = {};
    THEME_NAMES.forEach(t => { assets[`bg_slots_${t}`] = `https://example/${t}.png`; });
    mockUseAssets.mockReturnValue({ assets, loading: false });
    const { container } = render(<LobbyGrid onSelectGame={() => {}} onSelectWorld={() => {}} />);
    // Each rendered card has a background-image style; verify the sweets card uses the sweets URL.
    const cards = Array.from(container.querySelectorAll('[role="button"]')) as HTMLElement[];
    const sweetsCard = cards.find(c => c.style.backgroundImage.includes('sweets.png'));
    expect(sweetsCard).toBeTruthy();
  });

  it('requests bg_slots_<theme> for all 8 themes', () => {
    mockUseAssets.mockReturnValue({ assets: {}, loading: true });
    render(<LobbyGrid onSelectGame={() => {}} onSelectWorld={() => {}} />);
    expect(mockUseAssets).toHaveBeenCalled();
    const requestedKeys = mockUseAssets.mock.calls[0][0];
    THEME_NAMES.forEach(t => {
      expect(requestedKeys).toContain(`bg_slots_${t}`);
    });
  });
});
