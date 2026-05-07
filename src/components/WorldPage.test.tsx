import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock asset / music hooks so the test doesn't hit AssetManager / Firebase.
vi.mock('../hooks/useAssets', () => ({ useAssets: () => ({ assets: {}, loading: false }) }));
vi.mock('../hooks/useMusic', () => ({ useMusic: () => ({ musicUrl: null, loading: false }) }));

import { WorldPage } from './WorldPage';
import { themeManifesto } from '../utils/themeManifesto';
import { GAME_REGISTRY } from '../config/games';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/world/:theme" element={<WorldPage />} />
        <Route path="/" element={<div>LOBBY</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('WorldPage', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders the theme display name in the manifesto font', () => {
    renderAt('/world/sweets');
    expect(screen.getByText(themeManifesto.sweets.displayName)).toBeTruthy();
  });

  it('renders all 3 game cards for the theme', () => {
    renderAt('/world/sweets');
    const sweetsGames = GAME_REGISTRY.filter(g => g.theme === 'sweets');
    expect(sweetsGames.length).toBe(3);
    sweetsGames.forEach(g => {
      expect(screen.getByText(g.name)).toBeTruthy();
    });
  });

  it('shows a "back to lobby" button that navigates to /', () => {
    const { container } = renderAt('/world/sweets');
    const backBtn = screen.getByRole('button', { name: /lobby/i });
    expect(backBtn).toBeTruthy();
    fireEvent.click(backBtn);
    // After click, the route /  renders the LOBBY placeholder.
    expect(container.textContent).toContain('LOBBY');
  });

  it('falls back to an "Unknown world" message when the theme is invalid', () => {
    renderAt('/world/mystery');
    expect(screen.getByText(/unknown world/i)).toBeTruthy();
  });

  it('renders for all 8 themes', () => {
    const themes = ['sweets', 'egypt', 'space', 'west', 'ocean', 'jungle', 'vampire', 'ninja'];
    themes.forEach(t => {
      cleanup();
      renderAt(`/world/${t}`);
      expect(screen.getByText(themeManifesto[t as keyof typeof themeManifesto].displayName)).toBeTruthy();
    });
  });
});
