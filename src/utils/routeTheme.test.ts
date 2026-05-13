import { describe, it, expect } from 'vitest';
import { routeToTheme } from './routeTheme';
import { GAME_REGISTRY } from '../config/games';
import { THEME_NAMES } from './themeManifesto';

describe('routeToTheme', () => {
  it('returns "lobby" for the root path', () => {
    expect(routeToTheme('/')).toBe('lobby');
  });

  it('returns "lobby" for /profile', () => {
    expect(routeToTheme('/profile')).toBe('lobby');
  });

  it('returns "lobby" for /faq (no category)', () => {
    expect(routeToTheme('/faq')).toBe('lobby');
  });

  it('returns "lobby" for /faq/<category>', () => {
    expect(routeToTheme('/faq/games')).toBe('lobby');
  });

  it('returns "lobby" for /rules (no game)', () => {
    expect(routeToTheme('/rules')).toBe('lobby');
  });

  it('returns "lobby" for /rules/<gameId>', () => {
    expect(routeToTheme('/rules/sugar-spin')).toBe('lobby');
  });

  it('returns the game\'s theme for a known /game/:id', () => {
    const sample = GAME_REGISTRY[0];
    expect(routeToTheme(`/game/${sample.id}`)).toBe(sample.theme);
  });

  it('returns the game\'s theme for every entry in GAME_REGISTRY', () => {
    for (const g of GAME_REGISTRY) {
      expect(routeToTheme(`/game/${g.id}`)).toBe(g.theme);
    }
  });

  it('returns "lobby" for an unknown /game/:id', () => {
    expect(routeToTheme('/game/this-id-does-not-exist')).toBe('lobby');
  });

  it('returns the world theme for a known /world/:theme', () => {
    const sample = THEME_NAMES[0];
    expect(routeToTheme(`/world/${sample}`)).toBe(sample);
  });

  it('returns the world theme for every entry in THEME_NAMES', () => {
    for (const t of THEME_NAMES) {
      expect(routeToTheme(`/world/${t}`)).toBe(t);
    }
  });

  it('returns "lobby" for an unknown /world/<garbage>', () => {
    expect(routeToTheme('/world/not-a-theme')).toBe('lobby');
  });
});
