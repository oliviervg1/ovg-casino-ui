import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { THEME_NAMES, type ThemeType, themeManifesto } from '../../utils/themeManifesto';
import { GAME_REGISTRY } from '../../config/games';
import { WorldCard } from './WorldCard';

const noop = () => {};

describe('WorldCard', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });
  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute('data-theme');
  });

  THEME_NAMES.forEach((theme: ThemeType) => {
    it(`renders for theme=${theme} with the manifesto display name`, () => {
      render(<WorldCard theme={theme} bgImageUrl="https://example/bg.png" onSelectWorld={noop} onSelectGame={noop} />);
      expect(screen.getByText(themeManifesto[theme].displayName)).toBeTruthy();
    });
  });

  it('renders the bg image as the card background', () => {
    render(<WorldCard theme="sweets" bgImageUrl="https://example/bg.png" onSelectWorld={noop} onSelectGame={noop} data-testid="wc" />);
    const card = screen.getByTestId('wc') as HTMLElement;
    expect(card.style.backgroundImage).toContain('https://example/bg.png');
  });

  it('clicking the card body calls onSelectWorld with the theme', () => {
    let selected: string | null = null;
    render(<WorldCard theme="sweets" bgImageUrl="" onSelectWorld={(t) => { selected = t; }} onSelectGame={noop} data-testid="wc" />);
    fireEvent.click(screen.getByTestId('wc'));
    expect(selected).toBe('sweets');
  });

  it('clicking the roulette icon resolves the real game ID for that theme', () => {
    let selected: string | null = null;
    render(<WorldCard theme="sweets" bgImageUrl="" onSelectWorld={noop} onSelectGame={(g) => { selected = g; }} />);
    fireEvent.click(screen.getByLabelText(/roulette/i));
    const expected = GAME_REGISTRY.find(g => g.type === 'roulette' && g.theme === 'sweets')!.id;
    expect(selected).toBe(expected);
  });

  it('clicking the slots icon resolves the real game ID for that theme', () => {
    let selected: string | null = null;
    render(<WorldCard theme="ninja" bgImageUrl="" onSelectWorld={noop} onSelectGame={(g) => { selected = g; }} />);
    fireEvent.click(screen.getByLabelText(/slots/i));
    const expected = GAME_REGISTRY.find(g => g.type === 'slots' && g.theme === 'ninja')!.id;
    expect(selected).toBe(expected);
  });

  it('clicking the bingo icon resolves the real game ID for that theme', () => {
    let selected: string | null = null;
    render(<WorldCard theme="vampire" bgImageUrl="" onSelectWorld={noop} onSelectGame={(g) => { selected = g; }} />);
    fireEvent.click(screen.getByLabelText(/bingo/i));
    const expected = GAME_REGISTRY.find(g => g.type === 'bingo' && g.theme === 'vampire')!.id;
    expect(selected).toBe(expected);
  });

  it('clicking a game icon does NOT bubble to the card body click', () => {
    let worldSelected = 0;
    let gameSelected = 0;
    render(<WorldCard theme="sweets" bgImageUrl="" onSelectWorld={() => worldSelected++} onSelectGame={() => gameSelected++} data-testid="wc" />);
    fireEvent.click(screen.getByLabelText(/roulette/i));
    expect(gameSelected).toBe(1);
    expect(worldSelected).toBe(0);
  });
});
