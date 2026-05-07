import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useEffect } from 'react';
import { cleanup, render, screen, fireEvent, act } from '@testing-library/react';
import { AudioControlsProvider, useAudioControls } from '../contexts/AudioControlsContext';
import { MusicPill } from './MusicPill';

function Setter({ theme, gameType }: { theme: any; gameType: any }) {
  const { setNowPlaying } = useAudioControls();
  // Effect, not render-phase: setNowPlaying with a fresh object literal each
  // render would trigger an infinite re-render loop via the provider state.
  useEffect(() => {
    if (theme && gameType) setNowPlaying({ theme, gameType });
    else setNowPlaying(null);
  }, [theme, gameType, setNowPlaying]);
  return null;
}

describe('MusicPill', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders nothing when nowPlaying is null', () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    render(
      <AudioControlsProvider>
        <Setter theme={null} gameType={null} />
        <MusicPill />
      </AudioControlsProvider>
    );
    expect(screen.queryByTestId('music-pill')).toBeNull();
  });

  it('renders Lyria 3 attribution + theme + game when nowPlaying is set', () => {
    document.documentElement.setAttribute('data-theme', 'sweets');
    render(
      <AudioControlsProvider>
        <Setter theme="sweets" gameType="slots" />
        <MusicPill />
      </AudioControlsProvider>
    );
    const pill = screen.getByTestId('music-pill');
    expect(pill.textContent).toMatch(/Lyria 3/);
    expect(pill.textContent?.toLowerCase()).toContain('sweets');
    expect(pill.textContent?.toLowerCase()).toContain('slots');
  });

  it('renders 4 waveform bars', () => {
    document.documentElement.setAttribute('data-theme', 'space');
    render(
      <AudioControlsProvider>
        <Setter theme="space" gameType="bingo" />
        <MusicPill />
      </AudioControlsProvider>
    );
    const bars = screen.getAllByTestId('music-pill-bar');
    expect(bars.length).toBe(4);
  });

  it('marks bars as muted (data-muted="true") when muted=true and click toggles mute', () => {
    document.documentElement.setAttribute('data-theme', 'ninja');
    render(
      <AudioControlsProvider>
        <Setter theme="ninja" gameType="roulette" />
        <MusicPill />
      </AudioControlsProvider>
    );
    expect(screen.getByTestId('music-pill').getAttribute('data-muted')).toBe('false');
    act(() => { fireEvent.click(screen.getByTestId('music-pill')); });
    expect(screen.getByTestId('music-pill').getAttribute('data-muted')).toBe('true');
  });
});
