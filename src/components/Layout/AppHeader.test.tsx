import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useEffect } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AudioControlsProvider, useAudioControls } from '../../contexts/AudioControlsContext';
import { AppHeader } from './AppHeader';
import type { UserProfile } from '../../hooks/useUser';

const profile: UserProfile = {
  uid: 'u1',
  email: 'u@example.com',
  displayName: 'Player One',
  photoURL: '',
  balance: 1234,
  theme: 'dark',
};

function NowPlayingSetter() {
  const { setNowPlaying } = useAudioControls();
  // Effect, not render-phase — see MusicPill.test.tsx for the same rationale.
  useEffect(() => {
    setNowPlaying({ theme: 'sweets', gameType: 'slots' });
    return () => setNowPlaying(null);
  }, [setNowPlaying]);
  return null;
}

function renderAt(path: string, withMusic = false) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AudioControlsProvider>
        {withMusic && <NowPlayingSetter />}
        <Routes>
          <Route path="*" element={<AppHeader profile={profile} onLogout={() => {}} />} />
        </Routes>
      </AudioControlsProvider>
    </MemoryRouter>
  );
}

describe('AppHeader', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute('data-theme');
    localStorage.clear();
  });

  it('lobby mode (/) renders the logo and balance, no back button', () => {
    renderAt('/');
    expect(screen.getByText(/OVG Casino/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /back to lobby/i })).toBeNull();
    expect(screen.getByTestId('balance-pill')).toBeTruthy();
  });

  it('lobby mode does not render the music pill when nowPlaying is null', () => {
    renderAt('/', false);
    expect(screen.queryByTestId('music-pill')).toBeNull();
  });

  it('page mode (/profile) renders a back-to-lobby button and the page title', () => {
    renderAt('/profile');
    expect(screen.getByRole('button', { name: /back to lobby/i })).toBeTruthy();
    expect(screen.getByTestId('app-header-title').textContent?.toLowerCase()).toContain('profile');
  });

  it('game route (/game/candy-crushers) renders the game name in the theme display font class', () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    renderAt('/game/candy-crushers', true);
    const title = screen.getByTestId('app-header-title');
    expect(title.className).toContain('font-sweets');
    // The candy-crushers entry exists in src/config/games.ts with name "Candy Crushers".
    expect(title.textContent).toMatch(/Candy Crushers/i);
  });

  it('world route (/world/space) renders the theme display name in the theme font', () => {
    document.documentElement.setAttribute('data-theme', 'space');
    renderAt('/world/space');
    const title = screen.getByTestId('app-header-title');
    expect(title.textContent).toMatch(/Space/);
    expect(title.className).toContain('font-space');
  });

  it('renders the music pill when nowPlaying is set', () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    renderAt('/game/candy-crushers', true);
    expect(screen.getByTestId('music-pill')).toBeTruthy();
  });
});
