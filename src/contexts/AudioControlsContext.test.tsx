import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { AudioControlsProvider, useAudioControls } from './AudioControlsContext';

function Probe() {
  const { muted, toggleMute, nowPlaying, setNowPlaying } = useAudioControls();
  return (
    <div>
      <span data-testid="muted">{String(muted)}</span>
      <span data-testid="np">{nowPlaying ? `${nowPlaying.theme}/${nowPlaying.gameType}` : 'none'}</span>
      <button onClick={toggleMute}>toggle</button>
      <button onClick={() => setNowPlaying({ theme: 'sweets', gameType: 'slots' })}>set</button>
      <button onClick={() => setNowPlaying(null)}>clear</button>
    </div>
  );
}

describe('AudioControlsContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('defaults muted=false and nowPlaying=null when localStorage is empty', () => {
    render(<AudioControlsProvider><Probe /></AudioControlsProvider>);
    expect(screen.getByTestId('muted').textContent).toBe('false');
    expect(screen.getByTestId('np').textContent).toBe('none');
  });

  it('reads initial muted state from localStorage', () => {
    localStorage.setItem('ovg-audio-muted', 'true');
    render(<AudioControlsProvider><Probe /></AudioControlsProvider>);
    expect(screen.getByTestId('muted').textContent).toBe('true');
  });

  it('toggleMute flips muted and persists to localStorage', () => {
    render(<AudioControlsProvider><Probe /></AudioControlsProvider>);
    fireEvent.click(screen.getByText('toggle'));
    expect(screen.getByTestId('muted').textContent).toBe('true');
    expect(localStorage.getItem('ovg-audio-muted')).toBe('true');
    fireEvent.click(screen.getByText('toggle'));
    expect(screen.getByTestId('muted').textContent).toBe('false');
    expect(localStorage.getItem('ovg-audio-muted')).toBe('false');
  });

  it('setNowPlaying updates nowPlaying; passing null clears it', () => {
    render(<AudioControlsProvider><Probe /></AudioControlsProvider>);
    fireEvent.click(screen.getByText('set'));
    expect(screen.getByTestId('np').textContent).toBe('sweets/slots');
    fireEvent.click(screen.getByText('clear'));
    expect(screen.getByTestId('np').textContent).toBe('none');
  });

  it('throws when useAudioControls is called outside the provider', () => {
    const Bad = () => {
      useAudioControls();
      return null;
    };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Bad />)).toThrow(/AudioControlsProvider/);
    spy.mockRestore();
  });
});
